-- Something Clicks network, phase 3: AI review of listings and AI-written
-- match reasons, with a spend ledger for the monthly cap. Same security
-- model: RLS on, no public access.

-- Every AI request, with its real token usage and cost. The monthly cap is
-- checked against this table before each request.
create table if not exists ai_usage (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('review', 'rationale')),
  model text not null,
  items integer not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  -- Local runs with the mock provider: recorded for testing, never counted against the cap.
  mocked boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_month_idx on ai_usage (created_at) where not mocked;

-- One AI review per listing: does it serve weddings, and is its category right?
create table if not exists ai_reviews (
  place_id bigint primary key references places (id) on delete cascade,
  serves text not null check (serves in ('yes', 'no', 'unsure')),
  confidence real not null,
  suggested_category text references categories (id),
  reason text not null default '',
  model text not null,
  mocked boolean not null default false,
  -- applied: serves_journey was set from this review. accepted: an admin moved the category.
  applied boolean not null default false,
  category_accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ai_reviews_recent_idx on ai_reviews (created_at desc);

do $$
declare t text;
begin
  foreach t in array array['ai_usage', 'ai_reviews']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end;
$$;
