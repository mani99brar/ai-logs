---
name: open-workflow-issues
description: Open workflow issues from workflow-guardrails-001 the user wants fixed before slice 3; list lives in ~/dev/md-manager-reviews/workflow-guardrails-001-issues.md
metadata:
  type: project
---

The user asked (2026-09-23) to record and fix every issue seen during the slice 2 run; they hit the Claude Code auto-update problem twice and want it fixed for good.

Checklist file: ~/dev/md-manager-reviews/workflow-guardrails-001-issues.md (P1: auto-update reinstall loop blocks controller + drops panes; P1: transient errors trigger worker stop; P2: pane reconnect, git worktree race, silent launch pane, runner log lost exception line; decisions on challenge edits/outside-graph/Herdr Enter).

**Why:** runs were blocked four times by reinstalls; the user considers the workflow not smooth until these are fixed.
**How to apply:** after workflow-guardrails-001 integrates, fix these (start from the uncommitted retry patch in ~/dev/md-manager-ctl2) before writing slice 3. See [[workflow-live-run-lessons]], [[portable-workflow-plan]].

- 2026-09-23 21:10 UTC: the user went to sleep and asked me to finish overnight: slice 2 review fixes, then rebase the six fix branches (fix/autoupdate, browser-rules, worktree-lock, attach-reconnect, operator-visibility, challenge-resume; worktrees ~/dev/mdm-fix-<group>, base 7c5e37e) onto feature/workflow-guardrails/workflow-guardrails-001, run the full trusted verifier for both lanes and both phases (scratchpad verify_manual.py), then fast-forward main locally (never push). Lane repair: implement the minimal version of ~/dev/md-manager-reviews/lane-repair-design.md if it's reasonably sized. Tick items in the issues file as they land.

- 2026-09-24 ~05:30 UTC: all issues fixed with slice 2 on branch integrate/slice2 (4 fix rounds, 3 independent review passes, trusted verifier by hand via scratchpad verify_manual.py). New operator surface: `workflow repair <run> <lane> --commit/--workspace`, `workflow check-report`, exit 75 = Claude Code unavailable (resume with automatic --live), attach-one reconnects itself, `--settings` env for --bg sessions (verified live). Deferred: repair --session worker, export 1.6.0 repairs view, candidate reuse, docs-coverage test.
