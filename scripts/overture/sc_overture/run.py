"""Cluster import orchestration: release → extract → transform → budget check → (dry run | load)."""

from __future__ import annotations

from pathlib import Path

import psycopg

from . import journeys as J
from . import load as L
from .extract import US_BOXES, Prefilter, extract
from .release import latest_release
from .transform import transform


def run_import(conn: psycopg.Connection, slug: str, *, dry_run: bool, work_dir: Path,
               release: str | None = None, allow_over_budget: bool = False, log=print) -> dict:
    cluster = L.get_cluster(conn, slug)
    release = release or latest_release(log)
    run_id = L.start_run(conn, cluster["id"], "cluster", "dry_run" if dry_run else "load", release)
    result = None
    try:
        bbox = (cluster["min_lng"], cluster["min_lat"], cluster["max_lng"], cluster["max_lat"])
        boxes = US_BOXES if cluster["scope"] == "national" else [bbox]
        data = J.load()
        tax = J.taxonomy_map(data, cluster["journey_id"], include_broad=cluster["include_broad"])
        rules = [(c, p.pattern) for c, p in J.name_rules(data, cluster["journey_id"], include_broad=cluster["include_broad"])]
        prefilter = Prefilter(frozenset(tax), "|".join(f"(?:{p})" for _, p in rules) or None)

        path = work_dir / f"{slug}-{release}.parquet"
        if path.exists():
            log(f"Reusing extract {path}")
        else:
            extract(release, boxes, path, prefilter, log)
        result = transform(path, bbox, cluster["min_confidence"], tax, rules, L.suppression(conn))

        before = L.database_bytes(conn)
        new = L.new_place_count(conn, [r["gers_id"] for r in result.kept])
        # Matches are generated per metro, so only metro imports reserve room for them.
        matches_room = len(result.kept) * L.BYTES_MATCHES_PER_PLACE if cluster["scope"] == "metro" else 0
        projected = new * L.BYTES_PER_PLACE + matches_room
        budget = L.budget_bytes()
        report = {
            "run_id": run_id,
            "cluster": slug,
            "scope": cluster["scope"],
            "include_broad": cluster["include_broad"],
            "release": release,
            "rows_read": result.rows_read,
            "rows_kept": len(result.kept),
            "new_places": new,
            "dropped": result.dropped,
            "by_category": result.by_category,
            "by_classifier": result.by_classifier,
            "database_bytes_before": before,
            "projected_bytes": projected,
            "budget_bytes": budget,
            "free_tier_bytes": L.FREE_TIER_BYTES,
            "within_budget": before + projected <= budget,
            "sample": [{k: r[k] for k in ("name", "category_id", "classified_by", "locality")} for r in result.kept[:: max(1, len(result.kept) // 12)][:12]],
        }

        if dry_run:
            L.finish_run(conn, run_id, "succeeded", result, projected, before, "dry run")
            return report
        if not report["within_budget"] and not allow_over_budget:
            msg = (f"Refused: projected database size {(before + projected) / 1024**2:.0f} MB exceeds the "
                   f"{budget / 1024**2:.0f} MB budget. Supabase Pro would be required; get approval first.")
            L.finish_run(conn, run_id, "refused", result, projected, before, msg)
            raise SystemExit(msg)

        stats = L.load(conn, cluster["id"], release, result.kept)
        conn.commit()
        L.finish_run(conn, run_id, "succeeded", result, projected, before,
                     f"inserted {stats['inserted']}, updated {stats['updated']}, marked stale {stats['marked_stale']}")
        report["load"] = stats
        return report
    except SystemExit:
        raise
    except Exception as e:
        L.finish_run(conn, run_id, "failed", result, message=f"{type(e).__name__}: {e}"[:2000])
        raise
