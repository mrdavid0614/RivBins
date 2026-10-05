# Decision Log

All decisions made during development, in chronological order.

- Entries are **append-only**. A decision that changes an earlier one gets a new entry,
  and the old entry is marked `Superseded by D-XXX`.
- Business rules that result from these decisions are documented in `CLAUDE.md`.

---

## D-001 — TypeScript is mandatory
- **Date:** 2026-10-01
- **Area:** Tech stack
- **Decision:** TypeScript everywhere (frontend, backend, seed, shared). No `.js`/`.jsx`
  source files, `strict: true` in every `tsconfig.json`, avoid `any`. Config files use
  TypeScript when the tool supports it.
- **Rationale:** Avoid any use of plain JavaScript.

## D-002 — Pass/fail is automatic with a manual override
- **Date:** 2026-10-01
- **Area:** Count logic
- **Decision:** The system computes pass/fail by comparing counted vs. expected quantities
  (exact match by default, configurable tolerance). The user can override it before
  saving. Both the auto and the final result are stored.
- **Alternatives considered:** Manual only; automatic only.

## D-003 — Counts are recorded per product line on each pallet
- **Date:** 2026-10-01
- **Area:** Count logic
- **Decision:** The user enters a counted quantity for every product line on every pallet
  in the bin. The bin fails if any line is outside tolerance.
- **Rationale:** Most accurate option. Shows exactly where the discrepancy is and
  prevents errors from cancelling each other out.
- **Alternatives considered:** One total per bin; one total per pallet.

## D-004 — A failed count corrects inventory
- **Date:** 2026-10-01
- **Area:** Count logic
- **Decision:** If the final result is FAIL, each mismatched line gets an audit-generated
  `ADJUSTMENT` and its quantity is set to the counted value. If the final result is PASS
  (including an override), differences are recorded but inventory is not changed.
- **Rationale:** System inventory matches reality after a count, and the next count
  compares against corrected data.
- **Alternatives considered:** Record the discrepancy only.

## D-005 — Recompute scope
- **Date:** 2026-10-01
- **Area:** Scoring
- **Decision:** The automatic recompute after a count updates only the audited bin. The
  manual "Recompute scores" action updates all bins.
- **Rationale:** Time keeps passing for every bin, so a manual full recompute is needed
  to keep "days since last audit" current.

## D-006 — Audit plan sizing and pending tasks
- **Date:** 2026-10-01
- **Area:** Audit plans
- **Decision:** The user chooses N. Existing `PENDING` tasks are never modified by a new
  plan. A new plan skips bins that already have a `PENDING` task and fills the remaining
  slots with the next riskiest bins.
- **Alternatives considered:** Replace pending tasks; allow duplicate tasks per bin.

## D-007 — Factors are normalized with fixed thresholds
- **Date:** 2026-10-01
- **Area:** Scoring
- **Decision:** Each factor is normalized as `min(raw / threshold, 1)` against fixed
  thresholds, not relative to other bins.
- **Rationale:** A bin's score depends only on its own data, which makes single-bin
  recompute (D-005) correct, and scores are stable and easy to explain.
- **Alternatives considered:** Relative normalization (the busiest bin = 1).

## D-008 — Pallets hold several products
- **Date:** 2026-10-01
- **Area:** Domain model
- **Decision:** A pallet can hold multiple products, modeled as pallet lines
  (product + quantity).

## D-009 — A pick removes units, not the whole pallet
- **Date:** 2026-10-01
- **Area:** Domain model
- **Decision:** `PICK` reduces the quantity of a pallet line. The pallet stays in its bin.

## D-010 — Additional scoring factors
- **Date:** 2026-10-01
- **Area:** Scoring
- **Decision:** Add **SKU mix** (distinct products in the bin), **last discrepancy size**
  (from the last audit), and compute activity/adjustment factors **since the last audit**
  instead of a fixed 30-day window.
- **Alternatives considered:** Pallet count, partial/low-quantity lines, move frequency
  weighted separately, inventory value (ABC), neighbor risk (rejected: breaks single-bin
  recompute), ghost inventory.

## D-011 — Scoring rules approved with the CLAUDE.md draft
- **Date:** 2026-10-01
- **Area:** Scoring
- **Decision:**
  - Six factors with proposed thresholds and weights (see `CLAUDE.md`).
  - Adjustments created by an audit are excluded from the adjustment factor.
  - Failure history uses a fixed 90-day window and does not reset on audit.
  - Last discrepancy size uses the real counted vs. expected values, regardless of the
    override.
  - A never-audited bin is treated as maximum staleness.
  - The bin detail screen shows the factor breakdown.

## D-012 — A MOVE counts as activity for both bins
- **Date:** 2026-10-02
- **Area:** Scoring / Data model
- **Decision:** A `MOVE` stores destination (`binId`) and source (`fromBinId`) and counts
  toward the activity factor of both bins.
- **Rationale:** The contents of both bins change.

## D-013 — Failure history uses the final (user) outcome
- **Date:** 2026-10-02
- **Area:** Scoring
- **Decision:** Factor 4 counts audits with `finalOutcome = FAIL`.
- **Rationale:** The value entered by the user is the most precise one. It captures
  failures the numbers can't show (wrong labels, damaged goods). Factor 5 still records
  real count differences behind a PASS override.
- **Alternatives considered:** `autoOutcome`.

## D-014 — Append-only score history
- **Date:** 2026-10-02
- **Area:** Data model
- **Decision:** Every recompute inserts a new `BinScore` row (with trigger `SEED`,
  `MANUAL_RECOMPUTE`, or `AUDIT`, plus `auditResultId` for audits) and points
  `Bin.currentScoreId` at it. Rows are never updated. Each row stores the thresholds and
  weights it used.
- **Rationale:** Traceability, and detailed reports on how a bin's score changed over time.
- **Alternatives considered:** A single current score per bin.

## D-015 — Tooling
- **Status:** Testing part (Jest) superseded by D-022.
- **Date:** 2026-10-02
- **Area:** Tech stack
- **Decision:** pnpm workspaces (pinned through `packageManager`, set up with
  `corepack enable`), no Turborepo/Nx. Tailwind CSS for styling, Jest for API tests.
- **Rationale:** pnpm is fast and strict about undeclared dependencies, and it's the
  standard choice for TypeScript monorepos.
- **Alternatives considered:** npm workspaces, Yarn Berry, Bun workspaces, two independent
  projects.

## D-016 — Decision log
- **Date:** 2026-10-02
- **Area:** Process
- **Decision:** Every decision made during development is recorded in `DECISIONS.md`
  automatically.

## D-017 — Git workflow
- **Date:** 2026-10-02
- **Area:** Process
- **Decision:** Use **git-flow** for branching and **Conventional Commits** for commit
  messages and PR titles. Rules are documented in `.claude/rules/git-workflow.md`.

## D-018 — Mandatory code review for every PR
- **Date:** 2026-10-02
- **Area:** Process
- **Decision:** Every PR must pass a review with the `/code-review` skill before merging.
  When a finding needs a change, the proposed fix is shown to the user first and applied
  only after approval. Rules are documented in `.claude/rules/git-workflow.md`.

## D-019 — Default code review level is `medium`
- **Date:** 2026-10-02
- **Area:** Process
- **Decision:** `/code-review` runs at level `medium` by default (fewer, high-confidence
  findings).
- **Alternatives considered:** `high` (broader coverage, may include uncertain findings).

## D-020 — GitHub remote and PRs
- **Date:** 2026-10-02
- **Area:** Process
- **Decision:** The remote is `git@github.com:mrdavid0614/RivBins.git`. PRs are opened on
  GitHub. Rule changes also go through a `feature/*` branch and a reviewed PR.

## D-021 — Node.js 24 LTS
- **Date:** 2026-10-03
- **Area:** Tech stack
- **Decision:** The project requires Node.js 24 LTS (`.nvmrc` = `24.21.0`, engines
  `>=24.15`).
- **Rationale:** Nest CLI 12 requires Node `^22.22.3`, `^24.15.0`, or `>=26`. Node 24 is
  the current LTS.
- **Alternatives considered:** Latest Node 22 (maintenance LTS); staying on Node 22.12 and
  dropping the Nest CLI.

## D-022 — Vitest for API tests
- **Date:** 2026-10-03
- **Area:** Tech stack
- **Decision:** Use Vitest instead of Jest for the API. Supersedes the testing part of
  D-015.
- **Rationale:** Nest 12 generates ESM projects with Vitest by default. Vitest supports
  ESM and TypeScript natively, while Jest's ESM support is still experimental.
- **Alternatives considered:** Jest with extra ESM configuration.

## D-023 — oxlint for the API
- **Date:** 2026-10-03
- **Area:** Tech stack
- **Decision:** Keep oxlint (Nest 12's default) for the API. The web app keeps ESLint with
  `eslint-config-next`.
- **Alternatives considered:** ESLint with typescript-eslint in both apps.

## D-024 — PostgreSQL 17
- **Date:** 2026-10-03
- **Area:** Tech stack
- **Decision:** Keep PostgreSQL 17 (`postgres:17-alpine`) in `docker-compose.yml`.
- **Alternatives considered:** PostgreSQL 16 (already available locally).

## D-025 — Review fixes for the monorepo scaffold
- **Date:** 2026-10-03
- **Area:** Process / Code review
- **Decision:** Apply all four `/code-review` findings on `feature/monorepo-scaffold`:
  generate the Prisma client before API typecheck/tests, remove the `db:seed` placeholder
  until the seed exists, build request headers with `Headers` (JSON content type only for
  non-FormData bodies), and treat empty API responses as `undefined`.

## D-026 — Second review fixes for the monorepo scaffold
- **Date:** 2026-10-03
- **Area:** Process / Code review / Data model
- **Decision:** Apply all four findings from the second `/code-review`:
  - Rename the API lint config to `.oxlintrc.json` so oxlint actually loads it.
  - Run oxlint with `--type-aware` (`oxlint-tsgolint`) so `no-floating-promises` works.
  - `onDelete: Restrict` on `Movement.auditResultId` and `BinScore.auditResultId`.
  - Partial unique index: at most one `PENDING` task per bin.
  - Regenerate the `init` migration instead of adding follow-up migrations (the user
    explicitly consented to resetting the local database).

## D-027 — Third review fixes for the monorepo scaffold
- **Date:** 2026-10-03
- **Area:** Process / Code review
- **Decision:** Apply both findings from the third `/code-review`:
  - `prisma.config.ts` only declares the datasource when `DATABASE_URL` is set, so
    `prisma generate` (and therefore build, typecheck, and unit tests) works without a
    `.env` file, e.g. in CI.
  - `apiFetch` defaults `Content-Type: application/json` only for string bodies.

## D-028 — Plan before writing features
- **Date:** 2026-10-03
- **Area:** Process
- **Decision:** Before writing any feature, propose a plan (scope, changes, business
  rules, tests, branch/commits, open questions) and wait for approval before writing
  code. Significant changes to an approved plan are proposed again before continuing.
  Documented in `CLAUDE.md` under Working Agreements.

## D-029 — Session transcripts and roadmap
- **Status:** Amended by D-030 to D-041 (roadmap timing, commit timing, release
  transcript, declined transcripts, secret scanning and redaction).
- **Date:** 2026-10-03
- **Area:** Process
- **Decision:**
  - After every feature is ready (PR reviewed and merged into `develop`), the session is
    exported with `/export` and cleared with `/clear`. Both are run by the user.
  - Before the export, Claude shows a **preview** of what the session covered (no extra
    summary file), flags anything sensitive, and asks for confirmation.
  - Transcripts are saved in `docs/transcripts/` and committed with the next feature's
    branch, named `NN-name` (`00-project-setup`, `01-schema-seed`, `02-scoring`, ...).
  - This setup session is exported as `00-project-setup`.
  - `CLAUDE.md` gets a Roadmap (feature, transcript name, status) and a start-of-session
    checklist, since only `CLAUDE.md` loads automatically after `/clear`.
- **Alternatives considered:** An approved summary file next to each export; keeping
  transcripts outside the repo; folding this session into `01-schema-seed`.

## D-030 — Roadmap update happens before the feature's review
- **Date:** 2026-10-03
- **Area:** Process / Code review
- **Decision:** A feature's branch updates the Roadmap (feature `Done`, next one `Next`)
  before its PR is reviewed and merged, instead of after the export. Fixes a `/code-review`
  finding: after the merge, the update would need a direct commit to `develop`.

## D-031 — Transcript commit timing, final transcript, and commit scope
- **Date:** 2026-10-03
- **Area:** Process / Code review
- **Decision:** Apply the three findings from the second `/code-review` of the transcript
  workflow:
  - The previous transcript is committed right after the next feature's plan is approved
    and its branch is created, never on `develop`.
  - The last feature's transcript goes on `release/1.0.0`, which merges into `main`
    (tagged `v1.0.0`) and back into `develop`. The release session is not exported.
  - `transcripts` is added to the allowed Conventional Commit scopes.

## D-032 — Secret scan before committing transcripts
- **Status:** Amended by D-034 and D-037.
- **Date:** 2026-10-03
- **Area:** Process / Code review
- **Decision:** Apply the three findings from the third `/code-review` of the transcript
  workflow:
  - Before a transcript is committed, scan it for secrets, show the findings, and redact
    with the user's approval (or don't commit it).
  - Mark D-029 as amended by D-031.
  - Correct the Roadmap intro: row 00 spans several PRs, and the last transcript goes on
    `release/1.0.0`.

## D-033 — Declined transcripts and the release row
- **Date:** 2026-10-03
- **Area:** Process / Code review
- **Decision:** Apply both findings from the fourth `/code-review` of the transcript
  workflow:
  - A transcript that isn't committed (possible secrets) is moved out of the repo, e.g.
    to `~/RivBins-transcripts/`.
  - The Roadmap gets a Release row after feature 05, and the start-of-session checklist
    says to follow the release exception when that row is `Next`.

## D-034 — Single "Transcript safety" rule
- **Date:** 2026-10-03
- **Area:** Process / Code review
- **Decision:** Replace the scattered secret-handling steps with one **Transcript safety**
  rule in `CLAUDE.md` that both the feature path and the release path reference:
  - Never repeat a secret in the conversation; report only location, type, and a masked
    value.
  - Flag sensitive content that way in the export preview.
  - Scan, then redact with approval (or move out of the repo) before committing any
    transcript, including transcript 05 on `release/1.0.0`.
  - The release session marks the Release row `Done`.
- **Rationale:** Fixes the fifth `/code-review` findings. Showing secrets while flagging
  them would copy them into the next transcript.

## D-035 — Scan and redact transcripts without printing secrets
- **Status:** Superseded by D-037.
- **Date:** 2026-10-03
- **Area:** Process / Code review
- **Decision:** Apply both findings from the sixth `/code-review` of the transcript
  workflow:
  - Scan transcripts with commands that print only line numbers and pattern types, redact
    with in-place `sed` shape patterns, and never open hit lines with Read or Edit.
  - Correct the Roadmap intro: transcripts exist for feature rows 00–05 only, transcript
    05 goes on `release/1.0.0`, and the Release row has none.

## D-036 — Portable redaction command and complete amendment marks
- **Status:** Redaction part superseded by D-037.
- **Date:** 2026-10-03
- **Area:** Process / Code review
- **Decision:** Apply both findings from the seventh `/code-review` of the transcript
  workflow:
  - Use the macOS-safe form `sed -E -i '' '…' file` (no backup file), verify with a
    count of unmasked hits that must be `0`, and check `git status` for stray backups.
    Tested on a temporary file with a fake secret.
  - Mark D-029 as amended by every later decision that changed it.

## D-037 — Scan transcripts with gitleaks; the user redacts
- **Status:** Amended by D-038, D-040, and D-041.
- **Date:** 2026-10-03
- **Area:** Process / Code review / Tooling
- **Decision:** Replace the hand-written `grep`/`sed` secret rules with **gitleaks**
  (installed with Homebrew, 8.30.1):
  - Scan with `gitleaks dir --config .gitleaks.toml --redact`. `.gitleaks.toml` extends
    the default rules with `url-with-credentials`, since the defaults miss connection
    strings with passwords.
  - Report only line numbers and rule IDs. The user redacts findings in their own editor,
    outside the session, and the re-scan must exit `0` before the commit.
- **Rationale:** Fixes the eighth `/code-review` findings. The hand-written patterns only
  covered Postgres URLs and missed passwords containing `@`. Tested on a temporary file
  with a fake GitHub token, a private key, and a URL with an `@` in the password: all
  three were found, and no value appeared in the output.
- **Alternatives considered:** Extending the `grep`/`sed` patterns per secret type.

## D-038 — Tighter `url-with-credentials` rule
- **Date:** 2026-10-03
- **Area:** Process / Code review / Tooling
- **Decision:** Apply both findings from the ninth `/code-review`:
  - The username is optional, so `redis://:<password>@host` is detected.
  - The password stops at `/` (it can still contain `@`), so text like
    `http://localhost:3000/docs ... "@nestjs/core"` is no longer flagged.
  - Allowlist the local docker-compose URL (`rivbins:rivbins@localhost`), already public
    in `apps/api/.env.example`.
- **Rationale:** Tested 8 cases with gitleaks 8.30.1. A token, a private key, a password
  containing `@`, and a URL with no username were detected; the npm-scope URLs, the
  health URL, and the dev URL were not. No values appeared in the output.
- **Known limit:** a password with a literal `/` (normally URL-encoded as `%2F`) is not
  detected.

## D-039 — Transcripts never enter the conversation through git
- **Date:** 2026-10-03
- **Area:** Process / Code review
- **Decision:** Apply both findings from the tenth `/code-review`:
  - Committed transcripts are never printed. Every `git diff`/`git show`/`git log -p` on a
    branch with transcripts excludes `docs/transcripts/`, and `/code-review` always
    excludes it too. Otherwise each review would copy the previous transcript into the
    session, and transcripts would nest and repeat any missed secret.
  - Mark D-032 as amended by D-034 and D-037, D-035 as superseded by D-037, and D-036's
    redaction part as superseded by D-037.

## D-040 — Non-verbose transcript scan, review diff against the PR target, merge
- **Date:** 2026-10-03
- **Area:** Process / Code review
- **Decision:** Apply both findings from the eleventh `/code-review`:
  - Scan transcripts without `-v` (it prints the text around findings). Write a JSON
    report to a temp file and print only line numbers and rule IDs. Tested: exit 1 with
    findings, 0 when clean, and no surrounding text printed.
  - The review diff uses the PR's target branch (`develop` or `main`), not always
    `develop`.
  - The user asked to apply everything required to merge `feature/session-transcripts`
    after this round.

## D-041 — Keep transcripts out of search tools
- **Date:** 2026-10-03
- **Area:** Process / Code review
- **Decision:** Apply the findings from the final `/code-review` before merging
  `feature/session-transcripts` (the user pre-authorized the fixes needed to merge):
  - Add a root `.ignore` with `docs/transcripts/`, so ripgrep-based search (Grep, Explore
    agents) never returns transcript lines. The "never print transcripts" rule now also
    covers Read and search tools.
  - Mark D-037 as amended by D-038, D-040, and D-041.

## D-042 — Feature 01 plan: deterministic seed data
- **Date:** 2026-10-03
- **Area:** Seed / Process
- **Decision:** Approve the plan for feature 01 (`feature/seed-data`):
  - A pure, deterministic generator (`generateSeedData(now, seed)`, mulberry32 PRNG)
    simulates the last 30 days forward in time, so movements, pallet locations, and
    quantities are consistent by construction. A thin runner persists the rows.
  - Bins get a risk profile (`cold` / `warm` / `hot`) that drives uneven activity.
  - The seed doesn't compute scores: `SEED` scores are added in feature 02, once the
    calculator exists. It creates no audit plans or tasks.
  - Run with `tsx` (Node's type stripping doesn't rewrite the generated client's `.js`
    imports), wired as Prisma's seed command and as `pnpm db:seed`.
- **Alternatives considered:** Generating a final state and its movements separately.

## D-043 — 36-bin warehouse layout
- **Date:** 2026-10-03
- **Area:** Seed / Domain model
- **Decision:** The seed creates 36 bins: 3 aisles (A–C) × 2 racks × 2 levels ×
  3 positions, coded `A-01-01` to `C-02-06`.
- **Alternatives considered:** 30 bins with 5-position racks on a single level.

## D-044 — The seed includes past audits
- **Date:** 2026-10-03
- **Area:** Seed / Scoring
- **Decision:** Some bins get ad-hoc past audits (PASS and FAIL, `finalOutcome =
  autoOutcome`, audit-generated adjustments on FAIL per D-004), so factors 1, 4, and 5
  vary and some bins score green.
- **Rationale:** Without audits every bin gets ≥25 points from factor 1 and 0 from
  factors 4 and 5.

## D-045 — No seed e2e test
- **Date:** 2026-10-03
- **Area:** Testing
- **Decision:** The seed is covered by unit tests on the pure generator plus a manual
  `pnpm db:seed` run. No e2e test, because it would wipe the local database.

## D-046 — The seed wipes existing data
- **Date:** 2026-10-03
- **Area:** Seed
- **Decision:** The seed truncates all tables (`RESTART IDENTITY CASCADE`) before
  inserting, so it can be rerun without `prisma migrate reset`.

## D-047 — The user redacts transcript findings manually
- **Date:** 2026-10-03
- **Area:** Process / Transcript safety
- **Decision:** For the `00-project-setup` transcript, the user redacts the remaining
  `url-with-credentials` findings in their editor, as D-037 requires. A redacted URL
  keeps no `user:password` part (`scheme://[REDACTED]@host`), because
  `user:[REDACTED]@host` still matches the rule.
- **Alternatives considered:** A subagent or a blind `sed` command redacting the lines
  (rejected: D-037 says Claude never edits flagged lines); moving the transcript out of
  the repo.

## D-048 — Review fix: generate the Prisma client before seeding
- **Date:** 2026-10-03
- **Area:** Process / Code review / Seed
- **Decision:** Apply the `/code-review` finding on `feature/seed-data`: `db:seed` runs
  `pnpm db:generate` first, like the other scripts that need the client, so the README's
  fresh-clone order (install → migrate → seed) works. Verified by deleting the generated
  client and running `pnpm db:seed`.

## D-049 — Feature 02 plan: scoring service and recompute
- **Date:** 2026-10-04
- **Area:** Scoring / Process
- **Decision:** Approve the plan for feature 02 (`feature/scoring-service`):
  - `scoring.config.ts` holds the factors, thresholds, weights, and the 90-day failure
    window. `scoring.calculator.ts` is a pure function with unit tests.
  - `loadScoringInputs(db, binIds, now)` reads the inputs for many bins in batched
    queries and accepts a Prisma client or a transaction, so the service and the seed
    runner share it.
  - `ScoringService.recomputeAll(trigger)` and `recomputeBin(binId, trigger,
    auditResultId?, tx?)` insert `BinScore` rows and repoint `Bin.currentScoreId` in one
    transaction, with one `now` per run. Feature 05 calls `recomputeBin` with `AUDIT`.
  - `POST /scoring/recompute` recomputes all bins.
  - The seed runner stores a `SEED` score for every bin (completes D-042).
  - Read endpoints for scores and history are left to feature 03.
  - Tests: calculator and service unit tests, plus a recompute e2e test that only
    appends rows.

## D-050 — Final scoring thresholds and weights
- **Date:** 2026-10-04
- **Area:** Scoring
- **Decision:** Keep the proposed values: time since last audit 30 days / 0.25,
  activity 60 movements / 0.20, manual adjustments 5 / 0.15, failures in 90 days 2 /
  0.15, last discrepancy 20% / 0.15, SKU mix 6 SKUs / 0.10.

## D-051 — Fractional days and display rounding
- **Status:** Amended by D-054.
- **Date:** 2026-10-04
- **Area:** Scoring
- **Decision:** Factor 1 uses fractional days. The stored `rawValue`, `normalized`, and
  `points` are rounded to 2 decimals for display, while the score is rounded from the
  unrounded sum.
- **Rationale:** Whole days would make scores jump at midnight.
- **Alternatives considered:** Whole days.

## D-052 — Discrepancy stored as a ratio
- **Date:** 2026-10-04
- **Area:** Scoring
- **Decision:** Factor 5's raw value and threshold are ratios (`0.12`, `0.2`). The UI
  formats them as percentages.

## D-053 — Recompute endpoint returns a summary
- **Date:** 2026-10-04
- **Area:** API
- **Decision:** `POST /scoring/recompute` returns `{ trigger, binsRecomputed,
  computedAt }`. The heatmap refetches its own data afterwards.
- **Alternatives considered:** Returning every new score.

## D-054 — Discrepancy ratio keeps 4 decimals
- **Date:** 2026-10-04
- **Area:** Scoring
- **Decision:** Factor 5's stored `rawValue` is rounded to 4 decimals (a percentage with
  2), not 2. Other raw values, `normalized`, and `points` keep 2 decimals (D-051).
- **Rationale:** With 2 decimals a ratio of `0.0993` showed as `0.1` while its points
  (7.45) came from the exact value, so the breakdown didn't add up.

## D-055 — SKU mix counts only lines with stock
- **Date:** 2026-10-04
- **Area:** Scoring
- **Decision:** Factor 6 counts distinct products on pallet lines with `quantity > 0`. A
  line counted down to 0 holds no product.

## D-056 — Recompute locks bins before reading inputs
- **Status:** Amended by D-057.
- **Date:** 2026-10-04
- **Area:** Scoring / Code review
- **Decision:** Apply the `/code-review` finding on PR #8: every score computation runs
  `SELECT … FOR UPDATE` on its bins, in id order, before loading inputs. The count flow
  (feature 05) must update the `Bin` row first in its transaction, which takes the same
  lock.
- **Rationale:** Without the lock, a manual recompute that read a bin's inputs before a
  concurrent count committed would repoint `currentScoreId` at a score built from
  pre-audit inputs. A new e2e test reproduces the race: it fails without the lock and
  passes with it. Id order avoids deadlocks between concurrent recomputes.
- **Alternatives considered:** A conditional pointer update based on `computedAt`;
  serializable isolation with retries.

## D-057 — Score timestamp after the lock; `FOR NO KEY UPDATE`
- **Date:** 2026-10-04
- **Area:** Scoring / Code review
- **Decision:** Apply both findings from the second `/code-review` of PR #8:
  - `computeAndStoreScores` takes `now` after the bin lock and returns it. Otherwise a
    count committed while the recompute waited (`countedAt` later than `now`) was left
    out of factors 4 and 5. The e2e race test now also saves a failed audit while the
    recompute waits; it fails with the old timestamp and passes with the fix.
  - Lock with `FOR NO KEY UPDATE` instead of `FOR UPDATE`. It still conflicts with the
    count flow's `UPDATE "Bin"`, but inserts that reference a bin (movements, tasks,
    audits) no longer wait or deadlock. Checked against Postgres: a movement insert is
    blocked by `FOR UPDATE` and not by `FOR NO KEY UPDATE`; the bin update is blocked
    by both.

## D-058 — Race test cleans up after a failed assertion
- **Date:** 2026-10-04
- **Area:** Testing / Code review
- **Decision:** Apply the third `/code-review` finding on PR #8: the e2e race test waits
  for its simulated count to finish before cleanup, so the FAIL audit it creates is
  always deleted. Verified by forcing an early assertion failure: the seeded database
  kept exactly its 28 audits. The third review found no issues in the production code.

## D-059 — Interim release 0.2.0
- **Date:** 2026-10-04
- **Area:** Process / Git workflow
- **Decision:** Bring `develop` into `main` after feature 02 through an interim git-flow
  release, `release/0.2.0` (scoring service, seed data, and scaffold), instead of a
  direct `develop` → `main` PR. The release bumps every package to `0.2.0`. After the PR
  merges, `main` is tagged `v0.2.0` and `release/0.2.0` is merged back into `develop`.
  The Release row (`v1.0.0`) stays planned after feature 05.
- **Alternatives considered:** A direct `develop` → `main` PR as a one-time exception to
  the git-flow rule; waiting for `v1.0.0`.

## D-060 — Feature 03 plan: heatmap dashboard and bin detail
- **Date:** 2026-10-04
- **Area:** Heatmap / API / Process
- **Decision:** Approve the plan for feature 03 (`feature/heatmap-dashboard`):
  - `GET /warehouse/layout` returns aisles → racks → bins with each bin's current score.
  - `GET /bins/:code` returns the bin detail (location, last audit, current score with
    its factor breakdown, pallets and lines). `GET /bins/:code/scores?limit=` returns
    the score history, newest first.
  - Contract types live in `@rivbins/shared`; the API maps Prisma rows with pure,
    unit-tested mappers; e2e tests run against the seeded database.
  - The web page stays a server component; "Recompute scores" is a server action that
    calls `POST /scoring/recompute` and revalidates the page.
  - Out of scope: bin search/count flow (05), pending-task badges (04), live updates.

## D-061 — Heatmap color bands
- **Date:** 2026-10-04
- **Area:** Heatmap
- **Decision:** Three fixed bands: 0–39 green (low), 40–69 yellow (medium), 70–100 red
  (high). Bins with no score are gray. A legend shows the bands.
- **Alternatives considered:** A continuous green → red gradient.

## D-062 — Bins are addressed by code in the API
- **Date:** 2026-10-04
- **Area:** API
- **Decision:** Bin detail and history use the human-readable code
  (`/bins/A-01-03`), so feature 05's search/scan can reuse the same endpoint.
- **Alternatives considered:** The numeric id.

## D-063 — Score history defaults to the last 20 rows
- **Date:** 2026-10-04
- **Area:** API / Heatmap
- **Decision:** `GET /bins/:code/scores` returns the newest 20 rows by default, with an
  optional `limit` (1–100). Every recompute appends a row per bin, so the full history
  grows without bound.
- **Alternatives considered:** Always returning the full history.

## D-064 — Server-rendered bin drawer
- **Date:** 2026-10-04
- **Area:** Heatmap
- **Decision:** The bin detail drawer opens from the `?bin=<code>` search parameter and
  is rendered on the server. The URL is shareable and the API stays server-side only.
- **Alternatives considered:** A client drawer fetching the API directly (needs CORS
  and a public API URL).

## D-065 — The drawer hides pallet lines with quantity 0
- **Date:** 2026-10-04
- **Area:** Heatmap
- **Decision:** The bin detail lists only pallet lines with `quantity > 0`, matching
  factor 6 (D-055): a line counted down to 0 holds no product.
- **Alternatives considered:** Showing them dimmed.

## D-066 — Implementation adjustments in feature 03
- **Date:** 2026-10-04
- **Area:** Heatmap
- **Decision:** Two small changes to the approved plan (D-060), made during
  implementation:
  - The recompute server action calls `refresh()` from `next/cache` instead of
    `revalidatePath('/')`. The heatmap is a dynamic page (`no-store` fetches,
    `searchParams`), and Next 16 documents `refresh()` for refreshing the current page
    after a Server Action.
  - The drawer's score history collapses consecutive rows with the same score and
    trigger into one line ("Manual recompute ×12", with a time range). Audit rows are
    never merged. The API still returns every row (D-063); only the presentation
    changes, so the timeline shows the changes instead of 20 identical rows.

## D-067 — Feature 04 plan: audit plans and tasks
- **Date:** 2026-10-05
- **Area:** Audit plans / API / Process
- **Decision:** Approve the plan for feature 04 (`feature/audit-plans`):
  - `POST /audit-plans { n }` creates a plan from the top N bins by current score
    (ties by bin code), skipping bins with a `PENDING` task (D-006) and bins with no
    score. It runs in one transaction under a Postgres advisory lock, so concurrent
    plans never pick the same bins, and inserts tasks with `skipDuplicates`, so a
    violation of `AuditTask_binId_pending_key` is skipped as "already pending".
    `scoreAtCreation` snapshots the score.
  - `GET /audit-plans` lists plan summaries; `GET /audit-tasks?status=&planId=&limit=`
    lists task rows (newest plan first, then rank).
  - The selection is a pure, unit-tested function; e2e tests run against the seeded
    database and clean up their plans and tasks.
  - Web: a `/tasks` page with the N input, a "Generate audit plan" server action and a
    tasks table filterable by status; a nav header links Heatmap and Tasks.
  - Pending-task badges (deferred by D-060) are included: heatmap cells and the bin
    drawer show a bin's `PENDING` task.
  - Out of scope: completing tasks (feature 05), cancelling/deleting tasks or plans,
    pagination, recomputing scores before planning.

## D-068 — No eligible bins returns 409
- **Date:** 2026-10-05
- **Area:** Audit plans / API
- **Decision:** When no bin is eligible (every scored bin already has a `PENDING`
  task), `POST /audit-plans` returns `409 Conflict` and creates no plan.
- **Rationale:** Keeps the plan list free of empty plans.
- **Alternatives considered:** Creating an empty plan.

## D-069 — N is capped at the number of eligible bins
- **Date:** 2026-10-05
- **Area:** Audit plans / API
- **Decision:** N must be an integer from 1 to the number of eligible bins (scored bins
  without a `PENDING` task). A larger N returns `400` and creates no plan, so a plan
  always holds exactly N tasks. `GET /audit-plans/eligibility` returns
  `{ eligibleBins }` so the form can show the limit and set the input's maximum. The
  count is checked inside the plan transaction, under the advisory lock.
- **Alternatives considered:** A fixed 1–100 range that creates fewer than N tasks
  when not enough bins are eligible (the original proposal).

## D-070 — Implementation adjustments in feature 04
- **Date:** 2026-10-05
- **Area:** Audit plans / Web
- **Decision:** Small changes to the approved plan (D-067), made during implementation:
  - The plan creation and listing endpoints ship in one commit instead of two.
  - The tasks table also filters by plan (`/tasks?plan=3`): plan numbers in the table and
    the drawer's pending-task line link to it.
  - `apiFetch` throws the API's error `message`, so the form shows why a plan was
    rejected (N above the eligible bins, or none eligible).

## D-071 — Review fixes for feature 04
- **Date:** 2026-10-05
- **Area:** Audit plans / Code review
- **Decision:** Apply both low-severity findings from the `/code-review` of PR #12:
  - `GET /audit-tasks` rejects a repeated `status` parameter (an array) with `400`
    instead of failing with `500`.
  - The tasks page asks for an explicit limit of 100 rows and says so when the list is
    cut off ("Showing the 100 most recent tasks"), instead of silently hiding older tasks.
- **Alternatives considered:** Pagination for the tasks table (out of scope per D-067).

## D-072 — Feature 05 plan: mobile count flow
- **Date:** 2026-10-05
- **Area:** Count flow / API / Process
- **Decision:** Approve the plan for feature 05 (`feature/count-flow`):
  - `GET /bins/:code/count-sheet` returns the bin's expected pallets and lines (with
    pallet item ids), its pending task, and the tolerance.
  - `POST /bins/:code/counts { lines: [{ palletItemId, expectedQty, countedQty }],
    finalOutcome }` saves the count in one transaction: update `Bin.lastAuditedAt`
    first (bin lock, D-056/D-057), validate the lines, store the `AuditResult` and its
    lines (linked to the pending task, if any), create audit-generated adjustments and
    correct quantities when the final outcome is FAIL, mark the task `DONE`, and
    recompute the bin with the `AUDIT` trigger. Returns the result with the previous
    and new score.
  - `count.config.ts` holds the tolerance (`toleranceUnits: 0`, D-002);
    `evaluateCount` is a pure, unit-tested function.
  - Web: `/count` (code input + pending tasks) and `/count/[binCode]` (per-line inputs,
    live auto outcome, override, save, result panel); "Count" links in the nav, bin
    drawer, and tasks table.
  - E2e tests run against the seeded database and restore it afterwards.
  - Out of scope: camera scanning, unexpected products, editing/deleting results,
    offline mode, multi-bin counts.

## D-073 — The count sheet skips lines with quantity 0
- **Date:** 2026-10-05
- **Area:** Count flow
- **Decision:** Only pallet lines with `quantity > 0` are counted, matching D-055 and
  D-065.
- **Alternatives considered:** Showing them so the counter can report found stock.

## D-074 — Bin codes are typed or scanned with a keyboard scanner
- **Date:** 2026-10-05
- **Area:** Count flow / Web
- **Decision:** The search is a text input, which also works with hardware scanners
  that type the code. No camera scanning.
- **Alternatives considered:** Camera scanning with `BarcodeDetector` (unsupported in
  Safari).

## D-075 — A stale count sheet is rejected with 409
- **Date:** 2026-10-05
- **Area:** Count flow / API
- **Decision:** The submission carries each line's `expectedQty`. If the bin's lines or
  quantities changed since the sheet was loaded, the API returns `409` and the counter
  reloads the sheet, so the saved auto outcome is the one the counter saw.
- **Alternatives considered:** Saving against the current quantities.

## D-076 — Empty bins can be counted
- **Date:** 2026-10-05
- **Area:** Count flow
- **Decision:** A bin with no lines can be counted; it passes automatically with a
  discrepancy of 0, confirming the bin is empty.
- **Alternatives considered:** Refusing the count.

## D-077 — Implementation adjustments in feature 05
- **Date:** 2026-10-05
- **Area:** Count flow / Testing
- **Decision:** Small changes to the approved plan (D-072), made during implementation:
  - The count sheet also returns the bin's last audit date and current score, so the
    count page can show them without a second request.
  - The 409 for a stale sheet names the line by SKU and pallet ("SKU-1010 on
    PLT-0072") instead of its internal id.
  - E2e test files run one at a time (`fileParallelism: false`): they share the seeded
    database, and the count tests create a pending task that would change the audit-plan
    eligibility count checked by another file.
  - The API commits are split by layer (pure rules, then endpoints) rather than "sheet,
    then save".

## D-078 — Review fix for feature 05
- **Date:** 2026-10-05
- **Area:** Count flow / Code review
- **Decision:** Apply the low-severity finding from the `/code-review` of PR #13: the
  count sheet returns `maxCountedQty` from `count.config.ts`, and the count page treats
  a larger value as not counted yet. The line shows "At most 1,000,000 units", and Save
  stays disabled. Before, the form accepted up to 9,999,999, and the API rejected the
  save with a 400 naming an array index instead of the product.
- **Alternatives considered:** A hard-coded limit in the web app.

## D-079 — Release 1.0.0
- **Date:** 2026-10-05
- **Area:** Process / Git workflow
- **Decision:** With features 00–05 merged into `develop`, cut `release/1.0.0` from
  `develop`, following the last-feature exception (D-032, D-033). The branch commits
  transcript 05 (gitleaks scan: no findings), bumps every package to `1.0.0`, and marks
  the Release row `Done`. After `/code-review` and the PR into `main`, `main` is tagged
  `v1.0.0` and `release/1.0.0` is merged back into `develop`. The release session is not
  exported.

## D-080 — Review fix for release 1.0.0
- **Date:** 2026-10-05
- **Area:** Audit plans / Code review
- **Decision:** Apply the low-severity finding from the `/code-review` of PR #14:
  `GET /audit-tasks` rejects a `planId` outside 1–2,147,483,647 (the INT4 range) with a
  400. Before, a larger value passed `ParseIntPipe`, made Prisma throw, and returned a
  500. The fix lands on `release/1.0.0` and reaches `develop` through the back-merge.
- **Alternatives considered:** Accepting the finding as is.
