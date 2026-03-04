# API (apps/api)

This folder contains the Fastify backend.

Quick local setup and migrations (manual SQL)

```bash
# install deps
npm install

# run dev server
npm run dev
```

Note: Ensure `DATABASE_URL` is set in `apps/api/.env` (copy from `.env.example`).

Manual migrations
-----------------

This project uses manual SQL for migrations. Migrations are applied
via the SQL file located at `apps/api/supabase/migration_supabase.sql`.

Recommended ways to apply the SQL:

- Use the Supabase SQL editor: open your Supabase project → SQL editor → New query, paste the SQL and run.
- Or apply locally using `psql`:

```powershell
cd apps/api
$env:DATABASE_URL = "<your_database_url>"
psql "$env:DATABASE_URL" -f supabase/migration_supabase.sql
```

Or run the helper scripts which capture logs:

```powershell
.
\scripts\run_supabase_migration.ps1    # PowerShell helper (tries supabase then psql)
```

If you want CI to run migrations using the Supabase CLI, add `SUPABASE_PROJECT_REF`
and `SUPABASE_ACCESS_TOKEN` (or `SUPABASE_SERVICE_KEY`) to GitHub Secrets and use
the provided workflow `.github/workflows/supabase-migrate.yml`.
