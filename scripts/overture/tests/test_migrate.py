"""Migration runner against a throwaway database (needs TEST_DATABASE_URL with CREATEDB rights)."""

import os
from pathlib import Path

import psycopg
import pytest

from sc_overture.migrate import apply, migration_files, plan

URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL not set")


@pytest.fixture
def db():
    name = "sc_migrate_test"
    with psycopg.connect(URL, autocommit=True) as admin:
        admin.execute(f"drop database if exists {name}")
        admin.execute(f"create database {name}")
    url = psycopg.conninfo.make_conninfo(URL, dbname=name)
    with psycopg.connect(url) as conn:
        yield conn
    with psycopg.connect(URL, autocommit=True) as admin:
        admin.execute(f"drop database {name} with (force)")


def files(tmp_path: Path, specs: dict[str, str]):
    for fname, sql in specs.items():
        (tmp_path / fname).write_text(sql)
    return migration_files(tmp_path)


def test_applies_only_missing_matching_by_name_or_version(db, tmp_path):
    fs = files(tmp_path, {
        "20260101000000_one.sql": "create table one (id int);",
        "20260102000000_two.sql": "create table two (id int);",
        "20260103000000_three.sql": "create or replace function f() returns int language plpgsql as $$ begin return 3; end; $$; create table three (id int);",
    })
    with db.cursor() as cur:  # "one" was applied through the dashboard, under a different timestamp
        cur.execute("create table one (id int)")
        cur.execute("create schema supabase_migrations")
        cur.execute("create table supabase_migrations.schema_migrations (version text primary key, statements text[], name text)")
        cur.execute("insert into supabase_migrations.schema_migrations values ('20260101123456', null, 'one')")
    db.commit()

    assert [m.name for m in plan(db, fs)] == ["two", "three"]
    assert apply(db, fs, dry_run=True, log=lambda *_: None) == []
    assert [m.name for m in plan(db, fs)] == ["two", "three"]  # dry run changed nothing

    assert apply(db, fs, dry_run=False, log=lambda *_: None) == ["20260102000000_two.sql", "20260103000000_three.sql"]
    with db.cursor() as cur:
        cur.execute("select f()")
        assert cur.fetchone()[0] == 3
        cur.execute("select version, name from supabase_migrations.schema_migrations order by version")
        assert [r[1] for r in cur.fetchall()] == ["one", "two", "three"]
    assert apply(db, fs, dry_run=False, log=lambda *_: None) == []  # idempotent


def test_failure_rolls_back_and_stops(db, tmp_path):
    fs = files(tmp_path, {
        "20260101000000_ok.sql": "create table ok (id int);",
        "20260102000000_bad.sql": "create table half (id int); select no_such_function();",
        "20260103000000_after.sql": "create table after_bad (id int);",
    })
    with pytest.raises(SystemExit, match="20260102000000_bad.sql"):
        apply(db, fs, dry_run=False, log=lambda *_: None)
    with db.cursor() as cur:
        cur.execute("select to_regclass('half'), to_regclass('after_bad'), to_regclass('ok')")
        assert cur.fetchone() == (None, None, "ok")
    assert [m.name for m in plan(db, fs)] == ["bad", "after"]


def test_refuses_out_of_order_history(db, tmp_path):
    fs = files(tmp_path, {"20260101000000_a.sql": "select 1;", "20260102000000_b.sql": "select 1;"})
    with db.cursor() as cur:
        cur.execute("create schema supabase_migrations")
        cur.execute("create table supabase_migrations.schema_migrations (version text primary key, statements text[], name text)")
        cur.execute("insert into supabase_migrations.schema_migrations values ('20260102000000', null, 'b')")
    db.commit()
    with pytest.raises(SystemExit, match="Refusing"):
        plan(db, fs)


def test_repo_migration_files_are_well_formed():
    names = [m.name for m in migration_files()]
    assert names[:2] == ["init", "network_foundation"] and len(names) == len(set(names))
