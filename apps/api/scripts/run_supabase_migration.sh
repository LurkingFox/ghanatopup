#!/usr/bin/env bash
set -euo pipefail

timestamp=$(date +"%Y%m%d-%H%M%S")
logdir="$(dirname "$0")/../logs"
mkdir -p "$logdir"
logfile="$logdir/supabase-migrate-$timestamp.log"

sqlfile="$(dirname "$0")/../supabase/migration_supabase.sql"
if [ ! -f "$sqlfile" ]; then
  echo "Migration file not found: $sqlfile" | tee "$logfile"
  exit 2
fi

echo "Starting Supabase migration: $(date)" | tee "$logfile"
echo "Using DATABASE_URL: ${DATABASE_URL:-<not-set>}" | tee -a "$logfile"

echo "Running: supabase db query --file $sqlfile" | tee -a "$logfile"
if command -v supabase >/dev/null 2>&1; then
  supabase db query --file "$sqlfile" 2>&1 | tee -a "$logfile" || true
else
  echo "supabase CLI not found, skipping" | tee -a "$logfile"
fi

echo "Attempting psql fallback" | tee -a "$logfile"
if command -v psql >/dev/null 2>&1; then
  psql "$DATABASE_URL" -f "$sqlfile" 2>&1 | tee -a "$logfile" || true
else
  echo "psql not found, skipping" | tee -a "$logfile"
fi

echo "Migration finished: $(date)" | tee -a "$logfile"
echo "Logs written to: $logfile"
