-- Something Clicks network, phase 2: member accounts, claims, profiles,
-- introductions, partnerships. Same security model as before: RLS on, no
-- public policies; only server code (direct connection) reads or writes.

-- ---------------------------------------------------------------------------
-- Members and sign-in links
-- ---------------------------------------------------------------------------

create table if not exists members (
  id bigint generated always as identity primary key,
  email text not null unique check (email = lower(email)),
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

-- Single-use magic links. Only a SHA-256 of the token is stored.
create table if not exists auth_tokens (
  token_hash text primary key,
  email text not null,
  next_path text not null default '/dashboard',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_tokens_expires_idx on auth_tokens (expires_at);

-- ---------------------------------------------------------------------------
-- Claims and profiles
-- ---------------------------------------------------------------------------

create table if not exists place_claims (
  id bigint generated always as identity primary key,
  -- Null for "Add your business" until the claim is approved and the place is created.
  place_id bigint references places (id) on delete cascade,
  new_business jsonb,
  email text not null check (email = lower(email)),
  member_id bigint references members (id) on delete cascade,
  method text not null check (method in ('email_domain', 'manual')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  -- {"domain": "...", "note": "..."}; shown to the admin when reviewing.
  evidence jsonb not null default '{}'::jsonb,
  -- Set when the claimant opens the emailed link: proves they control the address.
  email_confirmed_at timestamptz,
  reviewed_at timestamptz,
  review_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (place_id is not null or new_business is not null)
);

create index if not exists place_claims_place_idx on place_claims (place_id);
create index if not exists place_claims_queue_idx on place_claims (status, created_at) where status = 'pending';
-- One owner per business.
create unique index if not exists place_claims_one_owner_idx on place_claims (place_id) where status = 'approved';

create table if not exists profiles (
  place_id bigint primary key references places (id) on delete cascade,
  member_id bigint not null references members (id) on delete cascade,
  description text not null default '' check (length(description) <= 500),
  service_area text not null default '' check (length(service_area) <= 200),
  -- Shared with another business only after both sides accept an introduction.
  contact_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  network_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_member_idx on profiles (member_id);

-- ---------------------------------------------------------------------------
-- Introductions and partnerships
-- ---------------------------------------------------------------------------

create table if not exists introductions (
  id bigint generated always as identity primary key,
  from_place bigint not null references places (id) on delete cascade,
  to_place bigint not null references places (id) on delete cascade,
  requested_by bigint not null references members (id) on delete cascade,
  note text not null default '' check (length(note) <= 200),
  -- requested: waiting on the other business. connected: both accepted, contact details visible to both.
  status text not null default 'requested' check (status in ('requested', 'connected', 'declined', 'withdrawn')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_place <> to_place)
);

-- One introduction per pair of businesses, whichever side asked first.
create unique index if not exists introductions_pair_idx on introductions (least(from_place, to_place), greatest(from_place, to_place));
create index if not exists introductions_to_idx on introductions (to_place, status);
create index if not exists introductions_requested_by_idx on introductions (requested_by, created_at);

create table if not exists partnerships (
  id bigint generated always as identity primary key,
  introduction_id bigint not null references introductions (id) on delete cascade,
  proposed_by bigint not null references places (id) on delete cascade,
  type text not null check (type in ('referral', 'joint_offer', 'distribution')),
  offer text not null check (length(offer) between 1 and 300),
  code text not null default '' check (length(code) <= 40),
  link text not null default '' check (length(link) <= 500),
  -- proposed: waiting on the other business. live: both agreed.
  stage text not null default 'proposed' check (stage in ('proposed', 'live', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partnerships_intro_idx on partnerships (introduction_id);

-- One tracking link per partner: /r/{code} sends visitors to the partnership
-- link (or the business's website) and counts the visit for that partner.
create table if not exists partnership_links (
  code text primary key,
  partnership_id bigint not null references partnerships (id) on delete cascade,
  place_id bigint not null references places (id) on delete cascade,
  clicks integer not null default 0,
  unique (partnership_id, place_id)
);

-- ---------------------------------------------------------------------------
-- Triggers and lock down
-- ---------------------------------------------------------------------------

create or replace trigger place_claims_updated_at before update on place_claims for each row execute function set_updated_at();
create or replace trigger profiles_updated_at before update on profiles for each row execute function set_updated_at();
create or replace trigger introductions_updated_at before update on introductions for each row execute function set_updated_at();
create or replace trigger partnerships_updated_at before update on partnerships for each row execute function set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['members', 'auth_tokens', 'place_claims', 'profiles', 'introductions', 'partnerships',
                           'partnership_links']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end;
$$;
