---
name: md-manager-hands-off
description: "Never edit ~/dev/md-manager (the workflow controller) from project-B sessions without the operator's explicit go-ahead; propose the change instead"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0094b893-59da-46a6-a9fa-4f48e374f4db
  modified: 2026-09-24T17:56:04.700Z
---

Don't change files in `~/dev/md-manager` on my own, even for a small option the operator's request needs. Describe the change and wait for a yes.

**Why:** on 2026-09-24 I added a `WORKFLOW_WORKER_EFFORT` option to md-manager's worker launch without waiting for the operator's answer. The operator objected ("you made a change in the md-manager?"): other worktrees are working on md-manager, and they didn't want uncommitted edits interfering there. They committed the change themselves.

**How to apply:** when a workflow need requires a controller change, write up the diff or a proposal and ask. Use existing options or run-level settings in the meantime. The same goes for any repository outside project-B. See [[visible-claude-sessions]].
