---
name: no-push-workflow-local-only
description: "kleros-v2 — never push anything; workflow/CLAUDE.md files stay local-only forever, only local commits"
metadata:
  node_type: memory
  type: feedback
  originSessionId: de0afaad-c8d0-411c-b4b3-a2b8e5555768
  modified: 2026-09-28T08:14:39.820Z
---

In kleros-v2, never push anything (no `git push`, no PRs from my side) — only local commits, including after a workflow run finishes. The md-manager workflow setup (`CLAUDE.md`, `features/`, incl. `features/_shared/web-setup.sh`) lives on the local branch `workflow/base` and must stay local-only even after the work is done: never let it into a branch that could be pushed; when preparing fix commits for a PR, cherry-pick only the fix commits onto a branch cut from `dev`, and leave pushing to the user.

**Why:** the user said so explicitly (2026-09-28): "remember not to push anything, and we want all these workflow and claude files to be local only even after we finish the workflow".

**How to apply:** before any git action in kleros-v2, commit locally only; never add CLAUDE.md/features/ to a non-`workflow/base` branch; mention the cherry-pick path instead of pushing. Related: [[kleros-v2-workflow-setup]].
