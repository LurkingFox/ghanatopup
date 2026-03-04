# API (apps/api)

This folder contains the Fastify backend.

Quick Prisma commands (run in `apps/api`):

```bash
# install deps
npm install

# generate Prisma client
npx prisma generate

# create a migration and apply to the database (interactive)
npx prisma migrate dev --name init

# seed the database
npx ts-node prisma/seed.ts

# run dev server
npm run dev
```

Note: Ensure `DATABASE_URL` is set in `.env` (copy from `.env.example`).

Using Supabase direct connection only
-----------------------------------

If Supabase provides only a single direct connection string, set both
`DATABASE_URL` and `DIRECT_URL` to that value in your `apps/api/.env`. On
PowerShell you can do:

```powershell
$env:DATABASE_URL = 'postgresql://postgres:YOUR_PASS@db.host.supabase.co:5432/postgres?sslmode=require'
$env:DIRECT_URL = $env:DATABASE_URL
npx prisma migrate dev --name init
npx prisma generate
npx ts-node prisma/seed.ts
```

This ensures Prisma Migrate uses the same direct connection when only one
connection string is available.

Run migrations from GitHub Actions
---------------------------------

If your machine cannot reach Supabase on port `5432` (common behind home/corp
firewalls), you can run migrations from GitHub Actions. Create the following
GitHub repository secrets: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`,
`SUPABASE_SERVICE_KEY`, and `WEBHOOK_SECRET` (and other API keys as needed).

Then trigger the `Prisma Migrate (CI)` workflow (`.github/workflows/prisma-migrate.yml`) via the Actions tab. The workflow will:

- Install dependencies
- Run `npx prisma migrate dev --name init --create-only` to generate migration files
- Run `npx prisma migrate deploy` to apply them to your Supabase database
- Run `npx ts-node prisma/seed.ts` if `prisma/seed.ts` exists

This approach runs migrations from GitHub's runners which typically have outbound
access to Supabase Postgres.
