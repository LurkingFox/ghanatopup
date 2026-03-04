## Running Supabase SQL migration locally

This project includes a SQL migration at `supabase/migration_supabase.sql`.

Scripts:

- PowerShell (Windows): `scripts/run_supabase_migration.ps1`
- Bash (Linux/macOS): `scripts/run_supabase_migration.sh`

Prerequisites:
- `supabase` CLI installed and authenticated (optional; fallback to `psql` is available)
- `psql` (Postgres client) available if you prefer fallback
- `DATABASE_URL` environment variable set (or configured in your environment)

Run (PowerShell):
```powershell
cd apps/api
Set-Item -Path Env:DATABASE_URL -Value "<your_database_url>"
.\scripts\run_supabase_migration.ps1
```

Run (bash):
```bash
cd apps/api
export DATABASE_URL="<your_database_url>"
./scripts/run_supabase_migration.sh
```

Logs are written to `apps/api/logs/supabase-migrate-<timestamp>.log`.

Notes on Supabase CLI vs `psql`:

- The `supabase db query --file` flag you tried is not supported by your CLI version (the CLI surfaces `db push`, `db diff`, `db dump`, etc.).
- Two reliable options to run the SQL:

1) Use `psql` (recommended, already provided):

```bash
# direct apply
psql "$DATABASE_URL" -f supabase/migration_supabase.sql
```

2) Use Supabase CLI with a migrations folder (preferred if you want to track migrations):

```bash
# create a migration folder expected by the CLI
mkdir -p supabase/migrations/0001_init
cp supabase/migration_supabase.sql supabase/migrations/0001_init/up.sql

# then push migrations to remote (you may need SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF)
supabase db push --project-ref "$SUPABASE_PROJECT_REF"
```

If you want me to add a workflow that uses the Supabase CLI `db push`, I can add it but you'll need to provide these GitHub secrets:

- `SUPABASE_ACCESS_TOKEN` or `SUPABASE_SERVICE_KEY` (Service Role key)
- `SUPABASE_PROJECT_REF`

Otherwise, continue using the `psql` script which works without the Supabase-specific CLI features.
