---
name: player-realistic-input-tests
description: "Gameplay acceptance must include tests that press keys the way players do (held throttle, quick taps), not idealised inputs"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0094b893-59da-46a6-a9fa-4f48e374f4db
  modified: 2026-09-24T14:17:40.836Z
---

When writing or reviewing tasks for gameplay features, require at least one test that drives input the way a player does: keys held through an action, quick taps shorter than a 20 Hz world step, arriving at full speed.

**Why:** on 2026-09-24, world-sea's docking passed every check and two reviews, but failed the operator's first manual playtest. The e2e test released the throttle before holding E. Players hold ↑ into the dock and tap E, which never docked, and after a first fix was cast off on the next step. The fix was commit `7fbf5a6` on project-B `main`.

**How to apply:** add a line to each gameplay task's acceptance ("an integration test drives it with realistic held/tapped input"). When reviewing, check whether the tests only use idealised input. For a new playable feature, offer the operator a quick manual playtest before calling it done. See [[handoff-diff-review]].
