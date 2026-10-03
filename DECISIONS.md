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
- **Status:** Amended by D-030 to D-039 (roadmap timing, commit timing, release
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
