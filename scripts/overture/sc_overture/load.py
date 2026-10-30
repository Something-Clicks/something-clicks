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
returning (xmax = 0) as inserted
"""


def load(conn: psycopg.Connection, cluster_id: int, release: str, kept: list[dict]) -> dict[str, int]:
    """Upsert kept rows and mark this cluster's records missing from the release as stale. Caller commits."""
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
        cur.execute(
            """update places set stale = true
               where %s = any(cluster_ids) and source = 'overture' and release is distinct from %s and not stale""",
            (cluster_id, release),
        )
        stale = cur.rowcount
    return {"inserted": sum(flags), "updated": len(flags) - sum(flags), "marked_stale": stale}
