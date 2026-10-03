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

# 3. Start PostgreSQL and apply the migrations
pnpm db:up
pnpm db:migrate

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

API end-to-end tests need the database: `pnpm --filter @rivbins/api test:e2e`.

## Project structure

```
apps/
  api/         NestJS API — the only app that touches the database
    prisma/    schema.prisma, migrations
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
