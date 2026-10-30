"""Database connection helper. Uses SUPABASE_DB_URL (or DATABASE_URL for local dev)."""

from __future__ import annotations

import os

import psycopg


def connect() -> psycopg.Connection:
    url = os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("Set SUPABASE_DB_URL (or DATABASE_URL for a local database).")
    return psycopg.connect(url, autocommit=False)
