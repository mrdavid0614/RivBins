# RivBins — Smart Cycle Count Scoring

A small app that helps warehouse teams decide **which bins to audit first**. Every bin gets
a **risk score (0–100)** based on its activity and audit history. The scores drive a
color-coded heatmap, Top-N audit plans, and a mobile count flow. Count results feed back
into the next scoring run.

**Stack:** Next.js 16 · NestJS 12 · Prisma 7 · PostgreSQL 17 · TypeScript · pnpm workspaces

## Prerequisites

- **Node.js 24 LTS** (`>=24.15`). With nvm: `nvm install` (reads `.nvmrc`).
- **pnpm 10**, pinned in `package.json`. Run `corepack enable` once and the right version
  is used automatically.
- **Docker** for PostgreSQL.

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Create local env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Start PostgreSQL, apply the migrations, and load the demo data
pnpm db:up
pnpm db:migrate
pnpm db:seed

# 4. Run the API and the web app
pnpm dev
```

| Service    | URL                          |
|------------|------------------------------|
| Web app    | http://localhost:3000        |
| API        | http://localhost:3001        |
| API health | http://localhost:3001/health |
| PostgreSQL | `localhost:5432` (user/password/db: `rivbins`) |

## Scripts (from the repo root)

| Script            | What it does                                            |
|-------------------|---------------------------------------------------------|
| `pnpm dev`        | Builds the shared types, then runs API and web in watch mode |
| `pnpm build`      | Builds every package                                    |
| `pnpm typecheck`  | Type-checks every package                               |
| `pnpm lint`       | Lints every package (oxlint for the API, ESLint for web) |
| `pnpm test`       | Runs unit tests                                         |
| `pnpm db:up`      | Starts PostgreSQL in Docker                             |
| `pnpm db:down`    | Stops PostgreSQL                                        |
| `pnpm db:migrate` | Applies Prisma migrations (and creates new ones in development) |
| `pnpm db:seed`    | **Wipes the database** and loads the demo data (see below) |

API end-to-end tests need the database: `pnpm --filter @rivbins/api test:e2e`.

## Seed data

`pnpm db:seed` empties every table and loads a demo warehouse. It can be rerun at any time.

- **Layout:** one warehouse, 3 aisles (A–C) × 2 racks × 2 levels × 3 positions = **36 bins**,
  coded `A-01-01` to `C-02-06`.
- **Inventory:** 20 products on multi-product pallets.
- **History:** the **last 30 days** of activity (putaways, picks, moves, and manual
  adjustments), simulated day by day so quantities and pallet locations always add up.
  Each bin has a risk profile (quiet, medium, or busy), so activity is deliberately uneven.
- **Past audits:** some bins were counted recently and passed, some passed a while ago,
  and some busy bins failed twice. Failed counts corrected inventory with audit-generated
  adjustments. The remaining bins have never been audited.

The data is deterministic: dates are relative to the moment you seed, and the same random
seed (`DEFAULT_SEED` in `apps/api/prisma/seed/generate.ts`) always produces the same data.

## Project structure

```
apps/
  api/         NestJS API — the only app that touches the database
    prisma/    schema.prisma, migrations, seed
  web/         Next.js app (App Router, Tailwind CSS)
packages/
  shared/      API contract types shared by both apps
```

## Scoring

_Documented here once the scoring service is implemented: factors, thresholds, weights,
and how they are combined._

## Project docs

- [`CLAUDE.md`](CLAUDE.md): business rules, scoring model, and conventions.
- [`DECISIONS.md`](DECISIONS.md): log of every product and technical decision.
