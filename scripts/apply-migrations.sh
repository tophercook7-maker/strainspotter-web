#!/bin/bash
# scripts/apply-migrations.sh
#
# Applies any pending hand-rolled SQL migrations in migrations/ to the
# linked Supabase prod database via the Management API. Uses the
# public._meta_migrations table (see 2026_05_31_meta_migrations_tracking.sql)
# to skip already-applied files.
#
# Auth: reads the Supabase CLI access token from macOS keychain. Run
# `supabase login` once first.
#
# Usage:
#   scripts/apply-migrations.sh                   # apply everything pending
#   scripts/apply-migrations.sh --dry-run         # show what would run
#   scripts/apply-migrations.sh <file>            # apply ONLY this file
#
# Idempotent. Safe to re-run.

set -euo pipefail

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PROJECT_REF="rdqpxixsbqcsyfewcmbz"
API="https://api.supabase.com/v1/projects/$PROJECT_REF/database/query"

TOKEN=$(security find-generic-password -s "Supabase CLI" -w 2>/dev/null \
  | sed 's/^go-keyring-base64://' | base64 -d) \
  || { echo "✗ Couldn't read Supabase CLI access token. Run 'supabase login'."; exit 1; }

DRY_RUN=false
ONLY_FILE=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --help|-h)
      grep '^# ' "$0" | sed 's/^# //'
      exit 0
      ;;
    *) ONLY_FILE="$arg" ;;
  esac
done

if [[ -n "$ONLY_FILE" ]]; then
  MIGRATIONS=("$ONLY_FILE")
else
  # macOS ships bash 3.2 — no mapfile. Use a portable while-read loop.
  MIGRATIONS=()
  while IFS= read -r f; do
    MIGRATIONS+=("$f")
  done < <(cd "$REPO_ROOT" && ls -1 migrations/*.sql | sort)
fi

post_sql() {
  local sql="$1"
  local payload
  payload=$(jq -nc --arg q "$sql" '{"query": $q}')
  curl -sS -w "\nHTTP_STATUS:%{http_code}" -X POST "$API" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

is_applied() {
  local filename="$1"
  local q="SELECT 1 FROM public._meta_migrations WHERE filename = '$filename';"
  local resp
  resp=$(post_sql "$q" | sed '$d')
  [[ "$resp" == "[{\"?column?\":1}]" ]]
}

record_applied() {
  local filename="$1"
  local q="INSERT INTO public._meta_migrations (filename) VALUES ('$filename') ON CONFLICT (filename) DO NOTHING;"
  post_sql "$q" >/dev/null
}

echo "Repo:     $REPO_ROOT"
echo "Project:  $PROJECT_REF"
echo "Dry-run:  $DRY_RUN"
echo "Files:    ${#MIGRATIONS[@]}"

for mig in "${MIGRATIONS[@]}"; do
  filename=$(basename "$mig")
  echo ""
  echo "▶ $filename"

  if is_applied "$filename"; then
    echo "  ⤳ already applied — skipping"
    continue
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  ⤳ would apply (dry-run)"
    continue
  fi

  # Collapse multi-line COMMENT IS 'a' || 'b' into single literals,
  # because the Management API rejects expression-style comments even
  # though psql / SQL editor accept them.
  sql=$(perl -0pe "s/'\s*\|\|\s*'/ /g" "$REPO_ROOT/$mig")
  resp=$(post_sql "$sql")
  status=$(echo "$resp" | grep "^HTTP_STATUS:" | sed 's/HTTP_STATUS://')
  body=$(echo "$resp" | sed '$d')

  if [[ "$status" == "201" || "$status" == "200" ]]; then
    echo "  ✓ applied (HTTP $status)"
    record_applied "$filename"
  else
    echo "  ✗ FAILED (HTTP $status)"
    echo "  $body"
    exit 1
  fi
done

echo ""
echo "Done."
