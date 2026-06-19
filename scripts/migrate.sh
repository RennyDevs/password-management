#!/usr/bin/env bash
# ============================================================================
# migrate.sh — Apply database migrations in order
#
# Usage:
#   ./scripts/migrate.sh              # Show help
#   ./scripts/migrate.sh list         # List available migrations
#   ./scripts/migrate.sh apply <n>    # Apply migration 0000N
#   ./scripts/migrate.sh apply:all    # Apply all pending migrations
#
# Dependencies:
#   - psql (PostgreSQL client)
#   - Supabase connection string in .env or $SUPABASE_DB_URL
# ============================================================================

set -euo pipefail

MIGRATIONS_DIR="supabase/migrations"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ---- Helpers ----

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Load DB URL from .env if present
load_db_url() {
  local env_file="${SCRIPT_DIR}/../.env"
  if [[ -f "$env_file" ]]; then
    # shellcheck disable=SC1090
    source "$env_file"
  fi
}

get_db_url() {
  load_db_url
  if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
    error "SUPABASE_DB_URL is not set."
    echo "  Either set it as an environment variable or add it to .env:"
    echo "    SUPABASE_DB_URL=postgresql://..."
    exit 1
  fi
  echo "$SUPABASE_DB_URL"
}

list_migrations() {
  if [[ ! -d "$MIGRATIONS_DIR" ]]; then
    error "Migrations directory '$MIGRATIONS_DIR' not found."
    exit 1
  fi

  local files
  files=$(find "$MIGRATIONS_DIR" -name '*.sql' | sort)

  if [[ -z "$files" ]]; then
    warn "No migration files found in $MIGRATIONS_DIR"
    exit 0
  fi

  echo "Available migrations:"
  echo ""
  printf "  %-30s %s\n" "FILE" "STATUS"
  printf "  %-30s %s\n" "----" "------"
  while IFS= read -r file; do
    local name
    name=$(basename "$file")
    local applied="?"
    if command -v psql &> /dev/null; then
      local db_url
      db_url=$(get_db_url 2>/dev/null || true)
      if [[ -n "${db_url:-}" ]]; then
        local exists
        exists=$(psql "$db_url" -AtX -c "
          SELECT EXISTS (
            SELECT 1 FROM public.schema_migrations WHERE filename = '$name'
          );
        " 2>/dev/null || echo "false")
        if [[ "$exists" == "t" ]]; then
          applied="${GREEN}✔ applied${NC}"
        else
          applied="${YELLOW}✗ pending${NC}"
        fi
      fi
    fi
    printf "  %-30s %b\n" "$name" "$applied"
  done <<< "$files"
}

apply_migration() {
  local file="$1"
  local name
  name=$(basename "$file")

  if [[ ! -f "$file" ]]; then
    error "Migration file '$file' not found."
    exit 1
  fi

  local db_url
  db_url=$(get_db_url)

  info "Applying migration: $name"

  # Ensure schema_migrations table exists
  psql "$db_url" -AtX -c "
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      checksum TEXT NOT NULL DEFAULT ''
    );
  " > /dev/null

  # Check if already applied
  local already_applied
  already_applied=$(psql "$db_url" -AtX -c "
    SELECT EXISTS (
      SELECT 1 FROM public.schema_migrations WHERE filename = '$name'
    );
  ")

  if [[ "$already_applied" == "t" ]]; then
    warn "Migration '$name' was already applied. Skipping."
    return 0
  fi

  # Compute checksum
  local checksum
  checksum=$(sha256sum "$file" | cut -d' ' -f1)

  # Execute migration inside a transaction
  psql "$db_url" -v ON_ERROR_STOP=1 -1 -f "$file" > /dev/null

  # Record the migration
  psql "$db_url" -AtX -c "
    INSERT INTO public.schema_migrations (filename, checksum)
    VALUES ('$name', '$checksum');
  " > /dev/null

  info "Migration '$name' applied successfully (checksum: ${checksum:0:12}...)."
}

apply_all_pending() {
  if [[ ! -d "$MIGRATIONS_DIR" ]]; then
    error "Migrations directory '$MIGRATIONS_DIR' not found."
    exit 1
  fi

  local files
  files=$(find "$MIGRATIONS_DIR" -name '*.sql' | sort)

  if [[ -z "$files" ]]; then
    warn "No migration files found in $MIGRATIONS_DIR"
    exit 0
  fi

  while IFS= read -r file; do
    apply_migration "$file"
  done <<< "$files"
}

# ---- Main ----

case "${1:-help}" in
  list)
    list_migrations
    ;;
  apply)
    if [[ -z "${2:-}" ]]; then
      error "Usage: $0 apply <migration-number>"
      echo "  Example: $0 apply 00001"
      exit 1
    fi
    local pattern="$2"
    # If it looks like a number, pad to 5 digits
    if [[ "$pattern" =~ ^[0-9]+$ ]]; then
      pattern=$(printf "%05d" "$pattern")
    fi
    local file
    file=$(find "$MIGRATIONS_DIR" -name "${pattern}*.sql" | sort | head -1)
    if [[ -z "$file" ]]; then
      error "No migration found matching '$2'."
      exit 1
    fi
    apply_migration "$file"
    ;;
  apply:all)
    apply_all_pending
    ;;
  *)
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  list            List available migrations with status"
    echo "  apply <n|file>  Apply a specific migration (number or partial filename)"
    echo "  apply:all       Apply all pending migrations"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 apply 1"
    echo "  $0 apply 00001"
    echo "  $0 apply:all"
    ;;
esac
