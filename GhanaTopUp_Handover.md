# GhanaTopUp — Developer Handover Document

> **Airtime & Data Top-Up Platform for Ghana — MVP Build Guide**
>
> Version: 1.0 | Date: March 2026
> Stack: TypeScript · Fastify · Supabase · Railway · React Native + Expo
> APIs: Reloadly · MTN MoMo · Telecel Cash · AirtelTigo Money · Africa's Talking
> Tooling: SQL migrations · BullMQ · Upstash Redis · Zod · Docker · GitHub Copilot

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Full Technology Stack](#3-full-technology-stack)
4. [Recommended Project Structure](#4-recommended-project-structure)
5. [Database Schema](#5-database-schema)
6. [API Endpoint Reference](#6-api-endpoint-reference)
7. [External API Integration Guide](#7-external-api-integration-guide)
8. [Environment Variables](#8-environment-variables)
9. [Local Development Setup](#9-local-development-setup)
10. [GitHub Copilot Tips](#10-github-copilot-tips)
11. [Deployment Guide](#11-deployment-guide)
12. [Security Checklist](#12-security-checklist)
13. [MVP Development Milestones](#13-mvp-development-milestones)
14. [Key Resources & Links](#14-key-resources--links)

---

## 1. Project Overview

GhanaTopUp is a mobile-first platform that allows Ghanaians to purchase airtime and mobile data bundles for MTN, Telecel, and AirtelTigo — paying via Mobile Money (MoMo). The MVP is scoped to a React Native mobile app backed by a Fastify REST API.

### 1.1 Core User Stories

| # | As a user I want to… | So that… | Priority |
|---|---|---|---|
| US-01 | Register with my phone number + OTP | I can securely access the app | P0 |
| US-02 | Buy airtime for any GH network | I can top up quickly | P0 |
| US-03 | Buy a data bundle for any GH network | I can get internet access | P0 |
| US-04 | Pay via MTN MoMo / Telecel Cash / AT Money | I use my existing mobile wallet | P0 |
| US-05 | See my transaction history | I can track my spending | P0 |
| US-06 | Buy airtime/data for another number | I can gift friends and family | P1 |
| US-07 | Save beneficiary numbers | I can recharge favourites quickly | P1 |
| US-08 | Schedule recurring top-ups | My phone never runs out | P2 |
| US-09 | Earn and redeem loyalty points | I'm rewarded for using the app | P2 |

### 1.2 Networks Supported

| Network | Airtime | Data Bundles | Payment Collection | Delivery API |
|---|---|---|---|---|
| MTN Ghana | ✅ | ✅ | MTN MoMo API | Reloadly |
| Telecel (Vodafone) | ✅ | ✅ | Telecel Cash API | Reloadly |
| AirtelTigo | ✅ | ✅ | AirtelTigo Money API | Reloadly |

---

## 2. System Architecture

The architecture separates concerns into four layers: the mobile client, the API server, background workers, and third-party services. All communication between the app and backend is over HTTPS using JSON REST APIs authenticated with Supabase JWTs.

### 2.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   React Native + Expo App                       │
│         (TypeScript · Zustand · React Query · Expo Router)      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS / REST
┌───────────────────────────▼─────────────────────────────────────┐
│                 Fastify API Server (Railway)                     │
│   Routes → Controllers → Services → DB access layer               │
│   Zod validation · Supabase JWT auth · Webhook handlers         │
└──────┬──────────────────────────────────────────┬───────────────┘
       │                                          │
┌──────▼───────┐  ┌───────────────┐  ┌──────────▼──────────────┐
│  Supabase    │  │ Upstash Redis │  │  Third-Party APIs       │
│  PostgreSQL  │  │ (BullMQ Queue)│  │  Reloadly, MoMo,        │
│  Auth        │  │               │  │  Telecel, AT Money, SMS  │
└──────────────┘  └───────┬───────┘  └─────────────────────────┘
                          │
               ┌──────────▼──────────┐
               │  BullMQ Worker       │
               │  (Railway process)   │
               │  Top-up retries      │
               │  Scheduled jobs      │
               └─────────────────────┘
```

### 2.2 Request Lifecycle — Buy Data Bundle

| Step | Actor | Action | Technology |
|---|---|---|---|
| 1 | Mobile App | User selects bundle, taps Pay | React Native |
| 2 | Mobile App | POST /transactions/initiate with JWT | Axios + Supabase JWT |
| 3 | Fastify API | Validate request (Zod) + check auth | Zod + Supabase middleware |
| 4 | Fastify API | Call MoMo API → prompt payment on user phone | MTN MoMo SDK |
| 5 | User Phone | User approves payment on handset | MTN MoMo USSD |
| 6 | MoMo API | Webhook → POST /webhooks/momo/payment-success | Fastify webhook route |
| 7 | Fastify API | Enqueue top-up job in Redis queue | BullMQ producer |
| 8 | BullMQ Worker | Pick up job → call Reloadly API | BullMQ consumer |
| 9 | Reloadly | Deliver data bundle to user number | Reloadly REST API |
| 10 | BullMQ Worker | Update transaction status in DB | Manual SQL / DB client |
| 11 | Mobile App | Poll /transactions or receive push → show success | React Query |

---

## 3. Full Technology Stack

### 3.1 Backend

| Layer | Technology | Version | Why |
|---|---|---|---|
| Runtime | Node.js | 20 LTS | Fast, huge ecosystem, same language as frontend |
| Framework | Fastify | 4.x | Faster than Express, built-in schema, TypeScript-first |
| Language | TypeScript | 5.x | Type safety, dramatically improves Copilot suggestions |
| ORM | Manual SQL / optional DB client | N/A | Use SQL migrations and a typed DB client if desired |
| Validation | Zod | 3.x | Runtime schema validation, pairs well with TypeScript types and manual SQL schemas |
| Auth | Supabase Auth | 2.x | Phone OTP + JWT out of the box, zero auth boilerplate |
| Queue | BullMQ | 5.x | Redis-backed job queue for reliable top-up retry logic |
| Cache/Queue Store | Upstash Redis | Latest | Serverless Redis, free tier, just an API key |
| Testing | Vitest | 1.x | Fastest TypeScript test runner, Jest-compatible API |
| API Testing | Bruno | Latest | Like Postman but file-based, version-controllable |
| Linting | ESLint + Prettier | Latest | Code consistency, enforced in CI |

### 3.2 Database

| Service | Technology | Role |
|---|---|---|
| Supabase | PostgreSQL 15 | Primary datastore for all users, transactions, bundles |
| Supabase | Row Level Security (RLS) | Database-level access control per user |
| Supabase | Realtime | Live transaction status updates pushed to mobile app |
| Supabase | Auth | Phone OTP login, JWT session management |
| Upstash | Redis | BullMQ job queue store + API response caching |

### 3.3 Frontend (Mobile)

| Layer | Technology | Why |
|---|---|---|
| Framework | React Native + Expo SDK 51 | Single codebase for iOS & Android, same TS as backend |
| Navigation | Expo Router | File-based routing, familiar to Next.js users |
| State management | Zustand | Lightweight, simple, no boilerplate |
| Server state | React Query (TanStack) | Caching, background refetch, loading/error states |
| API client | Axios | Interceptors for JWT injection on every request |
| UI Components | React Native Paper | Material Design, accessible, production-ready |
| Forms | React Hook Form + Zod | Share Zod schemas between backend and frontend |
| Build & Deploy | Expo EAS Build | Cloud builds, OTA updates without app store resubmission |

### 3.4 Infrastructure & DevOps

| Service | Provider | Purpose | Est. Cost |
|---|---|---|---|
| API Server | Railway | Hosts Fastify API process 24/7 | ~$5/mo |
| BullMQ Worker | Railway | Separate background worker process | ~$3/mo |
| Database | Supabase | PostgreSQL + Auth + Realtime | Free → $25/mo |
| Redis | Upstash | Job queue + caching | Free → $10/mo |
| App builds | Expo EAS | iOS + Android builds, OTA updates | Free tier available |
| CI/CD | GitHub Actions | Run tests + deploy to Railway on push | Free |
| Secrets | Railway env vars | All API keys and credentials | Included |
| Future web | Vercel | Next.js admin dashboard (later phase) | Free tier available |

---

## 4. Recommended Project Structure

Use a monorepo to share TypeScript types (especially Zod schemas) between backend and mobile app.

### 4.1 Monorepo Layout

```
ghanatopup/
├── apps/
│   ├── api/              ← Fastify backend
│   └── mobile/           ← React Native + Expo app
├── packages/
│   └── shared/           ← Shared Zod schemas, TS types, constants
├── package.json          ← Workspace root (npm workspaces)
└── turbo.json            ← Turborepo build pipeline (optional)
```

### 4.2 Backend (apps/api) Structure

```
apps/api/
├── src/
│   ├── server.ts         ← Fastify app bootstrap
│   ├── config.ts         ← Env var validation (Zod)
│   ├── routes/           ← Route definitions
│   │   ├── auth.ts
│   │   ├── transactions.ts
│   │   ├── bundles.ts
│   │   └── webhooks.ts
│   ├── services/         ← Business logic
│   │   ├── reloadly.ts
│   │   ├── momo.ts
│   │   └── transactions.ts
│   ├── workers/          ← BullMQ job processors
│   │   └── topup.worker.ts
│   ├── queues/           ← BullMQ queue definitions
│   │   └── topup.queue.ts
│   ├── db/               ← DB client + helpers
│   │   └── client.ts
│   └── middleware/       ← Auth, error handler, logger
├── supabase/
│   ├── migration_supabase.sql     ← DB schema & seed (source of truth)
│   └── migrations/
├── tests/
├── Dockerfile
└── railway.toml          ← Railway deployment config
```

### 4.3 Mobile (apps/mobile) Structure

```
apps/mobile/
├── app/                  ← Expo Router pages (file-based)
│   ├── (auth)/           ← Login, OTP screens
│   ├── (tabs)/           ← Home, History, Profile
│   │   ├── index.tsx     ← Buy airtime/data screen
│   │   └── history.tsx   ← Transaction history
│   └── _layout.tsx
├── components/           ← Reusable UI components
├── hooks/                ← Custom React hooks
├── services/             ← API client (Axios instances)
├── stores/               ← Zustand state stores
└── app.json              ← Expo config
```

---

## 5. Database Schema

The SQL migration in `apps/api/supabase/migration_supabase.sql` is the source of truth for the database. Apply it manually via the Supabase Dashboard → SQL editor. Do not run migrations via `psql` or CI — always use the SQL editor and keep the SQL file updated with any schema changes.
### 5.1 `users`

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Supabase Auth UID — linked to auth.users |
| phone | VARCHAR(20) | E.164 format e.g. +233XXXXXXXXX |
| display_name | VARCHAR(100) | Optional display name |
| loyalty_points | INTEGER | Default 0 |
| created_at | TIMESTAMPTZ | Auto-set on insert |
| updated_at | TIMESTAMPTZ | Auto-updated |

### 5.2 `transactions`

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK) | References users.id |
| recipient_number | VARCHAR(20) | The number receiving airtime/data |
| network | ENUM | MTN \| TELECEL \| AIRTELTIGO |
| type | ENUM | AIRTIME \| DATA |
| bundle_id | VARCHAR(100) | Reloadly bundle ID (null for airtime) |
| amount_ghs | DECIMAL(10,2) | Amount in Ghana Cedis |
| payment_method | ENUM | MOMO \| TELECEL_CASH \| AT_MONEY |
| payment_ref | VARCHAR(200) | MoMo transaction reference |
| delivery_ref | VARCHAR(200) | Reloadly transaction ID |
| status | ENUM | INITIATED \| PAYMENT_PENDING \| PAYMENT_CONFIRMED \| DELIVERING \| COMPLETED \| FAILED |
| failure_reason | TEXT | Populated on failure |
| created_at | TIMESTAMPTZ | Auto-set on insert |
| completed_at | TIMESTAMPTZ | Null until completed |

### 5.3 `beneficiaries`

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK) | References users.id |
| name | VARCHAR(100) | Label e.g. 'Mum' |
| phone | VARCHAR(20) | E.164 format |
| network | ENUM | MTN \| TELECEL \| AIRTELTIGO |
| created_at | TIMESTAMPTZ | Auto-set on insert |

(See `apps/api/supabase/migration_supabase.sql` for the full DDL / seed statements.)

---

## 6. API Endpoint Reference

All endpoints are prefixed with `/api/v1`. Protected routes require a Supabase JWT in the `Authorization: Bearer <token>` header.

### 6.1 Auth Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /auth/request-otp | Public | Send OTP to phone number via Supabase Auth |
| POST | /auth/verify-otp | Public | Verify OTP, returns JWT + refresh token |
| POST | /auth/refresh | Public | Refresh JWT using refresh token |
| POST | /auth/logout | Protected | Invalidate session |

### 6.2 Bundles Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /bundles?network=MTN | Protected | Get available data bundles for a network (cached 1hr) |
| GET | /bundles/:id | Protected | Get a specific bundle's details |

### 6.3 Transaction Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /transactions/initiate | Protected | Initiate payment + queue top-up job |
| GET | /transactions | Protected | Get user's transaction history (paginated) |
| GET | /transactions/:id | Protected | Get single transaction status |

### 6.4 Webhook Endpoints (Internal)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /webhooks/momo/callback | HMAC sig | MTN MoMo payment confirmation callback |
| POST | /webhooks/telecel/callback | HMAC sig | Telecel Cash payment callback |
| POST | /webhooks/at-money/callback | HMAC sig | AirtelTigo Money payment callback |

### 6.5 Beneficiary Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /beneficiaries | Protected | List user's saved numbers |
| POST | /beneficiaries | Protected | Save a new beneficiary |
| DELETE | /beneficiaries/:id | Protected | Remove a saved number |

---

## 7. External API Integration Guide

### 7.1 Reloadly (Airtime & Data Delivery)

| Item | Detail |
|---|---|
| Docs | https://developers.reloadly.com |
| Sign up | https://www.reloadly.com — free sandbox available immediately |
| Auth | OAuth2 client credentials — POST to `/oauth/token` to get Bearer token (cache it, expires in 1hr) |
| Airtime endpoint | `POST /topups` — body: `{operatorId, amount, recipientPhone, senderPhone}` |
| Data endpoint | `POST /topups/bundles` — body: `{operatorId, bundleId, recipientPhone}` |
| Get bundles | `GET /operators/{id}/bundles` — returns all data plans for a network |
| Sandbox | Use `sandbox.reloadly.com` base URL for testing — no real money charged |
| Webhooks | Configure success/failure webhooks in the Reloadly dashboard |

### 7.2 MTN MoMo API (Payment Collection)

| Item | Detail |
|---|---|
| Docs | https://momodeveloper.mtn.com |
| Products needed | Collections API — to request payment from a customer |
| Sandbox setup | Register at momodeveloper.mtn.com → Create app → Get subscription key |
| Auth flow | `POST /collection/token/` with Basic Auth (user:apikey) → returns access_token |
| Request payment | `POST /collection/v1_0/requesttopay` — body: `{amount, currency, externalId, payer}` |
| Check status | `GET /collection/v1_0/requesttopay/{referenceId}` |
| Webhook | Set `X-Callback-Url` header on the requesttopay call |
| Ghana currency | Use `GHS` as currency code |

### 7.3 Africa's Talking (SMS + Airtime Fallback)

| Item | Detail |
|---|---|
| Docs | https://developers.africastalking.com |
| Use in this app | SMS OTP delivery (backup to Supabase Auth), airtime API fallback |
| Auth | API key in header: `apiKey: {your_key}` |
| Send SMS | `POST /version1/messaging` — body: `{username, to, message}` |
| Sandbox | Use sandbox environment; test numbers like +254700000000 |

---

## 8. Environment Variables

Create a `.env` file in `apps/api/`. **Never commit this to Git** — it is in `.gitignore`. Add all secrets to Railway's environment variables dashboard for production.

> **Tip:** Create a `.env.example` file with all keys but no values — commit this to the repo as documentation.

### 8.1 Required Variables

| Variable | Description | Where to get it |
|---|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string | Supabase dashboard → Settings → Database |
| `DIRECT_URL` | Direct DB URL (for CLI migrations) | Supabase dashboard → Settings → Database |
| `SUPABASE_URL` | Your Supabase project URL | Supabase dashboard → Settings → API |
| `SUPABASE_SERVICE_KEY` | Service role key (full DB access) | Supabase dashboard → Settings → API |
| `RELOADLY_CLIENT_ID` | Reloadly OAuth client ID | Reloadly developer dashboard |
| `RELOADLY_CLIENT_SECRET` | Reloadly OAuth client secret | Reloadly developer dashboard |
| `RELOADLY_ENV` | `sandbox` or `production` | Set to `sandbox` for development |
| `MTN_MOMO_SUBSCRIPTION_KEY` | Primary subscription key | MTN MoMo developer portal |
| `MTN_MOMO_API_USER` | API user UUID | Generated via MoMo sandbox setup |
| `MTN_MOMO_API_KEY` | API key for auth | Generated via MoMo sandbox setup |
| `MTN_MOMO_ENV` | `sandbox` or `production` | Set to `sandbox` for development |
| `UPSTASH_REDIS_URL` | Redis connection URL | Upstash dashboard |
| `UPSTASH_REDIS_TOKEN` | Redis auth token | Upstash dashboard |
| `WEBHOOK_SECRET` | HMAC secret for webhook signature validation | Generate a random 32-byte hex string |
| `PORT` | API server port | Default: 3000 |
| `NODE_ENV` | `development` or `production` | Set automatically by Railway |
| `AT_API_KEY` | Africa's Talking API key | AT developer dashboard |
| `AT_USERNAME` | Africa's Talking username | AT developer dashboard |

---

## 9. Local Development Setup

### 9.1 Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org or use `nvm` |
| npm | 10+ | Comes with Node.js |
| Docker Desktop | Latest | https://docker.com — for local Redis |
| Git | Latest | https://git-scm.com |
| VS Code | Latest | https://code.visualstudio.com |
| GitHub Copilot | Latest | VS Code extension marketplace |
| Bruno | Latest | https://usebruno.com — API testing |
| Expo Go app | Latest | Install on your Android/iOS test device |

### 9.2 Step-by-Step First-Time Setup

1. Clone the repository: `git clone https://github.com/your-org/ghanatopup.git`
2. Install dependencies: `cd ghanatopup && npm install` (installs all workspaces)
3. Copy environment file: `cp apps/api/.env.example apps/api/.env` and fill in your keys
4. Start local Redis: `docker compose up -d` (uses `docker-compose.yml` in repo root)
5. Apply database schema: run the SQL migration at `apps/api/supabase/migration_supabase.sql` via the Supabase Dashboard → SQL editor (always apply schema changes manually in the dashboard and update the SQL file in the repo).
6. (Optional) Seed data is included in the same SQL file — no separate seed step required.
8. Start the API server: `npm run dev` (runs on http://localhost:3000)
9. Start the BullMQ worker: `npm run worker` (in a separate terminal)
10. Start the mobile app: `cd apps/mobile && npx expo start`
11. Scan the QR code with Expo Go on your phone — app is live

### 9.3 Docker Compose (for local Redis)

Create `docker-compose.yml` in the repo root:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### 9.4 Recommended VS Code Extensions

| Extension | Purpose |
|---|---|
| GitHub Copilot | AI code completion — core tool for this project |
| GitHub Copilot Chat | Chat interface for Copilot — great for explaining code |
| SQL | Syntax highlighting and formatting for SQL files |
| ESLint | Real-time linting feedback |
| Prettier | Auto-format on save |
| Bruno | Test API endpoints without leaving VS Code |
| Thunder Client | Alternative lightweight API client in VS Code |
| GitLens | Enhanced Git history and blame annotations |
| Error Lens | Inline error messages in the editor |
| DotENV | Syntax highlighting for `.env` files |

---

## 10. GitHub Copilot Tips

### 10.1 Why This Stack Works So Well With Copilot

-- **Manual SQL migrations** with the Supabase SQL editor provide an explicit, auditable DDL source that integrates with Supabase's tools and CI flows.
- **Zod schemas** shared between frontend and backend give Copilot full context of your data shapes
- **Fastify's route schema declarations** tell Copilot exactly what the request and response look like
- **TypeScript throughout** means Copilot has type context everywhere — far better suggestions than plain JS

### 10.2 Practical Tips

- Always write a JSDoc comment above a function before letting Copilot complete it — the comment is your instruction
- Type the function signature first, then pause — Copilot will often suggest the full implementation
- In Copilot Chat (`Ctrl+Shift+I`), say "using the DB schema I have, write a service to..." for contextual suggestions
- Use `@workspace` in Copilot Chat to give it context about your entire project structure
- When writing tests, write the `describe()` and `it()` strings first — Copilot will fill in the test logic
- For repetitive patterns (e.g. writing a new API route), complete one fully then Copilot learns the pattern for the next

### 10.3 Effective Comment Patterns for Copilot

```typescript
// Zod schema for POST /transactions/initiate request body
// Returns paginated list of transactions for the authenticated user
// BullMQ job processor: retries failed Reloadly top-up up to 3 times
// Validates MTN MoMo webhook HMAC signature before processing
```

---

## 11. Deployment Guide

### 11.1 Deploy Backend to Railway

1. Sign up at [railway.app](https://railway.app) with your GitHub account
2. Create a New Project → Deploy from GitHub repo → select your repo
3. Railway auto-detects Node.js and builds from `apps/api/`
4. Add a `railway.toml` to `apps/api/` to specify build and start commands
5. Add all environment variables from Section 8 in the Railway Variables tab
6. Add a second service (New Service → same repo) for the BullMQ worker with start command: `node dist/workers/topup.worker.js`
7. Railway gives you a URL like `https://ghanatopup-api.up.railway.app` — use this in your mobile app config

### 11.2 railway.toml Configuration

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
```

### 11.3 CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm test
      - uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: ghanatopup-api
```

### 11.4 Deploy Mobile App with Expo EAS

1. Install EAS CLI: `npm install -g eas-cli`
2. Log in: `eas login`
3. Configure: `eas build:configure` (creates `eas.json`)
4. Build for Android: `eas build --platform android`
5. Build for iOS: `eas build --platform ios` (requires Apple Developer account)
6. OTA updates (no app store required for JS changes): `eas update --branch main`

---

## 12. Security Checklist

Complete all of these before switching to production API keys.

- ✅ Enable Row Level Security (RLS) on all Supabase tables — users can only read their own data
- ✅ Validate webhook signatures (HMAC-SHA256) on all MoMo/Telecel/AT callbacks before processing
- ✅ Rotate all sandbox API keys before switching to production keys
- ✅ Never log full card/payment details — only log transaction IDs
- ✅ Rate limit OTP requests (max 3 per phone number per 10 minutes) using Redis
- ✅ Rate limit all API endpoints using `fastify-rate-limit`
- ✅ Validate and sanitize all phone numbers to E.164 format before processing
- ✅ Use HTTPS everywhere — Railway provides this automatically
- ✅ Store zero sensitive data in the mobile app — only the Supabase JWT
- ✅ Implement idempotency keys on transaction creation to prevent double charges

---

## 13. MVP Development Milestones

| Phase | Milestone | Key Deliverables | Est. Duration |
|---|---|---|---|
| 1 | Project Foundation | Monorepo setup, TypeScript config, DB schema, DB migrations, Docker compose, env vars | 3–4 days |
| 2 | Auth | Supabase Auth integration, Phone OTP login flow in API, JWT middleware, Login screen in app | 3–4 days |
| 3 | Payment Integration | MTN MoMo Collections API, Telecel Cash, AT Money, Webhook handlers, HMAC validation | 5–7 days |
| 4 | Top-Up Delivery | Reloadly integration, BullMQ queue + worker, retry logic, bundle listing endpoint | 4–5 days |
| 5 | Mobile App Core | Home screen, network selection, bundle picker, checkout flow, transaction history | 7–10 days |
| 6 | Polish & Testing | Error states, loading states, Vitest unit tests, end-to-end sandbox testing, security review | 4–5 days |
| 7 | Deployment | Railway deploy, Expo EAS build, CI/CD pipeline, production API keys | 2–3 days |

> **Total estimated MVP build time: 4–6 weeks for a focused solo developer.**
> Always complete Phases 1–4 (backend) before building the mobile UI.
> Always test with sandbox credentials before switching to live production API keys.

---

## 14. Key Resources & Links

| Resource | URL |
|---|---|
| Reloadly Docs | https://developers.reloadly.com |
| MTN MoMo Developer Portal | https://momodeveloper.mtn.com |
| Africa's Talking Docs | https://developers.africastalking.com |
| Supabase Docs | https://supabase.com/docs |
| Postgres / SQL Docs | https://www.postgresql.org/docs/ |
| Fastify Docs | https://fastify.dev/docs |
| BullMQ Docs | https://docs.bullmq.io |
| Upstash Redis | https://upstash.com |
| Railway Docs | https://docs.railway.app |
| Expo EAS | https://docs.expo.dev/eas |
| Zod Docs | https://zod.dev |
| React Query Docs | https://tanstack.com/query |
| GitHub Copilot Docs | https://docs.github.com/en/copilot |

---

*GhanaTopUp MVP — Internal Use Only*
