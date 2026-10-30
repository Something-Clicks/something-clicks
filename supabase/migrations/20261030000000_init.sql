-- Something Clicks Network: initial schema.
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.
--
-- Security model: row-level security is enabled on every table with NO
-- policies, so the public anon/authenticated roles can read or write nothing.
-- Only the server (service_role key, never sent to browsers) touches data.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type application_status as enum ('new', 'reviewing', 'accepted', 'waitlisted', 'declined');
create type inquiry_status as enum ('new', 'contacted', 'closed');

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Founding-member applications
-- ---------------------------------------------------------------------------

create table network_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status application_status not null default 'new',
  internal_notes text not null default '',

  -- Business
  business_name text not null,
  website text not null,
  category text not null,
  category_other text not null default '',
  years_in_business text not null,
  team_size text not null,
  service_areas text[] not null default '{}',

  -- Customers
  ideal_customer text not null,
  customer_needs text not null,
  needs_before text not null,
  needs_after text not null,

  -- Channels: [{ "channel": "email", "audience": "100–500" }, ...]
  channels jsonb not null default '[]'::jsonb,
  channel_other text not null default '',

  -- Partnerships and capacity
  current_referrals text not null default '',
  desired_partner_types text not null,
  collaboration_interests text[] not null default '{}',
  collaboration_other text not null default '',
  past_experience text not null default '',
  time_per_month text not null,
  commit_30_days text not null check (commit_30_days in ('yes', 'maybe', 'no')),
  pilot_fit text not null check (pilot_fit in ('yes', 'not_sure', 'no')),

  -- Contact
  contact_name text not null,
  contact_role text not null,
  email text not null check (char_length(email) <= 254),
  phone text not null default '',
  preferred_contact text not null check (preferred_contact in ('email', 'phone', 'text')),

  -- Consent
  consent_contact boolean not null check (consent_contact),
  consent_contact_at timestamptz not null default now(),
  consent_updates boolean not null default false,

  -- Attribution
  source_page text not null default '',
  referrer text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  utm_term text not null default '',
  utm_content text not null default ''
);

create index network_applications_created_at_idx on network_applications (created_at desc);
create index network_applications_status_idx on network_applications (status);
create index network_applications_category_idx on network_applications (category);
create index network_applications_service_areas_idx on network_applications using gin (service_areas);
create trigger network_applications_updated_at before update on network_applications
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Referral partner interest
-- ---------------------------------------------------------------------------

create table referral_partner_interests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status inquiry_status not null default 'new',
  internal_notes text not null default '',

  name text not null,
  organization text not null,
  role text not null,
  email text not null check (char_length(email) <= 254),
  phone text not null default '',
  business_types text not null,
  connection text not null,
  notes text not null default '',

  consent_contact boolean not null check (consent_contact),
  consent_contact_at timestamptz not null default now(),

  source_page text not null default '',
  referrer text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  utm_term text not null default '',
  utm_content text not null default ''
);

create index referral_partner_interests_created_at_idx on referral_partner_interests (created_at desc);
create index referral_partner_interests_status_idx on referral_partner_interests (status);
create trigger referral_partner_interests_updated_at before update on referral_partner_interests
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Contact messages
-- ---------------------------------------------------------------------------

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status inquiry_status not null default 'new',
  internal_notes text not null default '',

  name text not null,
  email text not null check (char_length(email) <= 254),
  topic text not null,
  message text not null,

  consent_contact boolean not null check (consent_contact),
  consent_contact_at timestamptz not null default now(),

  source_page text not null default '',
  referrer text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  utm_term text not null default '',
  utm_content text not null default ''
);

create index contact_messages_created_at_idx on contact_messages (created_at desc);
create index contact_messages_status_idx on contact_messages (status);
create trigger contact_messages_updated_at before update on contact_messages
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- First-party form analytics (no personal data)
-- ---------------------------------------------------------------------------

create table form_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  form text not null check (form in ('application', 'referral', 'contact')),
  event text not null check (event in ('form_start', 'form_step', 'form_submit')),
  step smallint,
  source_page text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default ''
);

create index form_events_created_at_idx on form_events (created_at desc);

-- ---------------------------------------------------------------------------
-- Rate limiting (fixed window, keyed by a salted hash of the visitor's IP)
-- ---------------------------------------------------------------------------

create table rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

-- Returns true if the request is allowed. Atomic under concurrency.
create or replace function check_rate_limit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into rate_limits (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1
  returning hits into v_hits;

  -- Opportunistic cleanup: hashed keys are kept for at most one day.
  if random() < 0.05 then
    delete from rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_max;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lock everything down to the service role
-- ---------------------------------------------------------------------------

alter table network_applications enable row level security;
alter table referral_partner_interests enable row level security;
alter table contact_messages enable row level security;
alter table form_events enable row level security;
alter table rate_limits enable row level security;

revoke all on network_applications, referral_partner_interests, contact_messages, form_events, rate_limits
  from anon, authenticated;
revoke execute on function check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function check_rate_limit(text, integer, integer) to service_role;
