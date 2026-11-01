-- Couples: a public profile for each vendor who opts in, couple inquiries,
-- profile views, and the entitlements that can gate membership features later.
-- Same security model as the rest: RLS on, no public policies; only server
-- code (direct connection) reads or writes. Nothing here touches matching.

-- ---------------------------------------------------------------------------
-- Couple-facing profile fields (the same vendor profile, extended)
-- ---------------------------------------------------------------------------

alter table profiles
  add column if not exists about text not null default '' check (length(about) <= 1200),
  add column if not exists price_from integer check (price_from is null or price_from between 0 and 1000000),
  add column if not exists price_to integer check (price_to is null or price_to between 0 and 1000000),
  -- Metro slugs from src/content/metros.ts (e.g. 'dallas-fort-worth').
  add column if not exists markets text[] not null default '{}',
  add column if not exists styles text[] not null default '{}' check (cardinality(styles) <= 8),
  -- Off until the vendor turns it on. Couples only ever see verified businesses that opted in.
  add column if not exists public_visible boolean not null default false,
  add column if not exists public_slug text unique,
  add column if not exists public_since timestamptz;

alter table profiles drop constraint if exists profiles_price_range_check;
alter table profiles add constraint profiles_price_range_check check (price_to is null or price_from is null or price_to >= price_from);

create index if not exists profiles_public_idx on profiles using gin (markets) where public_visible;

create table if not exists portfolio_photos (
  id bigint generated always as identity primary key,
  place_id bigint not null references places (id) on delete cascade,
  -- Object path in the storage bucket, and the public URL it's served from.
  path text not null,
  url text not null,
  alt text not null default '' check (length(alt) <= 200),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_photos_place_idx on portfolio_photos (place_id, position);

-- ---------------------------------------------------------------------------
-- Inquiries from couples
-- ---------------------------------------------------------------------------

create table if not exists inquiries (
  id bigint generated always as identity primary key,
  place_id bigint not null references places (id) on delete cascade,
  -- How the couple got here. partner_profile/planner_partner name the vendor whose profile they came from.
  source text not null default 'direct_profile'
    check (source in ('direct_profile', 'partner_profile', 'joint_promotion', 'planner_partner', 'referral')),
  via_place_id bigint references places (id) on delete set null,
  name text not null check (length(name) between 1 and 120),
  email text not null check (length(email) <= 254),
  phone text not null default '' check (length(phone) <= 40),
  wedding_date date,
  location text not null default '' check (length(location) <= 200),
  guest_count integer check (guest_count is null or guest_count between 1 and 5000),
  budget text not null default '' check (length(budget) <= 40),
  message text not null check (length(message) between 1 and 2000),
  consent_at timestamptz not null,
  status text not null default 'new' check (status in ('new', 'replied', 'booked', 'not_a_fit')),
  status_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inquiries_place_idx on inquiries (place_id, created_at desc);
create index if not exists inquiries_email_idx on inquiries (lower(email), place_id, created_at);

-- ---------------------------------------------------------------------------
-- Profile views, counted per day and source (no visitor details)
-- ---------------------------------------------------------------------------

create table if not exists profile_views (
  place_id bigint not null references places (id) on delete cascade,
  day date not null,
  source text not null check (source in ('direct_profile', 'partner_profile', 'joint_promotion', 'planner_partner', 'referral')),
  views integer not null default 0,
  primary key (place_id, day, source)
);

-- ---------------------------------------------------------------------------
-- Entitlements: what a business can use beyond the free tier. The monthly
-- membership includes the core features; add-ons (premium campaigns, extra
-- reach) come later. Rows here grant a feature for a period; nothing is
-- enforced until MEMBERSHIP_GATING is turned on. Never used for matching.
-- ---------------------------------------------------------------------------

create table if not exists entitlements (
  id bigint generated always as identity primary key,
  place_id bigint not null references places (id) on delete cascade,
  feature text not null check (feature in ('premium_campaigns', 'extra_reach')),
  granted_by text not null default 'admin' check (granted_by in ('admin', 'purchase', 'complimentary')),
  starts_on date not null default current_date,
  ends_on date,
  created_at timestamptz not null default now()
);

create index if not exists entitlements_place_idx on entitlements (place_id, feature);

-- ---------------------------------------------------------------------------
-- Triggers and lock down
-- ---------------------------------------------------------------------------

create or replace trigger inquiries_updated_at before update on inquiries for each row execute function set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['portfolio_photos', 'inquiries', 'profile_views', 'entitlements']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end;
$$;

-- Public bucket for portfolio photos (Supabase projects only; skipped on plain Postgres).
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('portfolio', 'portfolio', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
  end if;
end;
$$;
