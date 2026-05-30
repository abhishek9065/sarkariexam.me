#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

SOURCE_URL="${NEON_URL:-}"
TARGET_URL="${DO_POSTGRES_URL:-}"
DUMP_FILE=""
WORK_DIR="$ROOT_DIR/.data/postgres-migration"
CONFIRM_MAINTENANCE="0"
SKIP_DUMP="0"
SKIP_RESTORE="0"
SKIP_PRISMA_CHECKS="0"

usage() {
  cat <<'EOF'
Usage:
  NEON_URL='<source-url>' DO_POSTGRES_URL='<target-url>' \
    bash scripts/migrate-postgres-neon-to-digitalocean.sh --confirm-maintenance

Options:
  --source-url <url>          Source Neon PostgreSQL URL. Defaults to NEON_URL.
  --target-url <url>          Target DigitalOcean PostgreSQL URL. Defaults to DO_POSTGRES_URL.
  --dump-file <path>          Existing dump to restore, or output path for new dump.
  --work-dir <path>           Directory for generated dumps. Default: .data/postgres-migration.
  --skip-dump                 Reuse --dump-file instead of running pg_dump.
  --skip-restore              Run preflight/count checks without restoring into target.
  --skip-prisma-checks        Skip prisma migrate deploy and prisma validate.
  --confirm-maintenance       Required. Confirms app/admin writes are frozen.
  -h, --help                  Show this help.

Notes:
  - URLs are not printed to avoid leaking credentials.
  - DigitalOcean Managed PostgreSQL target URLs must include sslmode=require.
  - Run during a maintenance window after stopping admin/editorial writes.
EOF
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but was not found in PATH."
}

read_arg_value() {
  local flag="$1"
  local value="${2:-}"
  [[ -n "$value" ]] || fail "${flag} requires a value."
  printf '%s' "$value"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-url)
      SOURCE_URL="$(read_arg_value "$1" "${2:-}")"
      shift 2
      ;;
    --target-url)
      TARGET_URL="$(read_arg_value "$1" "${2:-}")"
      shift 2
      ;;
    --dump-file)
      DUMP_FILE="$(read_arg_value "$1" "${2:-}")"
      shift 2
      ;;
    --work-dir)
      WORK_DIR="$(read_arg_value "$1" "${2:-}")"
      shift 2
      ;;
    --skip-dump)
      SKIP_DUMP="1"
      shift
      ;;
    --skip-restore)
      SKIP_RESTORE="1"
      shift
      ;;
    --skip-prisma-checks)
      SKIP_PRISMA_CHECKS="1"
      shift
      ;;
    --confirm-maintenance)
      CONFIRM_MAINTENANCE="1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
done

[[ "$CONFIRM_MAINTENANCE" == "1" ]] || fail "Refusing to run without --confirm-maintenance."
[[ -n "$SOURCE_URL" ]] || fail "Source URL is required via --source-url or NEON_URL."
[[ -n "$TARGET_URL" ]] || fail "Target URL is required via --target-url or DO_POSTGRES_URL."
[[ "$TARGET_URL" == postgresql://* || "$TARGET_URL" == postgres://* ]] || fail "Target URL must start with postgresql:// or postgres://."
[[ "$TARGET_URL" == *"sslmode=require"* ]] || fail "DigitalOcean target URL must include sslmode=require."

if [[ "$SKIP_DUMP" == "1" && -z "$DUMP_FILE" ]]; then
  fail "--skip-dump requires --dump-file."
fi

require_command pg_dump
require_command pg_restore
require_command psql
require_command npm

mkdir -p "$WORK_DIR"
if [[ -z "$DUMP_FILE" ]]; then
  DUMP_FILE="$WORK_DIR/neon-to-digitalocean-$(date -u +%Y%m%dT%H%M%SZ).dump"
fi

run_scalar_query() {
  local url="$1"
  local sql="$2"
  psql "$url" --no-psqlrc --tuples-only --no-align --quiet --command "$sql"
}

capture_counts() {
  local url="$1"
  local output_file="$2"
  psql "$url" --no-psqlrc --tuples-only --no-align --quiet <<'SQL' > "$output_file"
WITH table_list AS (
  SELECT table_schema, table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
)
SELECT table_name || '=' ||
       (xpath('/row/count/text()', query_to_xml(format('SELECT count(*) AS count FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text
FROM table_list
ORDER BY table_name;
SQL
}

echo "== PostgreSQL provider migration: Neon -> DigitalOcean =="
echo "Work dir: $WORK_DIR"
echo "Dump file: $DUMP_FILE"

echo "Checking source connectivity..."
run_scalar_query "$SOURCE_URL" "select now();" >/dev/null

echo "Checking target connectivity..."
run_scalar_query "$TARGET_URL" "select now();" >/dev/null

SOURCE_COUNTS_BEFORE="$WORK_DIR/source-counts-before.txt"
TARGET_COUNTS_AFTER="$WORK_DIR/target-counts-after.txt"

echo "Capturing source table counts..."
capture_counts "$SOURCE_URL" "$SOURCE_COUNTS_BEFORE"

if [[ "$SKIP_DUMP" == "0" ]]; then
  echo "Creating source dump..."
  pg_dump "$SOURCE_URL" \
    --format=custom \
    --no-owner \
    --no-acl \
    --file="$DUMP_FILE"
else
  [[ -f "$DUMP_FILE" ]] || fail "Dump file does not exist: $DUMP_FILE"
  echo "Reusing existing dump file."
fi

if [[ "$SKIP_RESTORE" == "0" ]]; then
  echo "Restoring dump into DigitalOcean target..."
  pg_restore \
    --dbname "$TARGET_URL" \
    --clean \
    --if-exists \
    --no-owner \
    --no-acl \
    --verbose \
    "$DUMP_FILE"
else
  echo "Skipping restore by request."
fi

echo "Capturing target table counts..."
capture_counts "$TARGET_URL" "$TARGET_COUNTS_AFTER"

echo "Comparing source and target counts..."
if diff -u "$SOURCE_COUNTS_BEFORE" "$TARGET_COUNTS_AFTER"; then
  echo "Table counts match."
else
  fail "Table counts differ. Review $SOURCE_COUNTS_BEFORE and $TARGET_COUNTS_AFTER before cutover."
fi

if [[ "$SKIP_PRISMA_CHECKS" == "0" ]]; then
  echo "Running Prisma checks against DigitalOcean target..."
  (
    cd "$BACKEND_DIR"
    POSTGRES_PRISMA_URL="$TARGET_URL" DATABASE_URL="$TARGET_URL" POSTGRES_DIRECT_URL="" DIRECT_URL="" npm run prisma:migrate:deploy
    POSTGRES_PRISMA_URL="$TARGET_URL" DATABASE_URL="$TARGET_URL" POSTGRES_DIRECT_URL="" DIRECT_URL="" npm run prisma:validate
  )
else
  echo "Skipping Prisma checks by request."
fi

echo "Migration copy completed. Update production .env to the DigitalOcean URL, then run deploy preflight and deploy."
