"""Clean, classify, and deduplicate an extract with DuckDB.

Every input row ends up either kept or counted under exactly one drop
reason, checked in this order: outside, not_us, closed, low_confidence,
junk, unmapped, suppressed, duplicate.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import duckdb

DROP_REASONS = ["outside", "not_us", "closed", "low_confidence", "junk", "unmapped", "suppressed", "duplicate"]


@dataclass
class Suppression:
    gers_ids: set[str] = field(default_factory=set)
    domains: set[str] = field(default_factory=set)
    phones: set[str] = field(default_factory=set)
    emails: set[str] = field(default_factory=set)


@dataclass
class Result:
    rows_read: int
    kept: list[dict]
    dropped: dict[str, int]
    by_category: dict[str, int]
    by_classifier: dict[str, int]


def _sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def transform(
    extract: Path,
    bbox: tuple[float, float, float, float],
    min_confidence: float,
    taxonomy_map: dict[str, str],
    name_rules: list[tuple[str, str]],
    suppression: Suppression | None = None,
) -> Result:
    sup = suppression or Suppression()
    con = duckdb.connect()
    con.execute("CREATE TABLE raw AS SELECT * FROM read_parquet(?)", [str(extract)])
    con.execute("CREATE TABLE taxmap (taxonomy TEXT PRIMARY KEY, category_id TEXT)")
    if taxonomy_map:
        con.executemany("INSERT INTO taxmap VALUES (?, ?)", list(taxonomy_map.items()))
    for name, values in [("sup_gers", sup.gers_ids), ("sup_domain", sup.domains), ("sup_phone", sup.phones), ("sup_email", sup.emails)]:
        con.execute(f"CREATE TABLE {name} (v TEXT)")
        if values:
            con.executemany(f"INSERT INTO {name} VALUES (?)", [(v,) for v in values])

    # Name rules apply only when the taxonomy value isn't mapped; first rule wins.
    name_case = (
        "CASE " + " ".join(f"WHEN regexp_matches(name, {_sql_str(p)}, 'i') THEN {_sql_str(c)}" for c, p in name_rules) + " END"
        if name_rules
        else "NULL"
    )
    x0, y0, x1, y1 = bbox

    con.execute(
        f"""
        CREATE TABLE base AS
        WITH r AS (
          SELECT
            id AS gers_id,
            trim(names.primary) AS name,
            taxonomy.primary AS taxonomy_primary,
            coalesce(taxonomy.hierarchy, []) AS taxonomy_hierarchy,
            confidence,
            operating_status,
            websites[1] AS website_raw,
            phones[1] AS phone_raw,
            emails[1] AS email_raw,
            addresses[1] AS addr,
            list_distinct(list_transform(coalesce(sources, []), lambda s: s.dataset)) AS source_datasets,
            (bbox.ymin + bbox.ymax) / 2 AS lat,
            (bbox.xmin + bbox.xmax) / 2 AS lng
          FROM raw
        )
        SELECT r.*,
          t.category_id AS tax_category,
          {name_case} AS name_category,
          lower(regexp_extract(coalesce(website_raw, ''), '^(https?://[^/?#]+)', 1)) AS website,
          regexp_replace(lower(regexp_extract(coalesce(website_raw, ''), '^https?://([^/?#:]+)', 1)), '^www\\.', '') AS domain,
          regexp_replace(coalesce(phone_raw, ''), '[^0-9]', '', 'g') AS phone_digits,
          lower(trim(coalesce(email_raw, ''))) AS email_l,
          regexp_replace(lower(replace(coalesce(name, ''), '&', 'and')), '[^a-z0-9]', '', 'g') AS norm_name
        FROM r LEFT JOIN taxmap t ON t.taxonomy = r.taxonomy_primary
        """
    )
    con.execute(
        f"""
        CREATE TABLE classified AS
        SELECT *,
          CASE
            WHEN NOT (lng BETWEEN {x0} AND {x1} AND lat BETWEEN {y0} AND {y1}) THEN 'outside'
            WHEN coalesce(addr.country, '') <> 'US' THEN 'not_us'
            WHEN operating_status IN ('permanently_closed', 'temporarily_closed') THEN 'closed'
            WHEN confidence IS NULL OR confidence < {float(min_confidence)} THEN 'low_confidence'
            WHEN name IS NULL OR length(name) < 2 OR NOT regexp_matches(name, '[A-Za-z]') THEN 'junk'
            WHEN tax_category IS NULL AND name_category IS NULL THEN 'unmapped'
            WHEN gers_id IN (SELECT v FROM sup_gers)
              OR (domain <> '' AND domain IN (SELECT v FROM sup_domain))
              OR (phone_e164 <> '' AND phone_e164 IN (SELECT v FROM sup_phone))
              OR (email <> '' AND email IN (SELECT v FROM sup_email)) THEN 'suppressed'
          END AS drop_reason
        FROM (
          SELECT *,
            coalesce(tax_category, name_category) AS category_id,
            CASE WHEN tax_category IS NOT NULL THEN 'taxonomy' ELSE 'name_rule' END AS classified_by,
            CASE
              WHEN length(phone_digits) = 10 THEN '+1' || phone_digits
              WHEN length(phone_digits) = 11 AND phone_digits[1] = '1' THEN '+' || phone_digits
              ELSE trim(coalesce(phone_raw, ''))
            END AS phone_e164,
            CASE WHEN regexp_matches(email_l, '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$') THEN email_l ELSE '' END AS email
          FROM base
        )
        """
    )

    # Duplicates among otherwise-kept rows. Keep the higher-confidence row when:
    #   - same normalized name within 50 m
    #   - same website domain + phone within 200 m
    #   - within 100 m and one name contains the other or they're nearly identical
    #     ("The Schoolhouse" / "The SchoolHouse Dallas"); both names >= 6 chars
    #     so short generic names never collapse distinct businesses
    hav = (
        "2 * 6371000 * asin(sqrt(pow(sin(radians(b.lat - a.lat) / 2), 2) + "
        "cos(radians(a.lat)) * cos(radians(b.lat)) * pow(sin(radians(b.lng - a.lng) / 2), 2)))"
    )
    better = "(b.confidence > a.confidence OR (b.confidence = a.confidence AND b.gers_id < a.gers_id))"
    con.execute(
        f"""
        CREATE TABLE dup_pairs AS
        WITH c AS (SELECT * FROM classified WHERE drop_reason IS NULL),
        cells AS (SELECT *, floor(lat * 1000)::BIGINT AS cy, floor(lng * 1000)::BIGINT AS cx FROM c)
        SELECT a.gers_id AS loser, b.gers_id AS winner, b.confidence AS winner_conf
        FROM c a JOIN c b ON a.norm_name = b.norm_name AND a.norm_name <> '' AND a.gers_id <> b.gers_id
        WHERE {hav} < 50 AND {better}
        UNION
        SELECT a.gers_id, b.gers_id, b.confidence
        FROM c a JOIN c b ON a.domain = b.domain AND a.phone_e164 = b.phone_e164
          AND a.domain <> '' AND a.phone_e164 <> '' AND a.gers_id <> b.gers_id
        WHERE {hav} < 200 AND {better}
        UNION
        SELECT a.gers_id, b.gers_id, b.confidence
        -- ~100 m grid: each row probes its own and the 8 neighbouring cells, as
        -- plain integer columns so DuckDB can hash-join them.
        FROM (SELECT *, cy + dy AS ny, cx + dx AS nx FROM cells, (SELECT unnest([-1, 0, 1]) AS dy), (SELECT unnest([-1, 0, 1]) AS dx)) a
        JOIN cells b ON b.cy = a.ny AND b.cx = a.nx AND a.gers_id <> b.gers_id
        WHERE length(a.norm_name) >= 6 AND length(b.norm_name) >= 6
          AND (contains(a.norm_name, b.norm_name) OR contains(b.norm_name, a.norm_name)
               OR jaro_winkler_similarity(a.norm_name, b.norm_name) >= 0.93)
          AND {hav} < 100 AND {better}
        """
    )
    con.execute(
        """
        CREATE TABLE best_winner AS
        SELECT loser, arg_max(winner, winner_conf) AS winner FROM dup_pairs GROUP BY loser
        """
    )
    con.execute(
        "UPDATE classified SET drop_reason = 'duplicate' WHERE gers_id IN (SELECT loser FROM best_winner)"
    )

    rows_read = con.execute("SELECT count(*) FROM classified").fetchone()[0]
    dropped = dict.fromkeys(DROP_REASONS, 0)
    for reason, n in con.execute(
        "SELECT drop_reason, count(*) FROM classified WHERE drop_reason IS NOT NULL GROUP BY 1"
    ).fetchall():
        dropped[reason] = n

    cur = con.execute(
        """
        SELECT k.gers_id, k.name, k.category_id, k.classified_by, k.taxonomy_primary, k.taxonomy_hierarchy,
               k.website, k.phone_e164 AS phone, k.email,
               coalesce(k.addr.freeform, '') AS street, coalesce(k.addr.locality, '') AS locality,
               coalesce(k.addr.region, '') AS region, coalesce(k.addr.postcode, '') AS postcode,
               k.lat, k.lng, k.confidence, k.source_datasets,
               coalesce((SELECT list(loser ORDER BY loser) FROM best_winner w WHERE w.winner = k.gers_id), []) AS merged_gers_ids
        FROM classified k WHERE k.drop_reason IS NULL ORDER BY k.category_id, k.name
        """
    )
    cols = [d[0] for d in cur.description]
    kept = [dict(zip(cols, r)) for r in cur.fetchall()]
    by_category: dict[str, int] = {}
    by_classifier: dict[str, int] = {}
    for r in kept:
        by_category[r["category_id"]] = by_category.get(r["category_id"], 0) + 1
        by_classifier[r["classified_by"]] = by_classifier.get(r["classified_by"], 0) + 1
    return Result(rows_read, kept, dropped, dict(sorted(by_category.items(), key=lambda x: -x[1])), by_classifier)
