#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

mapfile -t db_parts < <(node -e "
const url = new URL(process.env.DATABASE_URL);
console.log([
  url.hostname,
  url.port || '5432',
  decodeURIComponent(url.username),
  decodeURIComponent(url.password),
  url.pathname.replace(/^\\//, ''),
].join('\\n'));
")

PGHOST="${db_parts[0]}"
PGPORT="${db_parts[1]}"
PGUSER="${db_parts[2]}"
PGPASSWORD="${db_parts[3]}"
PGDATABASE="${db_parts[4]}"
export PGPASSWORD

echo "Waiting for PostgreSQL at ${PGHOST}:${PGPORT}..."
for attempt in $(seq 1 60); do
  if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c 'select 1' >/dev/null 2>&1; then
    echo "PostgreSQL is ready."
    break
  fi
  if [[ "$attempt" -eq 60 ]]; then
    echo "PostgreSQL did not become ready in time." >&2
    exit 1
  fi
  sleep 1
done

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 <<'SQL'
create schema if not exists extensions;
grant usage on schema extensions to public;
SQL

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 \
  -f supabase/migrations/202608030001_schema.sql

echo "Schema migration applied."
