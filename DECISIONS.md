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
