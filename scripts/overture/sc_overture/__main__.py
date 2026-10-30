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


if __name__ == "__main__":
    main()
