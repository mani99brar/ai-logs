---
name: handoff-diff-review
description: "While monitoring workflow runs, do NOT send review subagents at worker handoff; report only from the workflow's own logs (timeline, packets, reviewer verdicts)"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0094b893-59da-46a6-a9fa-4f48e374f4db
  modified: 2026-09-24T16:19:10.884Z
---

When monitoring workflow runs, don't spawn review subagents to read worker diffs. Report only what the workflow's logs show: `events.jsonl`, verification packets and check logs, reviewer completion files, and `workflow status`.

**Why:** on 2026-09-24 the operator said: "No dont send a review sub agent, workflow review is enough. I only want your workflow logs". Earlier that day handoff subagents had found real P1s the official reviewers missed (duel-core-001's keyboard-throw and whiff-cancels-throw bugs). The operator still prefers to rely on the workflow's own independent review.

**How to apply:** at a worker handoff, report the freeze event, then verification results (test counts from the packet), the candidate, and the reviewers' verdicts and findings from `review-<id>.completion.json`. Diagnosing a failure from the run's own logs (for example a check log showing exit -15) is still fine. Don't read or review the diff independently unless the operator asks. See [[visible-claude-sessions]].
