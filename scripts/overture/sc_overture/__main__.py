"""CLI: python -m sc_overture <command> (run from scripts/overture)."""

from __future__ import annotations

import argparse
import json


def main() -> None:
    p = argparse.ArgumentParser(prog="sc_overture")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("seed", help="Seed journeys, categories, complements, and starter clusters")
    imp = sub.add_parser("import", help="Import one cluster from Overture (always dry-run first)")
    imp.add_argument("cluster", help="cluster slug, e.g. slv-weddings")
    mode = imp.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="report counts and projected size; write nothing")
    mode.add_argument("--load", action="store_true", help="write to the database (within budget only)")
    imp.add_argument("--release", help="Overture release (default: latest)")
    imp.add_argument("--work-dir", default="work", help="where extracts are cached (default: ./work)")
    imp.add_argument("--allow-over-budget", action="store_true", help="only with explicit approval")
    imp.add_argument("--json", action="store_true", help="print the full report as JSON")
    nat = sub.add_parser("national", help="National ZIP x category counts and location lookup (no names)")
    nmode = nat.add_mutually_exclusive_group(required=True)
    nmode.add_argument("--dry-run", action="store_true")
    nmode.add_argument("--load", action="store_true")
    nat.add_argument("--release")
    nat.add_argument("--journey", default="weddings")
    nat.add_argument("--max-files", type=int, help="scan only the first N files (for testing)")
    mig = sub.add_parser("migrate", help="Apply missing supabase/migrations files, in order")
    mig.add_argument("--dry-run", action="store_true", help="list what would be applied; change nothing")
    mat = sub.add_parser("matches", help="Generate matches for one metro cluster")
    mat.add_argument("cluster", help="metro cluster slug, e.g. dfw-weddings")
    args = p.parse_args()

    if args.cmd == "seed":
        from .db import connect
        from .seed import seed

        with connect() as conn:
            print(json.dumps(seed(conn)))

    elif args.cmd == "import":
        from pathlib import Path

        from .db import connect
        from .report import format_report
        from .run import run_import

        with connect() as conn:
            report = run_import(conn, args.cluster, dry_run=args.dry_run, work_dir=Path(args.work_dir),
                                release=args.release, allow_over_budget=args.allow_over_budget)
        print(json.dumps(report, indent=2, default=str) if args.json else format_report(report))

    elif args.cmd == "national":
        from .db import connect
        from .national import run_national

        with connect() as conn:
            report = run_national(conn, dry_run=args.dry_run, release=args.release, journey_id=args.journey,
                                  max_files=args.max_files)
        print(json.dumps(report, indent=2))

    elif args.cmd == "migrate":
        from .db import connect
        from .migrate import apply, migration_files

        with connect() as conn:
            apply(conn, migration_files(), dry_run=args.dry_run)

    elif args.cmd == "matches":
        import time

        from .db import connect
        from .load import get_cluster

        with connect() as conn:
            cluster = get_cluster(conn, args.cluster)
            started = time.time()
            with conn.cursor() as cur:
                cur.execute("select compute_matches(%s)", (cluster["id"],))
                n = cur.fetchone()[0]
                cur.execute("select pg_size_pretty(pg_total_relation_size('matches'))")
                size = cur.fetchone()[0]
            conn.commit()
        print(f"{args.cluster}: {n:,} match suggestions in {time.time() - started:.0f}s (matches table now {size})")


if __name__ == "__main__":
    main()
