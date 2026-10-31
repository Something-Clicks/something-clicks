"""Database side of an import: cluster lookup, suppression, size budget, upsert, run records."""

from __future__ import annotations

import json
import os

import psycopg

from .transform import Result, Suppression

# Measured on Postgres 16 with indexes (660 B) plus a PostGIS point and index.
BYTES_PER_PLACE = 750
# About 15 matches per clustered place at ~210 B each, including indexes (measured).
BYTES_MATCHES_PER_PLACE = 3200
FREE_TIER_BYTES = 500 * 1024**2


def budget_bytes() -> int:
    """Total database size an import may reach without explicit approval (default 400 MB)."""
    return int(float(os.environ.get("DB_BUDGET_MB", "400")) * 1024**2)


def get_cluster(conn: psycopg.Connection, slug: str) -> dict:
    with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        cur.execute(
            """select id, slug, name, journey_id, scope, include_broad, min_lng, min_lat, max_lng, max_lat,
                      min_confidence, status
               from clusters where slug = %s""",
            (slug,),
        )
        row = cur.fetchone()
    if not row:
        raise SystemExit(f"No cluster with slug {slug!r}. Run `seed` or create it in the admin.")
    return row


def suppression(conn: psycopg.Connection) -> Suppression:
    s = Suppression()
    target = {"gers_id": s.gers_ids, "domain": s.domains, "phone": s.phones, "email": s.emails}
    with conn.cursor() as cur:
        cur.execute("select kind, value from suppression")
        for kind, value in cur.fetchall():
            target[kind].add(value)
    return s


def database_bytes(conn: psycopg.Connection) -> int:
    with conn.cursor() as cur:
        cur.execute("select pg_database_size(current_database())")
        return cur.fetchone()[0]


def new_place_count(conn: psycopg.Connection, gers_ids: list[str]) -> int:
    with conn.cursor() as cur:
        cur.execute("select count(*) from places where gers_id = any(%s)", (gers_ids,))
        return len(gers_ids) - cur.fetchone()[0]


def start_run(conn: psycopg.Connection, cluster_id: int | None, kind: str, mode: str, release: str | None) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "insert into import_runs (cluster_id, kind, mode, release) values (%s, %s, %s, %s) returning id",
            (cluster_id, kind, mode, release),
        )
        run_id = cur.fetchone()[0]
    conn.commit()
    return run_id


def finish_run(conn: psycopg.Connection, run_id: int, status: str, result: Result | None = None,
               projected: int | None = None, before: int | None = None, message: str = "") -> None:
    conn.rollback()  # discard any failed transaction before recording the outcome
    with conn.cursor() as cur:
        cur.execute(
            """update import_runs set status = %s, rows_read = %s, rows_kept = %s, dropped = %s, by_category = %s,
                 projected_bytes = %s, database_bytes_before = %s, message = %s, finished_at = now()
               where id = %s""",
            (
                status,
                result.rows_read if result else None,
                len(result.kept) if result else None,
                json.dumps(result.dropped if result else {}),
                json.dumps(result.by_category if result else {}),
                projected,
                before,
                message,
                run_id,
            ),
        )
    conn.commit()


STAGE_COLUMNS = [
    "gers_id", "name", "category_id", "classified_by", "taxonomy_primary", "taxonomy_hierarchy", "website",
    "phone", "email", "street", "locality", "region", "postcode", "lat", "lng", "confidence",
    "source_datasets", "merged_gers_ids",
]

# While a business is unclaimed, imported fields are refreshed from Overture.
# Once claimed, the owner's fields win; categories set by an owner, admin, or AI are kept.
UPSERT = """
insert into places (gers_id, source, release, name, category_id, classified_by, taxonomy_primary,
  taxonomy_hierarchy, website, phone, email, street, locality, region, postcode, geog, confidence,
  source_datasets, cluster_ids, merged_gers_ids, stale)
select gers_id, 'overture', %(release)s, name, category_id, classified_by, taxonomy_primary,
  taxonomy_hierarchy, website, phone, email, street, locality, region, postcode,
  st_setsrid(st_makepoint(lng, lat), 4326)::geography, confidence, source_datasets,
  array[%(cluster_id)s]::bigint[], merged_gers_ids, false
from stage
on conflict (gers_id) do update set
  release = excluded.release,
  confidence = excluded.confidence,
  source_datasets = excluded.source_datasets,
  merged_gers_ids = excluded.merged_gers_ids,
  stale = false,
  cluster_ids = array(select distinct unnest(places.cluster_ids || excluded.cluster_ids) order by 1),
  taxonomy_primary = excluded.taxonomy_primary,
  taxonomy_hierarchy = excluded.taxonomy_hierarchy,
  category_id = case when places.classified_by in ('owner', 'admin', 'ai') then places.category_id else excluded.category_id end,
  classified_by = case when places.classified_by in ('owner', 'admin', 'ai') then places.classified_by else excluded.classified_by end,
  name = case when places.state = 'listed' then excluded.name else places.name end,
  website = case when places.state = 'listed' then excluded.website else places.website end,
  phone = case when places.state = 'listed' then excluded.phone else places.phone end,
  email = case when places.state = 'listed' then excluded.email else places.email end,
  street = case when places.state = 'listed' then excluded.street else places.street end,
  locality = case when places.state = 'listed' then excluded.locality else places.locality end,
  region = case when places.state = 'listed' then excluded.region else places.region end,
  postcode = case when places.state = 'listed' then excluded.postcode else places.postcode end,
  geog = case when places.state = 'listed' then excluded.geog else places.geog end
-- Skip unchanged rows: rewriting all ~240k rows on every re-import would leave
-- that many dead row versions behind and trip the size guard.
where (places.release, places.confidence, places.source_datasets, places.merged_gers_ids, places.stale,
       places.taxonomy_primary, places.category_id, places.name, places.website, places.phone, places.email,
       places.street, places.locality, places.region, places.postcode, places.cluster_ids)
  is distinct from
      (excluded.release, excluded.confidence, excluded.source_datasets, excluded.merged_gers_ids, false,
       excluded.taxonomy_primary, excluded.category_id, excluded.name, excluded.website, excluded.phone, excluded.email,
       excluded.street, excluded.locality, excluded.region, excluded.postcode,
       array(select distinct unnest(places.cluster_ids || excluded.cluster_ids) order by 1))
returning (xmax = 0) as inserted
"""


def load(conn: psycopg.Connection, cluster_id: int, release: str, kept: list[dict]) -> dict[str, int]:
    """Upsert kept rows and mark this cluster's records missing from them as stale. Caller commits."""
    with conn.cursor() as cur:
        cur.execute("drop table if exists stage")
        cur.execute(
            """create temp table stage (gers_id text, name text, category_id text, classified_by text,
                 taxonomy_primary text, taxonomy_hierarchy text[], website text, phone text, email text,
                 street text, locality text, region text, postcode text, lat float8, lng float8,
                 confidence real, source_datasets text[], merged_gers_ids text[]) on commit drop"""
        )
        with cur.copy(f"copy stage ({', '.join(STAGE_COLUMNS)}) from stdin") as copy:
            for r in kept:
                copy.write_row([r[c] for c in STAGE_COLUMNS])
        cur.execute(UPSERT, {"release": release, "cluster_id": cluster_id})
        flags = [row[0] for row in cur.fetchall()]
        # Anything this cluster imported before but not now (gone from Overture, or
        # newly dropped as a duplicate or below threshold) is marked stale, not deleted.
        cur.execute(
            """update places p set stale = true
               where %s = any(p.cluster_ids) and p.source = 'overture' and not p.stale
                 and not exists (select 1 from stage s where s.gers_id = p.gers_id)""",
            (cluster_id,),
        )
        stale = cur.rowcount
    inserted = sum(flags)
    return {"inserted": inserted, "updated": len(flags) - inserted, "unchanged": len(kept) - len(flags), "marked_stale": stale}


def custom_taxonomy(conn: psycopg.Connection, journey_id: str | None, include_broad: bool = True) -> dict[str, str]:
    """Overture taxonomy value -> category id for categories created in admin (not in journeys.json)."""
    with conn.cursor() as cur:
        cur.execute(
            """select t, c.id from categories c, unnest(c.taxonomy) as t
               where c.custom and (%s::text is null or c.journey_id = %s) and (%s or not c.broad)""",
            (journey_id, journey_id, include_broad),
        )
        return {t: cid for t, cid in cur.fetchall()}


def merge_taxonomy(journey_map: dict[str, str], custom: dict[str, str]) -> dict[str, str]:
    """The journey map wins: a custom category never takes over a value journeys.json already maps."""
    return {**{t: c for t, c in custom.items() if t not in journey_map}, **journey_map}
