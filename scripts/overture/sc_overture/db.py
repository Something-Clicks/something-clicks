"""Database connection helper. Uses SUPABASE_DB_URL (or DATABASE_URL for local dev)."""

from __future__ import annotations

import os

import psycopg


def connect() -> psycopg.Connection:
    # Pasted secrets often carry a trailing newline, which ends up in the database name.
    url = (os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL") or "").strip()
    if not url:
        raise SystemExit("Set SUPABASE_DB_URL (or DATABASE_URL for a local database).")
    return psycopg.connect(url, autocommit=False)
