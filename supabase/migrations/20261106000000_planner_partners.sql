-- Planner Partners: wedding planners who help shape Something Clicks and bring
-- trusted businesses into the network. Complimentary membership is recorded
-- here, never as a Stripe charge. Being a Planner Partner never affects
-- matching, ranking or search: nothing here is read by compute_matches or search.
-- Same security model: RLS on, no public access.

-- Clickwrap acceptances: which version, when, by whom, for which business, from where.
create table if not exists agreement_acceptances (
  id bigint generated always as identity primary key,
  agreement text not null check (agreement in ('planner_partner')),
  version text not null,
  member_id bigint references members (id) on delete set null,
  email text not null,
  place_id bigint references places (id) on delete set null,
  ip text not null default '',
  accepted_at timestamptz not null default now()
);

create index if not exists agreement_acceptances_place_idx on agreement_acceptances (place_id, accepted_at desc);

create table if not exists planner_partners (
  place_id bigint primary key references places (id) on delete cascade,
  starts_on date not null default current_date,
  ends_on date not null default (current_date + interval '12 months')::date,
  -- ended: stopped early by an admin (otherwise a partnership ends on ends_on).
  ended_at timestamptz,
  notes text not null default '' check (length(notes) <= 1000),
  -- Admin reminder 30 days before ends_on, sent once.
  end_reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on > starts_on)
);

-- Applications from signed-in owners of claimed planner businesses.
create table if not exists planner_applications (
  id bigint generated always as identity primary key,
  place_id bigint not null references places (id) on delete cascade,
  member_id bigint references members (id) on delete set null,
  message text not null default '' check (length(message) <= 1000),
  acceptance_id bigint not null references agreement_acceptances (id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create unique index if not exists planner_applications_one_pending_idx on planner_applications (place_id) where status = 'pending';

-- Businesses a Planner Partner recommends. Nothing is emailed until an admin approves.
create table if not exists vendor_invites (
  id bigint generated always as identity primary key,
  partner_place_id bigint not null references places (id) on delete cascade,
  name text not null check (length(name) between 2 and 120),
  category_id text references categories (id) on delete set null,
  city text not null default '' check (length(city) <= 120),
  contact_email text not null check (contact_email = lower(contact_email)),
  note text not null default '' check (length(note) <= 500),
  status text not null default 'new' check (status in ('new', 'approved', 'claimed', 'declined')),
  approved_at timestamptz,
  -- The business once it's on Something Clicks (set when its owner claims with this email, or by an admin).
  claimed_place_id bigint references places (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_place_id, contact_email)
);

create index if not exists vendor_invites_queue_idx on vendor_invites (status, created_at);
create index if not exists vendor_invites_email_idx on vendor_invites (contact_email);

-- Agreement updates announced to a partner (30 days ahead), once per version.
create table if not exists agreement_notices (
  place_id bigint not null references places (id) on delete cascade,
  agreement text not null,
  version text not null,
  sent_at timestamptz not null default now(),
  primary key (place_id, agreement, version)
);

create or replace trigger planner_partners_updated_at before update on planner_partners for each row execute function set_updated_at();
create or replace trigger vendor_invites_updated_at before update on vendor_invites for each row execute function set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['agreement_acceptances', 'planner_partners', 'planner_applications', 'vendor_invites', 'agreement_notices']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end;
$$;
