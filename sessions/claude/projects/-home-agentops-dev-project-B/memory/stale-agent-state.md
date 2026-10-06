---
name: stale-agent-state
description: "A finished workflow session can show state \"working\" in `claude agents --json` and stall the md-manager controller; a one-line reply nudge through the Herdr pane unsticks it"
metadata:
  node_type: memory
  type: reference
  originSessionId: a169f327-9a20-48cb-95e2-5a97878b97d9
  modified: 2026-09-24T21:15:45.105Z
---

md-manager's controller waits for `state` idle or done in `claude agents --json`, not `status`. On 2026-09-24 (Claude Code 2.1.282), two finished sessions stayed `status: idle, state: working` for 15–25 minutes after writing their completion files: a reviewer and a worker. The controller stalled until the review or worker deadline.

**Fix that worked:** send the session a message through its Herdr pane, `herdr pane send-text <pane> "Operator: your … file is final. Do not run tools or change any file. Reply with exactly: … complete."`, then `herdr pane send-keys <pane> Enter`. The session replies, its state updates, and the controller moves within seconds. `herdr pane run` doesn't reach an attached `--bg` view.

**Don't:** run `claude ps`. It isn't a listing command; it starts a one-shot Claude session with "ps" as the prompt. See [[md-manager-hands-off]]; this could be reported to the md-manager operator.
