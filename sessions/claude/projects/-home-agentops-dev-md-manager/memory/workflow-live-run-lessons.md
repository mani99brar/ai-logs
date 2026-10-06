---
name: workflow-live-run-lessons
description: Operational lessons from the first live automatic LangGraph workflow run (2026-09-21) that are not visible in the code
metadata: 
  node_type: memory
  type: project
  originSessionId: 51a90443-d885-436e-98ca-f9604a2e21b3
  modified: 2026-09-21T15:52:42.538Z
---

First live automatic run of `python -m workflow launch project-workflows --live --automatic` completed on 2026-09-21: verified feature branch `feature/project-workflows/project-workflows-001` at b5385b3, reviewer approved with 6 P2 findings, no push. Run dir: `~/.local/state/md-manager-workflows/project-workflows/project-workflows-001`.

**Why:** Several things only surfaced live and shape how future runs are operated.

**How to apply:**
- One-time setup: `claude --dangerously-skip-permissions` must be accepted interactively once, or `claude --bg` with bypass exits 1.
- The source checkout is pinned to the feature branch at the base commit and must stay clean until integration. To run a *fixed* controller mid-run, use a separate worktree of `main` (e.g. `~/dev/md-manager-ctl`, symlink `node_modules`) and run `~/dev/md-manager/.venv/bin/python -m workflow ...` from there. Remove it after merging.
- To rerun failed lanes on the same snapshots: move `verification/` aside, delete `attempts.json`, then `git worktree prune` in the source repo (moved lane worktrees stay registered and block `worktree add`), delete any empty lane dirs, then `workflow retry <run>` followed by `workflow automatic <run> --live`.
- `workflow status` is refused while a supervisor step holds `controller.lock`; read `events.jsonl` / `report.html` instead.
- Worker transcripts live under `~/.claude/projects/<encoded worktree path>/<session uuid>.jsonl`; resume with `cd <worktree> && claude --resume <uuid>`. The `--name` label is not a resume key.
- Fixes committed to `main` from this run: launch-settle for late pid, Herdr pane shell settle, short lane TMPDIR (Unix socket 107-byte limit broke every tsx check), identical-failure retry stop, stale-task-error classifier. See [[md-manager-prd-tdd-workflow]].

- 2026-09-23: a Claude Code auto-update swaps the `claude` symlink; a controller call at that instant fails with `[Errno 2] No such file or directory: 'claude'` and blocks the run while workers keep running. Resume with `python -m workflow automatic <run> --live` once `which claude` resolves. The worker panes' `attach-one` can also fail ("background service is unavailable … claude.exe (deleted)"); sessions survive in the restarted daemon, so rerun `python -m workflow.interactive attach-one <run> --node <lane>` in each pane (pane ids in terminals.json).
- Cause confirmed 2026-09-23: newly launched worker sessions run Claude Code's auto-updater (`npm install --global @anthropic-ai/claude-code@<same version>`), which recurs per session (19:33 and 19:42 in workflow-guardrails-001). Workaround: resume/launch the controller with `DISABLE_AUTOUPDATER=1`. Proposed permanent fix (after the run, never while the checkout is pinned): controller sets DISABLE_AUTOUPDATER=1 for sessions it launches and retries a transient missing `claude` instead of blocking.
- Worker panes drop at every daemon restart; run attach-one in a `while true; do …attach-one…; sleep 3; done` loop in each pane so they reconnect themselves. The controller-side retry (run_claude, 60s grace) was validated live when a 19:57 reinstall caused no block.
