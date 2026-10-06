---
name: worker-test-policy
description: User's decision on test runs in workflow tasks — workers run targeted tests only; the trusted verifier runs the full policy checks
metadata:
  type: feedback
---

In feature lane tasks, tell workers to run only targeted tests (modules/specs for what they changed, contracts/server/build only when those areas change) and not the full suite; the trusted verifier runs every policy check once per phase.

**Why:** 2026-09-23 the user wanted faster runs and proposed skipping tests; after discussion they agreed the verifier must keep the full suite (worker-chosen tests are self-graded, cross-module and cross-lane effects), but worker-side full runs are pure overhead (~60% of slice 1 time was test execution).
**How to apply:** write this into every lane task's Acceptance; the full workflow suite runs via `python -m workflow.run_tests` (parallel, ~3.5 min). While a run's controller is older than completion 1.1.0, never ask workers to add completion keys (the 1.0.0 file must have exactly its keys). See [[portable-workflow-plan]].
