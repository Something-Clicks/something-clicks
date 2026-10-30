"""Apply missing files from supabase/migrations, in order, each in its own transaction.

Applied migrations are tracked in supabase_migrations.schema_migrations, the
table the Supabase dashboard and CLI use. A file counts as applied when a row
matches its version (timestamp prefix) or its name: migrations applied
through the dashboard are recorded with the dashboard's own timestamp, e.g.
20261030123445 "init" for 20261030000000_init.sql.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import psycopg

MIGRATIONS_DIR = Path(__file__).resolve().parents[3] / "supabase" / "migrations"
FILE_RE = re.compile(r"^(\d{14})_([a-z0-9_]+)\.sql$")


@dataclass(frozen=True)
class Migration:
    version: str
    name: str
    path: Path


def migration_files(directory: Path = MIGRATIONS_DIR) -> list[Migration]:
    files = []
    for p in sorted(directory.glob("*.sql")):
        m = FILE_RE.match(p.name)
        if not m:
            raise SystemExit(f"Unexpected migration file name: {p.name} (expected <14-digit timestamp>_<name>.sql)")
        files.append(Migration(m.group(1), m.group(2), p))
    return files


def _ensure_history_table(conn: psycopg.Connection) -> None:
    with conn.cursor() as cur:
        cur.execute("create schema if not exists supabase_migrations")
        cur.execute(
            """create table if not exists supabase_migrations.schema_migrations
               (version text primary key, statements text[], name text)"""
        )
    conn.commit()


def plan(conn: psycopg.Connection, files: list[Migration]) -> list[Migration]:
    """Missing migrations, in order. Refuses if an earlier file is missing but a later one is applied."""
    _ensure_history_table(conn)
    with conn.cursor() as cur:
        cur.execute("select version, coalesce(name, '') from supabase_migrations.schema_migrations")
        rows = cur.fetchall()
    versions = {v for v, _ in rows}
    names = {n for _, n in rows}
    applied = [f.version in versions or f.name in names for f in files]
    last_applied = max((i for i, a in enumerate(applied) if a), default=-1)
    gaps = [f.path.name for i, (f, a) in enumerate(zip(files, applied)) if not a and i < last_applied]
    if gaps:
        raise SystemExit(f"Refusing: {', '.join(gaps)} missing but later migrations are applied. Fix by hand.")
    return [f for f, a in zip(files, applied) if not a]


def apply(conn: psycopg.Connection, files: list[Migration], *, dry_run: bool, log=print) -> list[str]:
    pending = plan(conn, files)
    if not pending:
        log("All migrations are already applied.")
        return []
    log(("Would apply" if dry_run else "Applying") + f" {len(pending)} migration(s), in order:")
    done = []
    for m in pending:
        log(f"  {m.path.name}")
        if dry_run:
            continue
        sql = m.path.read_text()
        try:
            with conn.cursor() as cur:
                # No parameters, so psycopg sends the whole file as one simple query.
                cur.execute(sql)
                cur.execute(
                    "insert into supabase_migrations.schema_migrations (version, statements, name) values (%s, %s, %s)",
                    (m.version, [sql], m.name),
                )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise SystemExit(f"Failed on {m.path.name} (rolled back; later migrations not run): {e}") from e
        done.append(m.path.name)
        log("    applied")
    return done
