# Git Workflow: git-flow + Conventional Commits

These rules apply to every commit, branch, and pull request in this repository.

## Branching (git-flow)

| Branch       | Created from | Merges into         | Purpose                                 |
|--------------|--------------|---------------------|-----------------------------------------|
| `main`       | —            | —                   | Released, production-ready code only    |
| `develop`    | `main`       | —                   | Integration branch for the next release |
| `feature/*`  | `develop`    | `develop`           | New features and non-urgent changes     |
| `release/*`  | `develop`    | `main` and `develop`| Release preparation (version, docs)     |
| `hotfix/*`   | `main`       | `main` and `develop`| Urgent fixes to released code           |

- **Never commit directly to `main` or `develop`.** All work goes through a branch and a PR.
  (The only exception is the initial commit that bootstraps the repository.)
- Branch names are kebab-case and descriptive: `feature/heatmap-dashboard`,
  `feature/scoring-service`, `release/1.0.0`, `hotfix/1.0.1`.
- Every merge into `main` is tagged with a semantic version: `vMAJOR.MINOR.PATCH`.
- Start a new feature branch from an up-to-date `develop`.

## Commit messages (Conventional Commits)

Format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

- **description:** imperative mood, lowercase, no trailing period, ≤ 72 characters.
  Example: `feat(scoring): add sku mix factor`.
- **body:** explains *what* and *why*, not *how*. Wrap at 72 characters.
- **Breaking changes:** add `!` after the type/scope (`feat(api)!: ...`) and a
  `BREAKING CHANGE:` footer.

### Types

| Type       | Use for                                                   |
|------------|-----------------------------------------------------------|
| `feat`     | A new feature                                             |
| `fix`      | A bug fix                                                 |
| `docs`     | Documentation only                                        |
| `style`    | Formatting, no code behavior change                       |
| `refactor` | Code change that neither fixes a bug nor adds a feature   |
| `perf`     | Performance improvement                                   |
| `test`     | Adding or updating tests                                  |
| `build`    | Build system or dependencies (pnpm, tsconfig, Docker)     |
| `ci`       | CI configuration                                          |
| `chore`    | Maintenance that doesn't touch source or tests            |
| `revert`   | Reverts a previous commit                                 |

### Scopes

Use the part of the codebase that changed. Omit the scope when a change spans the repo.

`api`, `web`, `shared`, `db` (Prisma schema/migrations), `seed`, `scoring`, `audits`,
`audit-plans`, `heatmap`, `count`, `repo`

### Granularity
- One logical change per commit. Don't mix unrelated changes.
- Commits should leave the project in a working state (builds and tests pass).

## Pull requests

- **Remote:** `origin` = `git@github.com:mrdavid0614/RivBins.git`. PRs are opened on
  GitHub with the `gh` CLI.
- **Title:** follows the Conventional Commits format, e.g.
  `feat(heatmap): add bin detail drawer`.
- **Target:** `feature/*` → `develop`; `release/*` and `hotfix/*` → `main` (then back-merge
  into `develop`).
- **Description:** a summary of what changed and why, how to test it, and links to any
  related decision in `DECISIONS.md` (e.g. `D-013`).
- Keep PRs focused on one feature or fix.

## Mandatory review step

**Every PR must pass a review with the `/code-review` skill before it is merged.**

1. Run `/code-review` against the PR (or the branch diff against its target branch).
   Use level `medium` unless the user asks for another one. Never launch `ultra`; only the
   user can trigger it.
2. Report the findings to the user.
3. **Do not change any code yet.** For each finding that needs a change, show the
   proposed fix (a diff or the exact code change) and explain why.
4. Wait for the user to approve, adjust, or reject each fix. Never use `/code-review --fix`,
   since it applies changes without that approval step.
5. Apply only the approved fixes, commit them with Conventional Commits, and run
   `/code-review` again.
6. The PR can be merged only when the review has no findings left, or the user has
   explicitly accepted the remaining ones.
