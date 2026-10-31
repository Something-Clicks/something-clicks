-- What businesses call themselves when we don't match it yet, and the admin
-- tools to act on it: synonyms added from admin, new categories (drafted by
-- AI, approved by an admin), and businesses waiting for a category.
-- Same security model: RLS on, no public access; only server code reads or writes.

-- Admin-added synonyms live beside the journey map's own (which the seed job
-- rewrites); custom categories are ones created in admin, not in journeys.json.
alter table categories add column if not exists extra_synonyms text[] not null default '{}';
alter table categories add column if not exists custom boolean not null default false;

-- 'journey' pairs come from journeys.json and are replaced on every seed;
-- 'admin' pairs belong to custom categories and are kept.
alter table complements add column if not exists source text not null default 'journey';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'complements_source_check') then
    alter table complements add constraint complements_source_check check (source in ('journey', 'admin'));
  end if;
end;
$$;

-- "What you do" terms that matched no category. Text only: no IP, no session,
-- no location; terms that look like contact details are never stored.
create table if not exists search_terms (
  term text primary key check (length(term) between 2 and 60),
  searches integer not null default 1,
  -- open: needs a decision. synonym/category: mapped to category_id. ignored: hidden.
  status text not null default 'open' check (status in ('open', 'synonym', 'category', 'ignored')),
  category_id text references categories (id) on delete set null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create index if not exists search_terms_open_idx on search_terms (searches desc) where status = 'open';

-- AI-drafted categories waiting for an admin. Nothing is created until approved.
create table if not exists category_drafts (
  id bigint generated always as identity primary key,
  term text not null references search_terms (term) on delete cascade,
  draft jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists category_drafts_term_idx on category_drafts (term, created_at desc);

-- A business added by its owner with a type we don't match yet keeps what
-- they typed, so it can be given the category once one exists.
alter table places add column if not exists unmatched_term text;
create index if not exists places_unmatched_term_idx on places (unmatched_term) where unmatched_term is not null;

-- Category drafts count against the same monthly AI cap.
alter table ai_usage drop constraint if exists ai_usage_kind_check;
alter table ai_usage add constraint ai_usage_kind_check check (kind in ('review', 'rationale', 'category_draft'));

do $$
declare t text;
begin
  foreach t in array array['search_terms', 'category_drafts']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end;
$$;
