# CLAUDE.md

## Project Overview

**Smart Cycle Count Scoring**: a technical test for a Full-Stack Developer role.

This is a small app that helps warehouse teams decide **which bins to audit first** during
inventory cycle counts. Today counts are assigned at random. Instead, every bin gets a
**risk score (0–100)**, where a higher score means a higher chance of inventory errors.
The scores drive a color-coded heatmap, audit plans, and a mobile count flow. Audit
results feed back into the next scoring run.

## Tech Stack (mandatory)

- **Language:** TypeScript everywhere (frontend, backend, seed scripts, shared code).
  - No plain JavaScript: no `.js`/`.jsx` source files. Use `.ts`/`.tsx` only.
  - Config files should be TypeScript when the tool supports it
    (e.g. `next.config.ts`, the Prisma seed script).
  - `strict: true` in every `tsconfig.json`; avoid `any`.
- **Runtime:** Node.js 24 LTS (`.nvmrc` = `24.21.0`, engines `>=24.15`, required by Nest CLI 12)
- **Frontend:** Next.js 16 (App Router), React 19
- **Backend:** NestJS 12, as an **ESM** project (`"type": "module"`, relative imports end in `.js`)
- **ORM:** Prisma 7 (`prisma-client` generator into `apps/api/src/generated/prisma`,
  `@prisma/adapter-pg`, config in `apps/api/prisma.config.ts`)
- **Database:** PostgreSQL 17 (run locally via `docker-compose.yml`)
- **Package manager:** pnpm 10 workspaces, pinned through the `packageManager` field in the
  root `package.json`. No Turborepo/Nx. Allowed install scripts are listed in
  `pnpm-workspace.yaml` (`onlyBuiltDependencies`).
- **Styling:** Tailwind CSS 4
- **Testing:** Vitest (API), with priority on unit tests for the scoring calculator.
  Unit tests: `*.spec.ts` next to the code; e2e tests: `apps/api/test/*.e2e-spec.ts`
  (need the database).
- **Linting:** oxlint (API), ESLint with `eslint-config-next` (web). Both treat `any` as an
  error and fail on warnings.
- **Ports:** web `3000`, API `3001`, Postgres `5432`.

## Working Agreements

### Decision log (`DECISIONS.md`)
**Every time the user makes a decision, record it in `DECISIONS.md` automatically**, in the
same turn and without being asked. A decision is any answer to a question, approval or
rejection of a proposal, or choice between options that affects the product, the
architecture, the tooling, or the process.

- Append a new entry with the next sequential ID (`D-XXX`), the date, the area, the
  decision, and, when known, the rationale and the alternatives considered.
- Never rewrite or delete existing entries. If a decision changes an earlier one, add a
  new entry and mark the old one `Superseded by D-XXX`.
- If the decision changes business rules, update `CLAUDE.md` as well.

### Plan before writing features
**Always propose a plan before writing a feature, and wait for the user's approval before
writing any code.** The plan covers:

- **Scope:** what the feature does and what it explicitly leaves out.
- **Changes:** files/modules to add or modify, data model or migration changes, and API
  endpoints (method, path, request/response shape).
- **Business rules:** which rules from this file apply and how they are implemented.
- **Tests:** what gets unit-tested and what gets e2e-tested.
- **Branch and commits:** the `feature/*` branch name and the planned commits.
- **Open questions:** anything that needs a decision first.

If the plan changes significantly during implementation, stop and propose the updated
plan before continuing. Approved plans and the decisions in them are recorded in
`DECISIONS.md`.

### Start of every session
Sessions are cleared between features, so this file is the only context that loads
automatically. At the start of a session:

1. Read `DECISIONS.md` and the **Roadmap** below to see what's done and what's next.
2. If `docs/transcripts/` has an uncommitted transcript from the previous feature, commit
   it as the first commit of the next feature branch:
   `docs(transcripts): add <NN-name> session transcript`.

### Session transcripts (`/export` + `/clear`)
After every feature is **ready** (its PR passed `/code-review` and is merged into
`develop`), close the session with a transcript. `/export` and `/clear` are Claude Code
commands that **only the user can run**, so:

1. **Show a preview** of what the session covered: the feature, the decisions made
   (`D-XXX`), the PRs and commits, and the review findings. Flag anything in the
   conversation that looks sensitive (credentials, tokens, private account details) before
   it gets exported.
2. **Ask for confirmation** before the export.
3. After the user confirms, give the exact command:
   `/export docs/transcripts/<NN-name>.txt` (names from the Roadmap, e.g. `01-schema-seed`).
4. The user runs `/export`, then `/clear`, and starts the next feature in the new session.
5. Update the Roadmap status in the feature's PR, before the export.

### Git workflow
Use **git-flow** branching and **Conventional Commits** for every commit and PR. The full
rules are in `.claude/rules/git-workflow.md`.

### Code review
**Every PR must pass a `/code-review` before merging.** When a finding needs a change,
show the proposed fix to the user and wait for approval before applying it. The full
process is in `.claude/rules/git-workflow.md`.

## Roadmap

One feature per session. Each row is one `feature/*` branch, one PR, and one transcript in
`docs/transcripts/`.

| #  | Feature                                             | Transcript         | Status   |
|----|-----------------------------------------------------|--------------------|----------|
| 00 | Project setup: business logic, decisions, scaffold  | `00-project-setup` | Done     |
| 01 | Seed data (schema already in place)                 | `01-schema-seed`   | Next     |
| 02 | Scoring service + recompute                         | `02-scoring`       | Planned  |
| 03 | Heatmap dashboard + bin detail                      | `03-heatmap`       | Planned  |
| 04 | Audit plans + tasks                                 | `04-audit-plans`   | Planned  |
| 05 | Mobile count flow                                   | `05-count-flow`    | Planned  |

## Project Structure

```
RivBins/
├── apps/
│   ├── api/                  # NestJS — the only app that touches the DB
│   │   ├── prisma/           # schema.prisma, seed.ts, migrations/
│   │   └── src/
│   │       ├── generated/    # Prisma client (generated, git-ignored)
│   │       ├── prisma/       # PrismaModule + PrismaService
│   │       ├── health/       # GET /health (API + DB check)
│   │       ├── warehouse/    # heatmap layout (aisles → racks → bins + current score)
│   │       ├── bins/         # bin detail, search by code, score history
│   │       ├── scoring/      # scoring.config.ts, scoring.calculator.ts (pure), service, controller
│   │       ├── audit-plans/  # create plan (N), list plans/tasks
│   │       └── audits/       # submit count result
│   └── web/                  # Next.js (App Router)
│       └── src/app/
│           ├── page.tsx              # heatmap dashboard + bin detail drawer
│           ├── tasks/page.tsx        # audit plan generator + tasks table
│           └── count/                # mobile count flow (search → [binCode] form)
├── packages/
│   └── shared/               # API contract types only (DTOs, FactorBreakdown, enums)
├── docker-compose.yml
├── pnpm-workspace.yaml
└── tsconfig.base.json        # strict: true, extended by every package
```

- `scoring.calculator.ts` is a **pure function** (inputs → score + breakdown) with no DB
  access. It must be unit-tested.
- `scoring.config.ts` is the single source of truth for thresholds and weights.

## Domain Model

### Physical hierarchy
Warehouse → Aisle → Rack → Bin

- The seed has one warehouse with a few aisles and racks and **~30 bins** in total.
- Each bin has a unique, human-readable **bin code** (used for search/scan), e.g. `A-01-03`.
- The heatmap uses this hierarchy for its layout: a grid per aisle and rack.

### Inventory
- **Product:** an item/SKU.
- **Pallet:** assigned to exactly one bin at a time. A pallet holds **several products**.
- **Pallet line (pallet item):** a product plus the quantity of it on a given pallet.
  This is the unit that gets counted.
- **Expected inventory of a bin:** all pallet lines on the pallets currently in that bin.

### Inventory movements (activity history)
Every movement is timestamped and linked to a bin and pallet (and product where relevant).

| Type         | Meaning                                                                 |
|--------------|-------------------------------------------------------------------------|
| `PUTAWAY`    | Pallet placed into a bin                                                |
| `PICK`       | **Some units** removed from a pallet line (the pallet stays in the bin) |
| `MOVE`       | Whole pallet moved from one bin to another                              |
| `ADJUSTMENT` | Quantity of a pallet line corrected (manual or from a failed count)     |

Adjustments must record whether they were **manual** or **created by an audit**, because
the scoring treats them differently. This is modeled as `Movement.auditResultId`:
null means manual, set means audit-generated.

A `MOVE` touches two bins (`binId` = destination, `fromBinId` = source) and counts as
activity for **both** bins.

The seed simulates **the last 30 days** of these movements, with an uneven distribution
across bins so the scores spread across green, yellow, and red.

### Audits
- **AuditPlan:** created on demand with a user-chosen **N**. It contains the Top N riskiest
  bins that **do not already have a `PENDING` task**.
- **AuditTask:** one per bin in a plan. Status is `PENDING` or `DONE`.
  Existing `PENDING` tasks are never modified when a new plan is created.
  The database enforces **at most one `PENDING` task per bin** (partial unique index
  `AuditTask_binId_pending_key`, raw SQL in the init migration). The plan service must
  treat a violation as "bin already has a pending task" and skip it.
- **AuditResult:** the outcome of counting one bin.
  - Per pallet line: expected qty, counted qty, difference.
  - Bin-level: auto-computed pass/fail (`autoOutcome`), the user's final pass/fail
    (`finalOutcome`, which may be an override), discrepancy ratio, and a timestamp.
  - Linked to its task when there is one. Ad-hoc counts (bin searched without a task)
    are allowed.
- **Audit results cannot be deleted** while adjustments or score history reference them
  (`ON DELETE RESTRICT`). Otherwise audit-generated adjustments would silently become
  "manual" (null `auditResultId`) and inflate factor 3.
- **BinScore:** an **append-only score history**. Every recompute inserts a new row and
  points `Bin.currentScoreId` at it, in one transaction. Rows are never updated.

## Scoring System (core business logic)

Each bin gets a **score from 0 to 100**. A higher score means the bin is riskier.

### Scoring window: "since last audit"
Activity-based factors count only movements **since the bin's last audit**, because
movements before that were already verified by the count.
- **Never-audited bin:** use the bin's full movement history (the seeded 30 days).
- **Adjustments created by an audit** (failed count corrections) are **excluded** from
  the adjustment factor. The audit's outcome is already captured by factors 4 and 5.

### Factors
Each factor is normalized to **0–1 using fixed thresholds** (absolute, not relative to
other bins). This makes a bin's score depend only on its own data, so a single bin can
be recomputed on its own.

`normalized = min(rawValue / threshold, 1)` (unless noted otherwise)

| # | Factor                       | Raw value                                                                    | Threshold (proposed) | Weight (proposed) |
|---|------------------------------|------------------------------------------------------------------------------|----------------------|-------------------|
| 1 | Time since last audit        | Days since last audit (never audited = threshold)                            | 30 days              | 0.25              |
| 2 | Activity since last audit    | `PICK` + `MOVE` (in or out) + `PUTAWAY` count since last audit               | 60 movements         | 0.20              |
| 3 | Adjustments since last audit | Manual `ADJUSTMENT` count since last audit                                   | 5 adjustments        | 0.15              |
| 4 | Audit failure history        | Audits with `finalOutcome = FAIL` in the last 90 days (does **not** reset on audit) | 2 failures    | 0.15              |
| 5 | Last discrepancy size        | `Σ|counted − expected| / Σ expected` from the last audit (never audited = 0) | 20%                  | 0.15              |
| 6 | SKU mix                      | Distinct products currently in the bin                                       | 6 SKUs               | 0.10              |

**SKU mix normalization:** `min((distinctSkus − 1) / (threshold − 1), 1)`, so a
single-SKU bin scores 0 and a bin with 6 or more SKUs scores 1. An empty bin also scores 0.

**Last discrepancy size** uses the real counted vs. expected values, regardless of the
pass/fail override.

**Audit failure history** uses `finalOutcome` because the user's verdict is the most
precise one. It captures failures the numbers can't show (e.g. wrong labels, damaged
goods), while factor 5 still records any real count difference behind a PASS override.

### Combination
`score = round(Σ (normalized_i × weight_i) × 100)`. The weights sum to 1.0.

Thresholds and weights live in one config/constants file and are documented in the README.

### Explainability (required)
For every bin, persist the **score plus a per-factor breakdown**: raw value, threshold,
normalized value, weight, and contribution in points. The UI uses this to show **why** a
bin has its score.

Because each history row stores the threshold and weight it used, old scores stay
explainable even if the config changes later.

### Score history (traceability)
Every score row records **what triggered it**:

| Trigger            | When                                              |
|--------------------|---------------------------------------------------|
| `SEED`             | Initial computation after seeding                 |
| `MANUAL_RECOMPUTE` | "Recompute scores" button (all bins)              |
| `AUDIT`            | Automatic recompute after a count; also stores `auditResultId` |

This supports reports on how a bin's score changed over time and why (e.g. "dropped from
78 to 22 after audit #14").

### Recompute
- **Manual "Recompute scores" action** (button + endpoint): recomputes **all bins**.
- **Automatic after an audit result is saved:** recomputes **only the audited bin**.
- Both insert new history rows; neither modifies existing ones.

### Feedback loop ("the system gets smarter")
Score → Heatmap → Audit Plan (Top N) → Count → Recompute → New score

- **Any audit** resets factors 1, 2, and 3 (time, activity, and adjustments start
  counting from zero).
- A **passed** audit sets factor 5 (discrepancy) to around 0, so the score drops sharply.
- A **failed** audit raises factor 4 (failure history), and factor 5 reflects how far off
  the count was. A bin that was badly off stays risky even right after it was counted.
- This is deterministic feedback, **not machine learning**.

## Count Logic

### Granularity
The user counts **each product line on each pallet** in the bin.

### Pass/fail: automatic with manual override
1. **Auto result:** the bin passes only if **every** pallet line matches its expected
   quantity (tolerance: exact match, 0 units, configurable).
   Any line outside tolerance means the bin fails.
2. **Override:** the user can flip the auto result before saving. The app stores both the
   auto and the final result.

### Correcting inventory
- **Final result = FAIL:** for each mismatched line, create an `ADJUSTMENT` movement
  (marked as audit-generated) and update the pallet line quantity to the counted value.
  System inventory then matches reality.
- **Final result = PASS** (including an override from fail): record any differences but
  **do not** create adjustments or change inventory.

### On save
1. Persist the AuditResult (lines, auto/final result, discrepancy ratio).
2. Apply adjustments if the final result is FAIL.
3. Update the bin's last audit date.
4. Mark the bin's `PENDING` task as `DONE`, if one exists.
5. Recompute that bin's score.

## Features / Screens

### 1. Heatmap Dashboard
- A grid of bins grouped by aisle and rack.
- Color by score: **green (low) → yellow → red (high)**.
- A "Recompute scores" action (all bins). The heatmap refreshes afterwards.

### 2. Bin Detail (drawer or page)
- Current score and factor breakdown (the "why")
- Score history (timeline with trigger per change)
- Last audit date
- Pallets currently in the bin, with their product lines and quantities

### 3. Audit Plan & Tasks
- An input for **N** plus a "Generate Audit Plan" button.
- The plan picks the Top N bins by score, **skipping bins with an existing `PENDING` task**.
- A table view of tasks with bin, score, status, and plan/date.

### 4. Mobile Count Flow (mobile-friendly)
1. Search for or scan a bin code.
2. Show the expected pallets and their product lines.
3. Enter the counted quantity per line.
4. See the auto pass/fail, override if needed, and save.

## Deliverables
- A running app (Next.js + NestJS) with:
  - Database schema and seed script
  - Scoring service
  - Heatmap page and bin details
  - Audit plan creation and task view
  - Mobile count flow
- A **README.md** covering:
  - How to install, seed, and run the app
  - The scoring factors, thresholds, weights, and how they're combined
