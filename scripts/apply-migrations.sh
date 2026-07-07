#!/usr/bin/env bash
set -euo pipefail

# Applies SQL migration files found in supabase/migrations in lexical order.
# Requires: DATABASE_URL environment variable with a Postgres connection string.

MIGRATIONS_DIR="$(dirname "${BASH_SOURCE[0]}")/../supabase/migrations"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is not set. Export your Postgres connection string first."
  echo "Example: export DATABASE_URL=\"postgresql://user:pass@host:5432/dbname\""
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql is not installed or not in PATH. Install libpq/client tools." 
  exit 1
fi

echo "Applying migrations from: $MIGRATIONS_DIR"

shopt -s nullglob
files=("$MIGRATIONS_DIR"/*.sql)
if [ ${#files[@]} -eq 0 ]; then
  echo "No .sql files found in $MIGRATIONS_DIR"
  exit 0
fi

for f in "${files[@]}"; do
  echo "--- Running: $(basename "$f") ---"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "All migrations applied."
