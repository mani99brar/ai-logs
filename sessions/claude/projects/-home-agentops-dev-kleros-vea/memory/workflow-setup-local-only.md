---
name: workflow-setup-local-only
description: "Vea's md-manager workflow setup (CLAUDE.md, features/, .husky/pre-push) lives only on local branch workflow/base and must never be pushed to origin"
metadata:
  node_type: memory
  type: feedback
  originSessionId: afa2430f-5cb0-4dfe-abe4-211eddeab50d
  modified: 2026-09-28T09:56:46.956Z
---

The md-manager workflow setup in Vea (`CLAUDE.md`, `features/`, `.husky/pre-push`) is committed only on the local branch `workflow/base`, cut from `dev`. Never push it or any branch derived from it (including workflow run branches `feature/<feature>/...`) to origin, and never add these files to `dev` or a PR branch. To ship a run's work, cherry-pick its fix commits onto a fresh branch cut from `dev`. The same pattern is used in kleros-v2.

**Why:** the user said on 2026-09-28: "we don't want to push these workflow and claude files to origin".

**How to apply:** do all workflow/feature scaffolding on `workflow/base`. A local pre-push guard (`.git/hooks/pre-push`, plus `.husky/pre-push` on that branch) refuses pushes containing `CLAUDE.md` or `features/`. Running `yarn install` without `HUSKY=0` sets `core.hooksPath=.husky`, and after that the `.git/hooks` copy no longer runs.
