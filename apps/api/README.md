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

Recommended way to apply the SQL:

- Use the Supabase SQL editor: open your Supabase project → SQL editor → New query → paste the SQL and run.

Important:

- Do not run migrations via `psql`, the Supabase CLI, or CI. Always apply schema changes manually in the Supabase SQL editor and update `apps/api/supabase/migration_supabase.sql` accordingly so the repository remains the single source of truth.
