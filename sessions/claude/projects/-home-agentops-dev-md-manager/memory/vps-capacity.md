---
name: vps-capacity
description: VPS limits for parallel agents and test runs (4 cores, 7.9 GB, Claude Max) measured 2026-09-23
metadata:
  type: reference
---

The VPS has 4 cores and 7.9 GB RAM (~4.3 GB free with dev servers and the user's long-lived Claude sessions running). The Workflow tool caps each workflow at CPUs-2 = 2 concurrent agents, so split independent work into several workflows (about one per group) from the start. Measured with 8 agents across 4 workflows: load 1.5, CPU pressure ~8%.

Safe at once: 8–10 agents writing code; at most 1 full `python -m workflow.run_tests` (uses all cores ~3.5 min) and 1–2 Playwright suites (1–1.5 GB each); 3–4 feature-run worker lanes (`claude --bg` sessions, 300–500 MB each). The user is on Claude Max, so usage quota is often the binding limit, not CPU.

When the user asked (2026-09-23) why only 2 agents ran, they wanted more parallelism; see [[portable-workflow-plan]].
