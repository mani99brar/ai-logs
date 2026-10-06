---
name: kleros-v2-workflow-setup
description: "How md-manager's workflow controller is wired into kleros-v2 (branch, setup script, gotchas)"
metadata:
  node_type: memory
  type: project
  originSessionId: de0afaad-c8d0-411c-b4b3-a2b8e5555768
  modified: 2026-09-28T08:14:44.510Z
---

Set up 2026-09-28. kleros-v2 runs features with md-manager's workflow (`workflow` on PATH), same as project-B. Setup lives on local branch `workflow/base` (from `dev`): `CLAUDE.md`, `features/_shared/web-setup.sh` (install/build/codegen), `features/<feature>/`. First feature: `shutter-reveal-justification` (issue #2565, safe fix only). Runs under `~/.local/state/agent-workflows/kleros-v2/<feature>/`.

Gotchas: the machine has only Node 24 (repo pins 20/22 via volta, not installed) so `web/scripts/gitInfo.js` fails — the setup script writes the git info inline. `yarn install` runs `husky install`, which sets `core.hooksPath=.husky` in the shared `.git/config` and breaks commits in checkouts without `.husky/_` — use `HUSKY=0`. Web codegen needs network (devnet subgraphs). Web tests are not run in upstream CI.

Monitor log for runs: `~/dev/kleros/workflow-monitor/`. Related: [[no-push-workflow-local-only]].
