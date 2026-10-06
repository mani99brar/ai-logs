---
name: workflow-run-review-is-read-only
description: "When asked to review a live workflow run's code changes, only read and log findings; never edit the lane worktrees, the pinned checkout, or any run state"
metadata:
  node_type: memory
  pinned: false
  originSessionId: 62e712ec-d9d7-4719-934c-1628a62f37b8
  modified: 2026-09-22T22:59:54.804Z
---

When the user launches a live `python -m workflow launch ... --live --automatic` run and asks for recurring review passes over the lane worktrees, the job is strictly read-only: review the diffs for bugs, contract mismatches, ownership violations and missing tests, and record everything in a markdown log outside the repository (used `~/dev/md-manager-reviews/<run-id>-review-log.md` on 2026-09-22). Do not fix anything in the worktrees or the source checkout, do not commit, and do not touch files in the run directory.

**Why:** the user stated it explicitly ("review for code and bugs and issues, don't make any changes"), and any outside edit would corrupt the run's evidence: the source checkout is pinned at the base commit, the lane worktrees are the workers' own, and the controller and trusted verifier judge acceptance from that state. Findings are for the operator to act on after the run, not for the reviewer to apply mid-run.

**How to apply:** use read-only commands only (`git status`, `git diff`, transcript summaries, `cat`). Log findings with a severity (P0 to P3) and file references so the operator can act on them. See [[workflow-live-run-lessons]] for the rest of the live-run operating notes.
