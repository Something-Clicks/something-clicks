-- Something Clicks: Phase 1 foundation
-- Buyers, credit packs, Stripe purchases, append-only credit ledger, partner applications,
-- business booking requests (referrals), settings, audit log.
--
-- Access model: RLS is enabled on every table. Browsers (anon/authenticated) may only SELECT
-- their own rows where a policy says so. Every write goes through server code using the
-- service role, after the server has checked the user's identity and role.

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Roles / profiles
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('buyer', 'partner', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext,
  role public.app_role,
  created_at timestamptz not null default now()
);

-- New auth users get a profile. Only the 'buyer' role can be self-selected at signup;
-- 'admin' is granted manually (see docs/setup.md), 'partner' by admin approval (Phase 2).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when new.raw_user_meta_data ->> 'signup_as' = 'buyer' then 'buyer'::public.app_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- Terms versions (placeholder text until launch; disputes reference the exact version)
-- ---------------------------------------------------------------------------

create type public.terms_kind as enum ('buyer', 'partner', 'business_consent');

create table public.terms_versions (
  id uuid primary key default gen_random_uuid(),
  kind public.terms_kind not null,
  version text not null,
  is_placeholder boolean not null default true,
  published_at timestamptz not null default now(),
  unique (kind, version)
);

insert into public.terms_versions (kind, version, is_placeholder) values
  ('buyer', '2026-10-draft', true),
  ('partner', '2026-10-draft', true),
  ('business_consent', '2026-10-v1', false);

-- ---------------------------------------------------------------------------
-- Buyers (commercial cleaning companies)
-- ---------------------------------------------------------------------------

create type public.buyer_status as enum ('pending', 'approved', 'rejected', 'suspended');

create table public.buyers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete restrict,
  company_name text not null check (length(company_name) between 2 and 200),
  contact_name text not null check (length(contact_name) between 2 and 200),
  email citext not null,
  phone text not null,
  website text,
  status public.buyer_status not null default 'pending',
  stripe_customer_id text unique,
  terms_version text not null,
  terms_agreed_at timestamptz not null,
  approved_at timestamptz,
  approved_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.buyer_service_areas (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyers (id) on delete cascade,
  area text not null,
  unique (buyer_id, area)
);

create table public.buyer_criteria (
  buyer_id uuid primary key references public.buyers (id) on delete cascade,
  min_sq_ft integer not null default 0 check (min_sq_ft >= 0),
  property_types text[] not null default '{}',
  cleaning_frequencies text[] not null default '{}',
  notes text,
  updated_at timestamptz not null default now()
);

create table public.buyer_availability (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyers (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time),
  unique (buyer_id, day_of_week)
);

-- ---------------------------------------------------------------------------
-- Credit packs and Stripe purchases
-- ---------------------------------------------------------------------------

create table public.credit_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  credits integer not null check (credits > 0),
  price_cents integer not null check (price_cents > 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create type public.purchase_status as enum (
  'pending',            -- checkout session created, nothing paid
  'processing',         -- checkout completed, async payment (e.g. ACH) not yet settled
  'paid',               -- credited
  'failed',             -- async payment failed
  'expired',            -- checkout abandoned
  'partially_refunded',
  'refunded',
  'needs_review'        -- Stripe amount did not match our record; not credited
);

create table public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyers (id) on delete restrict,
  pack_id uuid references public.credit_packs (id) on delete set null,
  pack_name text not null,
  credits integer not null check (credits > 0),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  status public.purchase_status not null default 'pending',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  credits_refunded integer not null default 0 check (credits_refunded >= 0),
  review_reason text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (credits_refunded <= credits)
);

create index credit_purchases_buyer_idx on public.credit_purchases (buyer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Credit ledger: append-only. Balance is always computed from it.
--   purchase   +n  (one per purchase)
--   refund     -n  (credits removed when a purchase is refunded)
--   reserve    -1  (booking holds one credit; one per appointment)
--   release    +1  (no-show / cancellation returns the held credit)
--   consume     0  (walkthrough completed: the held credit is spent)
--   adjustment ±n  (admin, with a note)
-- An appointment can be released OR consumed, never both, never twice.
-- ---------------------------------------------------------------------------

create type public.ledger_entry_type as enum
  ('purchase', 'refund', 'reserve', 'release', 'consume', 'adjustment');

create table public.credit_ledger (
  id bigint generated always as identity primary key,
  buyer_id uuid not null references public.buyers (id) on delete restrict,
  entry_type public.ledger_entry_type not null,
  delta integer not null,
  purchase_id uuid references public.credit_purchases (id) on delete restrict,
  -- FK to appointments is added when that table is created (Phase 4).
  appointment_id uuid,
  note text,
  actor text not null default 'system',
  created_at timestamptz not null default now(),
  check (
    (entry_type = 'purchase'   and delta > 0  and purchase_id is not null) or
    (entry_type = 'refund'     and delta < 0  and purchase_id is not null) or
    (entry_type = 'reserve'    and delta = -1 and appointment_id is not null) or
    (entry_type = 'release'    and delta = 1  and appointment_id is not null) or
    (entry_type = 'consume'    and delta = 0  and appointment_id is not null) or
    (entry_type = 'adjustment' and delta <> 0 and note is not null and length(note) > 0)
  )
);

create index credit_ledger_buyer_idx on public.credit_ledger (buyer_id, created_at desc);
create unique index credit_ledger_one_purchase_entry
  on public.credit_ledger (purchase_id) where entry_type = 'purchase';
create unique index credit_ledger_one_reserve_per_appointment
  on public.credit_ledger (appointment_id) where entry_type = 'reserve';
create unique index credit_ledger_one_settlement_per_appointment
  on public.credit_ledger (appointment_id) where entry_type in ('release', 'consume');

create function public.prevent_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

create trigger credit_ledger_append_only
  before update or delete on public.credit_ledger
  for each row execute function public.prevent_mutation();

create view public.buyer_credit_balances
with (security_invoker = true) as
select
  b.id as buyer_id,
  coalesce(sum(l.delta), 0)::integer as available,
  coalesce(sum(case l.entry_type when 'reserve' then 1 when 'release' then -1 when 'consume' then -1 else 0 end), 0)::integer as reserved,
  coalesce(sum(case when l.entry_type = 'purchase' then l.delta else 0 end), 0)::integer as purchased,
  coalesce(sum(case when l.entry_type = 'consume' then 1 else 0 end), 0)::integer as consumed
from public.buyers b
left join public.credit_ledger l on l.buyer_id = b.id
group by b.id;

-- ---------------------------------------------------------------------------
-- Stripe webhook idempotency
-- ---------------------------------------------------------------------------

create table public.stripe_events (
  id text primary key,
  type text not null,
  status text not null default 'received' check (status in ('received', 'processed', 'failed')),
  attempts integer not null default 1,
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- Records receipt of a webhook event. Returns 'new' on first delivery, 'done' if already
-- processed successfully, 'retry' if a previous attempt did not finish.
create function public.begin_stripe_event(p_id text, p_type text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_inserted boolean;
begin
  insert into public.stripe_events (id, type)
  values (p_id, p_type)
  on conflict (id) do update set attempts = public.stripe_events.attempts + 1
  returning status, (xmax = 0) into v_status, v_inserted;

  if v_inserted then
    return 'new';
  elsif v_status = 'processed' then
    return 'done';
  end if;
  return 'retry';
end;
$$;

create function public.finish_stripe_event(p_id text, p_ok boolean, p_error text default null)
returns void
language sql
security definer
set search_path = public
as $$
  update public.stripe_events
     set status = case when p_ok then 'processed' else 'failed' end,
         last_error = p_error,
         processed_at = case when p_ok then now() else processed_at end
   where id = p_id;
$$;

-- Called after a checkout session reports a confirmed payment. Safe to call repeatedly.
create function public.credit_purchase_paid(
  p_session_id text,
  p_payment_intent_id text,
  p_amount_cents integer,
  p_currency text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.credit_purchases%rowtype;
begin
  select * into v from public.credit_purchases
   where stripe_checkout_session_id = p_session_id
   for update;

  if not found then
    return 'not_found';
  end if;

  if v.status in ('paid', 'partially_refunded', 'refunded') then
    return 'already_credited';
  end if;

  if p_amount_cents is distinct from v.amount_cents or lower(p_currency) is distinct from v.currency then
    update public.credit_purchases
       set status = 'needs_review',
           stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
           review_reason = format('Stripe reported %s %s, expected %s %s',
                                  p_amount_cents, p_currency, v.amount_cents, v.currency),
           updated_at = now()
     where id = v.id;
    return 'amount_mismatch';
  end if;

  update public.credit_purchases
     set status = 'paid',
         stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
         paid_at = now(),
         updated_at = now()
   where id = v.id;

  insert into public.credit_ledger (buyer_id, entry_type, delta, purchase_id, note)
  values (v.buyer_id, 'purchase', v.credits, v.id, v.pack_name);

  return 'credited';
end;
$$;

-- Non-crediting status changes. Never moves a purchase backwards out of a credited state.
create function public.set_purchase_status(
  p_session_id text,
  p_status public.purchase_status,
  p_payment_intent_id text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_status not in ('processing', 'failed', 'expired') then
    raise exception 'set_purchase_status cannot set %', p_status;
  end if;

  update public.credit_purchases
     set status = p_status,
         stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
         updated_at = now()
   where stripe_checkout_session_id = p_session_id
     and status in ('pending', 'processing');
  get diagnostics v_count = row_count;

  return case when v_count = 1 then 'updated' else 'no_change' end;
end;
$$;

-- Records a (cumulative) refund amount from Stripe. Removes credits in proportion to the
-- refunded amount, rounded UP so we never leave unpaid credits on the account.
-- Idempotent: replaying the same or an older cumulative amount changes nothing.
create function public.record_purchase_refund(
  p_payment_intent_id text,
  p_amount_refunded_cents integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.credit_purchases%rowtype;
  v_amount integer;
  v_target_credits integer;
  v_delta integer;
begin
  select * into v from public.credit_purchases
   where stripe_payment_intent_id = p_payment_intent_id
   for update;

  if not found then
    return 'not_found';
  end if;

  if v.status not in ('paid', 'partially_refunded', 'refunded') then
    -- Refund on a purchase we never credited: record the amount, remove nothing.
    update public.credit_purchases
       set refunded_cents = greatest(refunded_cents, least(p_amount_refunded_cents, amount_cents)),
           updated_at = now()
     where id = v.id;
    return 'not_credited';
  end if;

  v_amount := least(p_amount_refunded_cents, v.amount_cents);
  if v_amount <= v.refunded_cents then
    return 'no_change';
  end if;

  v_target_credits := least(v.credits, ceil(v.credits::numeric * v_amount / v.amount_cents)::integer);
  v_delta := v_target_credits - v.credits_refunded;

  if v_delta > 0 then
    insert into public.credit_ledger (buyer_id, entry_type, delta, purchase_id, note)
    values (v.buyer_id, 'refund', -v_delta, v.id,
            format('Stripe refund: %s of %s cents refunded', v_amount, v.amount_cents));
  end if;

  update public.credit_purchases
     set refunded_cents = v_amount,
         credits_refunded = v_target_credits,
         status = case when v_amount >= amount_cents then 'refunded'::public.purchase_status
                       else 'partially_refunded'::public.purchase_status end,
         updated_at = now()
   where id = v.id;

  return 'recorded';
end;
$$;

-- ---------------------------------------------------------------------------
-- Settings (single row). Commission amount is unset until admin configures it.
-- ---------------------------------------------------------------------------

create table public.settings (
  id boolean primary key default true check (id),
  price_per_appointment_cents integer check (price_per_appointment_cents > 0),
  commission_amount_cents integer check (commission_amount_cents > 0),
  dispute_window_hours integer not null default 72 check (dispute_window_hours > 0),
  referral_expiry_days integer not null default 14 check (referral_expiry_days > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

insert into public.settings (id) values (true);

-- ---------------------------------------------------------------------------
-- Partner applications (PromoteKit onboarding happens on approval, Phase 2)
-- ---------------------------------------------------------------------------

create type public.partner_type as enum (
  'commercial_realtor', 'leasing_agent', 'property_manager', 'commercial_mover',
  'office_furniture_installer', 'property_maintenance', 'other'
);

create type public.application_status as enum ('pending', 'approved', 'rejected');

create table public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  business_name text not null,
  email citext not null,
  phone text not null,
  partner_type public.partner_type not null,
  referral_plan text not null,
  terms_version text not null,
  terms_agreed_at timestamptz not null,
  status public.application_status not null default 'pending',
  review_note text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- One live application per email; a rejected applicant may re-apply.
create unique index partner_applications_one_active_per_email
  on public.partner_applications (email) where status in ('pending', 'approved');

-- ---------------------------------------------------------------------------
-- Referrals: businesses asking for a walkthrough (via a partner link, a partner
-- submission, or directly). Matching and appointment booking come in Phases 3-4.
-- ---------------------------------------------------------------------------

create type public.referral_source as enum ('link', 'partner_submitted', 'direct');

create type public.referral_status as enum (
  'submitted', 'awaiting_business_confirmation', 'confirmed', 'waiting_for_match',
  'booked', 'completed', 'rejected', 'duplicate', 'expired'
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  -- FK to partners is added with that table (Phase 2).
  partner_id uuid,
  referral_code text,
  source public.referral_source not null,
  business_name text not null,
  contact_name text not null,
  contact_title text,
  email citext not null,
  phone text not null,
  address_line1 text not null,
  city text not null,
  zip text not null,
  address_key text not null,
  property_type text not null,
  approx_sq_ft integer check (approx_sq_ft > 0),
  cleaning_frequency text not null,
  is_decision_maker boolean not null,
  current_contract_end date,
  preferred_times text,
  notes text,
  consent_at timestamptz,
  consent_ip inet,
  consent_text_version text,
  status public.referral_status not null,
  duplicate_of uuid references public.referrals (id),
  promotekit_referral_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A business can only be shared with a buyer after it consented. Partner submissions
  -- wait for the business to confirm and consent.
  check (
    status in ('submitted', 'awaiting_business_confirmation', 'rejected', 'duplicate', 'expired')
    or (consent_at is not null and consent_text_version is not null)
  )
);

create index referrals_email_idx on public.referrals (email);
create index referrals_address_key_idx on public.referrals (address_key);
create index referrals_status_idx on public.referrals (status, created_at);

-- ---------------------------------------------------------------------------
-- Admin audit log (append-only)
-- ---------------------------------------------------------------------------

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create trigger admin_audit_log_append_only
  before update or delete on public.admin_audit_log
  for each row execute function public.prevent_mutation();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.terms_versions enable row level security;
alter table public.buyers enable row level security;
alter table public.buyer_service_areas enable row level security;
alter table public.buyer_criteria enable row level security;
alter table public.buyer_availability enable row level security;
alter table public.credit_packs enable row level security;
alter table public.credit_purchases enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.stripe_events enable row level security;
alter table public.settings enable row level security;
alter table public.partner_applications enable row level security;
alter table public.referrals enable row level security;
alter table public.admin_audit_log enable row level security;

-- Browsers never write directly; all writes go through server code with the service role.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on public.stripe_events, public.partner_applications, public.referrals,
              public.admin_audit_log, public.settings from anon, authenticated;

create policy "own profile" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

create policy "terms readable" on public.terms_versions
  for select to anon, authenticated using (true);

create policy "own buyer" on public.buyers
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "own service areas" on public.buyer_service_areas
  for select to authenticated using (
    public.is_admin() or exists (select 1 from public.buyers b where b.id = buyer_id and b.user_id = auth.uid())
  );

create policy "own criteria" on public.buyer_criteria
  for select to authenticated using (
    public.is_admin() or exists (select 1 from public.buyers b where b.id = buyer_id and b.user_id = auth.uid())
  );

create policy "own availability" on public.buyer_availability
  for select to authenticated using (
    public.is_admin() or exists (select 1 from public.buyers b where b.id = buyer_id and b.user_id = auth.uid())
  );

create policy "active packs" on public.credit_packs
  for select to authenticated using (active or public.is_admin());

create policy "own purchases" on public.credit_purchases
  for select to authenticated using (
    public.is_admin() or exists (select 1 from public.buyers b where b.id = buyer_id and b.user_id = auth.uid())
  );

create policy "own ledger" on public.credit_ledger
  for select to authenticated using (
    public.is_admin() or exists (select 1 from public.buyers b where b.id = buyer_id and b.user_id = auth.uid())
  );

-- Money functions are server-only.
revoke execute on function public.credit_purchase_paid(text, text, integer, text) from public, anon, authenticated;
revoke execute on function public.set_purchase_status(text, public.purchase_status, text) from public, anon, authenticated;
revoke execute on function public.record_purchase_refund(text, integer) from public, anon, authenticated;
revoke execute on function public.begin_stripe_event(text, text) from public, anon, authenticated;
revoke execute on function public.finish_stripe_event(text, boolean, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.begin_stripe_event(text, text) to service_role;
grant execute on function public.finish_stripe_event(text, boolean, text) to service_role;
grant execute on function public.credit_purchase_paid(text, text, integer, text) to service_role;
grant execute on function public.set_purchase_status(text, public.purchase_status, text) to service_role;
grant execute on function public.record_purchase_refund(text, integer) to service_role;
