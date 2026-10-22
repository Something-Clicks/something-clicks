#!/usr/bin/env bash
# Applies all migrations to a fresh database and runs the database tests.
# Usage: TEST_DATABASE_ADMIN_URL=postgresql://postgres@127.0.0.1:5432/postgres npm run test:db
set -euo pipefail

: "${TEST_DATABASE_ADMIN_URL:?Set TEST_DATABASE_ADMIN_URL to a superuser connection on a throwaway Postgres server}"
DB_NAME="${TEST_DATABASE_NAME:-something_clicks_test}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

psql "$TEST_DATABASE_ADMIN_URL" -q -v ON_ERROR_STOP=1 -c "drop database if exists $DB_NAME" -c "create database $DB_NAME"
TEST_URL="$(node -e 'const u=new URL(process.argv[1]);u.pathname="/"+process.argv[2];console.log(u.toString())' "$TEST_DATABASE_ADMIN_URL" "$DB_NAME")"

psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$ROOT/tests/db/supabase-stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "applying $(basename "$f")"
  psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$f"
done

TEST_DATABASE_URL="$TEST_URL" npx vitest run tests/db
