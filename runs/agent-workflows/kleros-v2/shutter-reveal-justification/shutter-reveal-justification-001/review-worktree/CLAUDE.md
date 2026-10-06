# Kleros v2

Yarn 4 monorepo for the Kleros v2 court: `contracts` (Hardhat + Foundry), `subgraph`, `kleros-sdk`, `kleros-app` (shared React providers such as Atlas), `web` (the Court app: React, Vite, styled-components, wagmi/viem, react-query, i18next) and `web-devtools`.

- Install and prepare from the repository root: `bash features/_shared/web-setup.sh install`, then `build`, then `codegen`. `web` imports the built `dist/` of `contracts`, `kleros-app` and `kleros-sdk`, and generated code (`web/src/graphql`, `web/src/hooks/contracts/generated.ts`, `web/src/generatedGitInfo.json`) that is gitignored. A fresh worktree has none of them until these steps run.
- Web checks (from the root): `yarn workspace @kleros/kleros-v2-web test` (vitest, jsdom, React Testing Library), `yarn workspace @kleros/kleros-v2-web check-types`, `yarn workspace @kleros/kleros-v2-web check-style` (eslint). Run a single test file with `yarn workspace @kleros/kleros-v2-web test <path>`.
- Style: match the surrounding code. Prettier (120 columns, es5 trailing commas). Imports use the path aliases (`hooks/…`, `utils/…`, `src/…`). User-facing strings go through `t(...)` with the key added to `web/src/locales/en`, `es` and `fr` `translation.json`.
- Commits follow Conventional Commits (`fix(web): …`); a commitlint hook enforces it.
- Boundaries: never change anything under `features/`, `contracts/deployments/` or `contracts/src/` unless the task says so. Never deploy, send transactions or run scripts against a live chain. Never push.
- The machine is shared by parallel runs (4 cores, 7.9 GB): never stop processes by name pattern (`pkill -f`, `killall`); stop only the PIDs you started.

## Workflow (operator notes; workers skip this section)

Features under `features/` run with md-manager's workflow controller (`~/dev/md-manager/workflow`, see its README.md and RUNBOOK.md). `workflow` on PATH wraps `~/dev/md-manager/.venv/bin/python -m workflow`; with no `--repo` it targets this repository.

- This workflow setup (this file and `features/`) lives on the local branch `workflow/base`, cut from `dev`, and is never pushed. Launch from `workflow/base`; to open a PR, cherry-pick the run's fix commits onto a branch cut from `dev`.
- Interview: `/workflow-grill <feature>` writes `features/<feature>/decisions.md`. Commit the feature files before launching.
- Every acceptance item names the test that proves it.
- Web features share the policy `setup` in `features/_shared/web-setup.sh` (install ~2.5 min, build ~3.5 min, codegen ~0.5 min per verification). Codegen needs network access to the devnet subgraphs.
- Check: `workflow launch <feature> --dry-run`.
- Launch in a new Herdr tab: `WORKFLOW_WORKER_EFFORT=medium ANTHROPIC_MODEL=claude-opus-5-5 workflow launch <feature> --live --automatic --worker-timeout-seconds 10800 --review-timeout-seconds 3600`.
- Runs are stored in `~/.local/state/agent-workflows/kleros-v2/<feature>/<run-id>`. `workflow status|answer|resume|repair` take that run path.
