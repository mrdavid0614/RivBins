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
| `pnpm db:seed`    | **Wipes the database**, loads the demo data, and scores every bin (see below) |

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

Every bin gets a **risk score from 0 to 100**: the higher the score, the more likely the
bin's inventory is wrong, and the sooner it should be counted. The scores depend only on
each bin's own data, so a single bin can be rescored on its own.

### Factors

Each factor's raw value is normalized to 0–1 against a **fixed threshold**:
`normalized = min(raw / threshold, 1)`. "Since last audit" means movements after the
bin's last count, because earlier ones were verified by it. A never-audited bin uses its
whole history.

| # | Factor | Raw value | Threshold | Weight |
|---|--------|-----------|-----------|--------|
| 1 | Time since last audit | Days since the last count (fractional). Never audited = 30 | 30 days | 0.25 |
| 2 | Activity since last audit | `PICK` + `PUTAWAY` + `MOVE` (in or out) movements | 60 movements | 0.20 |
| 3 | Manual adjustments since last audit | `ADJUSTMENT`s not created by an audit | 5 | 0.15 |
| 4 | Audit failure history | Counts with a final result of FAIL in the last 90 days (not reset by a count) | 2 failures | 0.15 |
| 5 | Last discrepancy size | `Σ\|counted − expected\| / Σ expected` of the last count, ignoring any override. Never audited = 0 | 0.20 (20%) | 0.15 |
| 6 | SKU mix | Distinct products with stock in the bin | 6 SKUs | 0.10 |

SKU mix is normalized as `min((skus − 1) / (6 − 1), 1)`, so a single-SKU or empty bin
scores 0.

### Combination

```
score = round( Σ normalized_i × weight_i × 100 )
```

The weights sum to 1, so a bin with every factor at its threshold scores 100. Each
factor's **points** (`normalized × weight × 100`) show how much it adds to the score.

All thresholds and weights live in
[`apps/api/src/scoring/scoring.config.ts`](apps/api/src/scoring/scoring.config.ts). The
calculator (`scoring.calculator.ts`) is a pure function with unit tests.

### History and recompute

Scores are an **append-only history**: every computation inserts a new row with the
score, the full factor breakdown (raw value, threshold, normalized value, weight, and
points), and what triggered it. The bin then points at its newest row. Because each row
keeps the thresholds and weights it used, old scores stay explainable after a config
change.

| Trigger | When |
|---------|------|
| `SEED` | `pnpm db:seed` scores every bin |
| `MANUAL_RECOMPUTE` | `POST /scoring/recompute` (the "Recompute scores" button) scores every bin |
| `AUDIT` | Saving a count rescores only that bin |

A count resets factors 1–3. A passed count also brings factor 5 to about 0, so the score
drops sharply. A failed count raises factor 4, and factor 5 shows how far off it was, so
the bin stays risky.

## Heatmap dashboard

The home page (`http://localhost:3000`) shows every bin grouped by aisle and rack, one
grid per rack (top shelf first). Bins are colored by their current score:

| Band | Score |
|------|-------|
| Green (low risk) | 0–39 |
| Yellow (medium risk) | 40–69 |
| Red (high risk) | 70–100 |
| Gray | not scored yet |

Click a bin to open its detail drawer (`/?bin=A-01-03`, shareable). It shows the current
score with the per-factor breakdown, the score history with the trigger of each change,
the last audit date, and the pallets in the bin with their product lines. "Recompute
scores" rescores every bin and refreshes the heatmap. A blue dot marks bins with a
pending audit task.

## Audit plans and tasks

The tasks page (`http://localhost:3000/tasks`) generates audit plans. Enter **N** and
"Generate audit plan" creates a plan with the N riskiest bins by current score (ties by
bin code), skipping bins that already have a `PENDING` task. Only scored bins without a
pending task are eligible, and N must be between 1 and the number of eligible bins; with
none eligible, no plan is created. Existing pending tasks are never changed: a task
becomes `DONE` when its bin is counted.

The tasks table shows each task's plan, rank, bin, score when the plan was created,
current score, status, and dates. Filter it by status (`/tasks?status=pending`) or by
plan (`/tasks?plan=3`).

## API

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/health` | API and database status |
| `GET` | `/warehouse/layout` | Aisles → racks → bins with each bin's current score and pending task |
| `GET` | `/bins/:code` | Bin detail: location, last audit, current score with breakdown, pallets (404 if unknown) |
| `GET` | `/bins/:code/scores?limit=20` | Score history, newest first (`limit` 1–100, default 20) |
| `POST` | `/scoring/recompute` | Rescores every bin; returns `{ trigger, binsRecomputed, computedAt }` |
| `GET` | `/audit-plans/eligibility` | `{ eligibleBins }`: scored bins without a pending task |
| `POST` | `/audit-plans` | Body `{ n }`: creates a plan with the Top N eligible bins (400 if N is out of range, 409 if none are eligible) |
| `GET` | `/audit-plans` | Plan summaries with task counts, newest first |
| `GET` | `/audit-tasks?status=&planId=&limit=100` | Tasks, newest plan first then by rank (`status` `PENDING`/`DONE`, `limit` 1–500) |

Bin codes are matched case-insensitively.

## Project docs

- [`CLAUDE.md`](CLAUDE.md): business rules, scoring model, and conventions.
- [`DECISIONS.md`](DECISIONS.md): log of every product and technical decision.
