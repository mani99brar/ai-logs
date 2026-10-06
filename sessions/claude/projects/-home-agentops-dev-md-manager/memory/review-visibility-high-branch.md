---
name: review-visibility-high-branch
description: Branch `high` implementation of PRD_REVIEW_VISIBILITY (2026-09-21) — reviewer Write allow-list decision, per-message contract versions, scratch-run smoke test recipe, what the operator must still do
metadata:
  type: project
---

Branch `high` (worktree `~/dev/md-manager-high`) implemented slice A fully plus the B and C pre-run work on 2026-09-21; handoff in `docs/HANDOFF_REVIEW_VISIBILITY.md`, nothing committed, no feature run launched. It is one of three parallel benchmark branches (see [[review-visibility-implementation]] for `ultra`).

**Why:** Decisions here are not derivable from the PRDs. The native reviewer needs Write allow-listed to `review.completion.json`: the rule must be spelled `Edit(//<abs path>)` (Write follows Edit rules; a `Write(...)` rule is ignored, verified with print-mode probes on CLI 2.1.278) with `--permission-mode dontAsk` and `--add-dir <run>`. A reviewer that ends its turn asking a person shows as `blocked` in `claude agents`, so the reviewer wait treats `blocked` as waiting, not failure. Contract versions are per message (unchanged payloads stay 1.0.0, `reviewResult` 1.1.0, `runInputs` 1.2.0), and export `run-state.json` is 1.2.0, which the `main` adapter rejects until slice B's adapter merges.

**How to apply:** Smoke-test the review node alone on a scratch copy: copy plan/policy/bundle/packets+artifacts with path prefixes rewritten and packet hashes recomputed, create a two-pane Herdr tab and write `terminals.json`, then call `review_candidate(Pipeline(scratch))` with `PYTHONPATH` set to the repo (a script outside the repo cannot import `workflow` otherwise). Remove the scratch `review-worktree` from the main repo's worktree list afterwards. The second live smoke attempt ran the whole protocol (session 5865c9a6 blocked the merged project-workflows candidate with 1 P1 + 6 P2; 7 of 7 requirement quotes found verbatim in the named task text). Operator steps still owed: launch `review-result`, then `workflow export` on project-workflows-001 after B merges, then launch `run-inputs`. See [[workflow-live-run-lessons]].
