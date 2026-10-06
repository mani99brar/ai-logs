---
name: visible-claude-sessions
description: "Operator wants every Claude session a workflow run starts (challenge, workers, reviewers) visible in its own Herdr pane, not hidden headless print jobs"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0094b893-59da-46a6-a9fa-4f48e374f4db
  modified: 2026-09-24T08:50:12.064Z
---

Every Claude session a workflow run starts should open in its own Herdr pane: workers, reviewers and the design challenge.

**Why:** a headless `claude --print` job (the design challenge; reviewers under `--reviewer-transport print`) shows nothing until it finishes. The operator took it for a hang and pressed Ctrl-C twice, killing challenge attempts 1 and 2 of skeleton-001 (2026-09-24).

**How to apply:** suggest launches without `--reviewer-transport print` (the default `native` gives attachable reviewer panes). The challenge is always a print job in md-manager's `guardrails.py` (`run_challenge`), so a pane for it needs a change to md-manager. Make that change between runs, never while one is live. Until then, warn that the challenge is silent and point to `events.jsonl` plus the session transcript for progress.
