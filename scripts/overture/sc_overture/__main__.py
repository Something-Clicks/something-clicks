"""CLI: python -m sc_overture <command> (run from scripts/overture)."""

from __future__ import annotations

import argparse
import json


def main() -> None:
    p = argparse.ArgumentParser(prog="sc_overture")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("seed", help="Seed journeys, categories, complements, and starter clusters")
    args = p.parse_args()

    if args.cmd == "seed":
        from .db import connect
        from .seed import seed

        with connect() as conn:
            print(json.dumps(seed(conn)))


if __name__ == "__main__":
    main()
