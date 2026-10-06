---
name: review-visibility-implementation
description: "PRD_REVIEW_VISIBILITY (slices A/B/C) implemented 2026-09-21 on branch `ultra` in worktree ~/dev/md-manager-ultra; parallel benchmark worktrees high/opus/ultra share node_modules and the main checkout's venv"
metadata: 
  node_type: memory
  type: project
  originSessionId: 9ef1cac0-1832-43a8-bc1f-712f36914ef4
  modified: 2026-09-21T19:19:28.839Z
---

On 2026-09-21 the user ran three parallel worktrees of md-manager (`~/dev/md-manager-high` branch `high`, `~/dev/md-manager-opus` branch `opus`, `~/dev/md-manager-ultra` branch `ultra`) each implementing `docs/PRD_REVIEW_VISIBILITY.md` (reviewer as native session, review results in the viewer, run inputs) at different effort levels. This session worked in `md-manager-ultra` with ultracode workflows; handoff in `docs/HANDOFF_REVIEW_VISIBILITY.md`.

**Why:** Worktrees have no `node_modules` or `.venv`; the live run directory (`~/.local/state/md-manager-workflows/project-workflows/project-workflows-001`) is shared by all branches and must not be re-exported from a branch until merged, because the `main` adapter only accepts export version 1.0.0.

**How to apply:** In a worktree, `ln -s ../md-manager/node_modules node_modules` and use `../md-manager/.venv/bin/python`. Test the re-export and viewer against a copy of the run (rsync without `worktree-*`, `candidate`, `review-worktree`, `verification/*/*/*/worktree`); `workflow export` uses a lightweight runtime so a copy without worktrees exports. Contract payload versions: existing payloads stay `1.0.0`; `reviewResult` and `runInputs` carry `1.2.0`; export `run-state.json` is `1.2.0` with `review` and `inputs` sections. See [[workflow-live-run-lessons]] and [[md-manager-prd-tdd-workflow]].
