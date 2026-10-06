---
name: workflow-codes-i-maintain
description: "For project-B game code, the md-manager workflow writes the code; my role is to maintain runs (feature files, resumes, follow-ups, merges) and record decisions for the operator"
metadata:
  node_type: memory
  type: feedback
  originSessionId: a169f327-9a20-48cb-95e2-5a97878b97d9
  modified: 2026-09-24T20:01:52.722Z
---

For project-B, game code is written through workflow runs, not by me directly. My job is to maintain them: write features, handle challenge pauses and review blocks with follow-up features, merge approved runs, and keep a decisions log for the operator.

**Why:** on 2026-09-24 the operator said, before sleeping: "Use the workflow to code, your work is to maintain them… make decisions for me. Keep of note of these decisions we will discuss them when i wake up." They also stressed that the game should be really fun and good.

**How to apply:** prefer a follow-up workflow feature over a direct fix, unless the operator asks for a direct one (as they did for docking). When deciding alone, log each decision with its reasoning in `~/.local/state/agent-workflows/project-B/operator-logs/decisions-overnight.md`. See [[md-manager-hands-off]] and [[handoff-diff-review]].
