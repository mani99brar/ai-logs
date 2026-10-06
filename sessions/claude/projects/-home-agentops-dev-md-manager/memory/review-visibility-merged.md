---
name: review-visibility-merged
description: PR 11 (feature-ultra, all three review-visibility slices) merged to main 2026-09-22; feature dirs removed; live run re-exported at 1.2.0; PRs 9 and 10 left open
metadata:
  type: project
---

On 2026-09-22 PR 11 (branch `feature-ultra`) was merged to main as merge commit `af119c7` after a three-way comparison with PR 9 (`feature-opus`, slice A only) and PR 10 (`feature-high`, slice A plus B/C pre-run work). PR 11 implemented slices A, B and C of [[md-manager-prd-tdd-workflow]] directly in one commit. Before merge, `features/review-result/` and `features/run-inputs/` and their `launch` choices were removed (commit `86a620f`) because the work was already in the tree. After merge the live run project-workflows-001 was re-exported with `workflow export` to version 1.2.0 (backup of the 1.0.0 run-state in that session's scratchpad only).

**Why:** the comparison found PR 9 live-broken (prompt after variadic `--add-dir`, no allow rule under `dontAsk`), PR 10 shipping an export bump the main adapter rejected, and PR 11 the only end-to-end working delivery.

**How to apply:** PRs 9 and 10 are still open and superseded; close them rather than merge. The comparison worktrees `~/dev/md-manager-opus`, `-high`, `-ultra` were removed on 2026-09-22; the branches `feature-opus`, `feature-high`, `feature-ultra` still exist locally and on origin. `workflow/CHEATSHEET.md` (CLI cheatsheet) was added uncommitted the same day. Known non-blocking debts in main: hand-written `contracts/workflow/reviewCompletion.schema.json` outside the zod contract convention, duplicated inputs loading/error panels in the UI, a third copy of the tab keyboard handler, and the reviewer pane has not yet run inside a full automatic run. See [[review-visibility-implementation]] and [[review-visibility-high-branch]] for the other branches.
