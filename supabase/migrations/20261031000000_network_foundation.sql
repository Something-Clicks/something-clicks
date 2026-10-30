-- Something Clicks network, phase 1: places, journeys, clusters, imports,
-- national counts, location lookup, matches, suppression.
-- Same security model as the initial migration: RLS on, no public policies;
-- only server code (service role / direct connection) reads or writes.

create extension if not exists postgis;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Journeys and categories (seeded from src/content/journeys.json)
-- ---------------------------------------------------------------------------

create table journeys (
  id text primary key,
  name text not null,
  active boolean not null default false
);

create table journey_stages (
  id text primary key,
  journey_id text not null references journeys (id) on delete cascade,
  position smallint not null,
  label text not null
);

create table categories (
  id text primary key,
  journey_id text not null references journeys (id) on delete cascade,
  stage_id text not null references journey_stages (id),
  label text not null,
  plural text not null,
  -- Broad categories (salons, bakeries…) only partly serve the journey.
  broad boolean not null default false,
  taxonomy text[] not null default '{}',
  synonyms text[] not null default '{}'
);

-- Directional: what category_b means to a business in category_a.
create table complements (
  category_a text not null references categories (id) on delete cascade,
  category_b text not null references categories (id) on delete cascade,
  strength real not null check (strength > 0 and strength <= 1),
  relation text not null check (relation in ('hub', 'day_of', 'moment', 'same_couple')),
  reason_key text not null,
  partnership_type text not null check (partnership_type in ('referral', 'joint_offer', 'distribution')),
  primary key (category_a, category_b)
);

-- ---------------------------------------------------------------------------
-- Clusters and import runs
-- ---------------------------------------------------------------------------

create table clusters (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  journey_id text not null references journeys (id),
  min_lng double precision not null,
  min_lat double precision not null,
  max_lng double precision not null,
  max_lat double precision not null,
  center geography(Point, 4326) not null,
  -- Distance scale for match scoring (R in exp(-d/R)), and the match cutoff.
  distance_scale_km real not null default 10,
  max_match_km real not null default 40,
  min_confidence real not null default 0.6,
  status text not null default 'draft' check (status in ('draft', 'importing', 'active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_lng < max_lng and min_lat < max_lat)
);

create table import_runs (
  id bigint generated always as identity primary key,
  cluster_id bigint references clusters (id),
  kind text not null check (kind in ('cluster', 'counts', 'gazetteer')),
  mode text not null check (mode in ('dry_run', 'load')),
  release text,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed', 'refused')),
  rows_read integer,
  rows_kept integer,
  -- {"closed": n, "low_confidence": n, "unmapped": n, "junk": n, "duplicate": n, "suppressed": n, "outside": n}
  dropped jsonb not null default '{}'::jsonb,
  by_category jsonb not null default '{}'::jsonb,
  projected_bytes bigint,
  database_bytes_before bigint,
  message text not null default '',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index import_runs_started_idx on import_runs (started_at desc);

-- ---------------------------------------------------------------------------
-- Places: imported Overture records and member-added businesses
-- ---------------------------------------------------------------------------

create type place_state as enum ('listed', 'claimed', 'verified', 'member');

create table places (
  id bigint generated always as identity primary key,
  gers_id text unique,                       -- null for member-added businesses
  source text not null default 'overture' check (source in ('overture', 'member')),
  release text,
  name text not null,
  category_id text references categories (id),
  taxonomy_primary text,
  taxonomy_hierarchy text[] not null default '{}',
  classified_by text not null default 'taxonomy' check (classified_by in ('taxonomy', 'name_rule', 'ai', 'owner', 'admin')),
  website text not null default '',
  phone text not null default '',
  email text not null default '',            -- outreach only; never sent to browsers
  street text not null default '',
  locality text not null default '',
  region text not null default '',
  postcode text not null default '',
  geog geography(Point, 4326) not null,
  confidence real,
  source_datasets text[] not null default '{}',
  state place_state not null default 'listed',
  -- For broad categories: null = unknown, set by enrichment or the owner.
  serves_journey boolean,
  cluster_ids bigint[] not null default '{}',
  merged_gers_ids text[] not null default '{}',
  stale boolean not null default false,
  suppressed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source = 'member' or gers_id is not null)
);

create index places_geog_idx on places using gist (geog);
create index places_category_idx on places (category_id);
create index places_locality_idx on places (region, locality);
create index places_name_trgm_idx on places using gin (name gin_trgm_ops);
create index places_cluster_ids_idx on places using gin (cluster_ids);

-- ---------------------------------------------------------------------------
-- National counts (no names) and location lookup
-- ---------------------------------------------------------------------------

create table place_counts (
  zcta char(5) not null,
  category_id text not null references categories (id) on delete cascade,
  n integer not null check (n > 0),
  release text not null,
  primary key (zcta, category_id)
);

create table geo_lookup (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('zcta', 'place')),
  name text not null,                        -- ZIP code, or "Sandy" for places
  state char(2) not null default '',
  zcta char(5),
  geog geography(Point, 4326) not null
);

create index geo_lookup_name_trgm_idx on geo_lookup using gin (name gin_trgm_ops);
create index geo_lookup_zcta_idx on geo_lookup (zcta);
create index geo_lookup_geog_idx on geo_lookup using gist (geog);

-- ---------------------------------------------------------------------------
-- Matches
-- ---------------------------------------------------------------------------

create table matches (
  place_a bigint not null references places (id) on delete cascade,
  place_b bigint not null references places (id) on delete cascade,
  cluster_id bigint references clusters (id) on delete set null,
  score real not null,
  c real not null,
  d real not null,
  s real not null,
  distance_m integer not null,
  partnership_type text not null check (partnership_type in ('referral', 'joint_offer', 'distribution')),
  reason_key text not null,
  ai_rationale text,
  rationale_edited boolean not null default false,
  status text not null default 'suggested'
    check (status in ('suggested', 'approved', 'hidden', 'introduced', 'connected', 'live')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (place_a, place_b),
  check (place_a <> place_b)
);

create index matches_place_b_idx on matches (place_b);
create index matches_cluster_idx on matches (cluster_id, score desc);

-- ---------------------------------------------------------------------------
-- Suppression and removal requests
-- ---------------------------------------------------------------------------

create table suppression (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('gers_id', 'domain', 'phone', 'email')),
  value text not null,                       -- normalized (lowercase domain/email, E.164 phone)
  reason text not null check (reason in ('removal', 'unsubscribe', 'bounce', 'complaint', 'manual')),
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (kind, value)
);

create table removal_requests (
  id bigint generated always as identity primary key,
  place_id bigint references places (id) on delete set null,
  business_name text not null,
  city text not null default '',
  contact_email text not null,
  website text not null default '',
  notes text not null default '',
  status text not null default 'new' check (status in ('new', 'done', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers (set_updated_at() comes from the initial migration)
-- ---------------------------------------------------------------------------

create trigger clusters_updated_at before update on clusters for each row execute function set_updated_at();
create trigger places_updated_at before update on places for each row execute function set_updated_at();
create trigger matches_updated_at before update on matches for each row execute function set_updated_at();
create trigger removal_requests_updated_at before update on removal_requests for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Lock down
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['journeys', 'journey_stages', 'categories', 'complements', 'clusters', 'import_runs',
                           'places', 'place_counts', 'geo_lookup', 'matches', 'suppression', 'removal_requests']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end;
$$;
