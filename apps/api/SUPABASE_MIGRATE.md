## Applying migrations (manual via Supabase SQL editor)

The canonical migration file is `supabase/migration_supabase.sql` — update this file whenever you change the schema.

Apply the SQL only via the Supabase Dashboard → SQL editor:

1. Open your Supabase project in the dashboard.
2. Go to **SQL Editor** → **New Query**.
3. Open `apps/api/supabase/migration_supabase.sql` in your editor, copy its contents, and paste into the SQL editor.
4. Run the query and confirm there are no errors.

Notes:
- Always update and commit `apps/api/supabase/migration_supabase.sql` with any schema changes so the repo remains the single source of truth.
- Do not run migrations from CI, `psql`, or the Supabase CLI — all schema changes must be applied manually through the Supabase SQL editor to avoid connectivity and tooling discrepancies.
