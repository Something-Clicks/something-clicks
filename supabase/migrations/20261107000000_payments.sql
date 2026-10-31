-- Paid plans: a one-time managed campaign and a monthly membership, bought
-- through Stripe Checkout by the verified owner of a claimed business. Card
-- details never touch our servers; Stripe's webhook is the source of truth.
-- Payment never affects matching or ranking: nothing here is read by
-- compute_matches or search. Same security model: RLS on, no public access.

-- One Stripe customer per business.
create table if not exists stripe_customers (
  place_id bigint primary key references places (id) on delete cascade,
  customer_id text not null unique,
  member_id bigint references members (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Every successful payment: the campaign, and each membership invoice.
create table if not exists purchases (
  id bigint generated always as identity primary key,
  place_id bigint not null references places (id) on delete cascade,
  member_id bigint references members (id) on delete set null,
  kind text not null check (kind in ('campaign', 'membership')),
  checkout_session_id text unique,
  invoice_id text unique,
  payment_intent_id text unique,
  subscription_id text,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null default 'paid' check (status in ('paid', 'partially_refunded', 'refunded')),
  amount_refunded_cents integer not null default 0,
  -- PromoteKit referral the buyer arrived with (Checkout's client_reference_id), if any.
  referral text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchases_place_idx on purchases (place_id, created_at desc);

-- Current membership per business, mirrored from Stripe's subscription events.
create table if not exists memberships (
  place_id bigint primary key references places (id) on delete cascade,
  subscription_id text not null unique,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Admin work queue: one campaign per campaign purchase.
create table if not exists campaigns (
  id bigint generated always as identity primary key,
  place_id bigint not null references places (id) on delete cascade,
  purchase_id bigint not null unique references purchases (id) on delete cascade,
  status text not null default 'new' check (status in ('new', 'in_progress', 'done', 'cancelled')),
  notes text not null default '' check (length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_queue_idx on campaigns (status, created_at);

-- Webhook events already applied: Stripe retries, so each event runs once.
create table if not exists stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

create or replace trigger purchases_updated_at before update on purchases for each row execute function set_updated_at();
create or replace trigger memberships_updated_at before update on memberships for each row execute function set_updated_at();
create or replace trigger campaigns_updated_at before update on campaigns for each row execute function set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['stripe_customers', 'purchases', 'memberships', 'campaigns', 'stripe_events']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end;
$$;
