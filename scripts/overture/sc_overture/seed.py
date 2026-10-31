"""Seed journeys, stages, categories, complements, and starter clusters."""

from __future__ import annotations

import psycopg

from . import journeys as J


def seed(conn: psycopg.Connection, data: dict | None = None) -> dict[str, int]:
    data = data or J.load()
    counts = {"journeys": 0, "categories": 0, "complements": 0, "clusters": 0}
    with conn.cursor() as cur:
        for j in data["journeys"]:
            cur.execute(
                """insert into journeys (id, name, active, unconfirmed_name_pattern) values (%s, %s, %s, %s)
                   on conflict (id) do update set name = excluded.name, active = excluded.active,
                     unconfirmed_name_pattern = excluded.unconfirmed_name_pattern""",
                (j["id"], j["name"], j["active"], j.get("unconfirmedNamePattern", "")),
            )
            counts["journeys"] += 1
            for pos, s in enumerate(j["stages"]):
                cur.execute(
                    """insert into journey_stages (id, journey_id, position, label) values (%s, %s, %s, %s)
                       on conflict (id) do update set position = excluded.position, label = excluded.label""",
                    (s["id"], j["id"], pos, s["label"]),
                )
            for c in j["categories"]:
                cur.execute(
                    """insert into categories (id, journey_id, stage_id, label, plural, broad, taxonomy, synonyms, unconfirmed_taxonomy)
                       values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                       on conflict (id) do update set stage_id = excluded.stage_id, label = excluded.label,
                         plural = excluded.plural, broad = excluded.broad, taxonomy = excluded.taxonomy,
                         synonyms = excluded.synonyms, unconfirmed_taxonomy = excluded.unconfirmed_taxonomy""",
                    (c["id"], j["id"], c["stage"], c["label"], c["plural"], bool(c.get("broad")), c["taxonomy"], c["synonyms"],
                     c.get("unconfirmedTaxonomy", [])),
                )
                counts["categories"] += 1
            # Complements are derived data: replace them wholesale for this journey.
            cur.execute(
                "delete from complements where category_a in (select id from categories where journey_id = %s)",
                (j["id"],),
            )
            rows = J.complements(j)
            cur.executemany(
                """insert into complements (category_a, category_b, strength, relation, reason_key, partnership_type)
                   values (%s, %s, %s, %s, %s, %s)""",
                [(r.category_a, r.category_b, r.strength, r.relation, r.reason_key, r.partnership_type) for r in rows],
            )
            counts["complements"] += len(rows)
        for cl in data.get("clusters", []):
            min_lng, min_lat, max_lng, max_lat = cl["bbox"]
            lng, lat = cl["center"]
            # Insert only: admins may have edited an existing cluster.
            cur.execute(
                """insert into clusters (slug, name, journey_id, scope, include_broad, match_unconfirmed_broad, status, min_lng,
                                         min_lat, max_lng, max_lat, center, distance_scale_km, max_match_km)
                   values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, st_setsrid(st_makepoint(%s, %s), 4326)::geography, %s, %s)
                   on conflict (slug) do nothing""",
                (cl["slug"], cl["name"], cl["journey"], cl.get("scope", "metro"), cl.get("includeBroad", True),
                 cl.get("matchUnconfirmedBroad", False), cl.get("status", "draft"), min_lng, min_lat, max_lng, max_lat, lng, lat,
                 cl.get("distanceScaleKm", 10), cl.get("maxMatchKm", 40)),
            )
            counts["clusters"] += cur.rowcount
    conn.commit()
    return counts
