# Repair workspace 1 of run skeleton-001

Detached at 5c1a734e71c3312a8d9174f50951e27fcd26d0b7, the game snapshot. Commit the fix here, never on the source branch feature/skeleton/skeleton-001: integration needs it at the run's base 313eb87418e253d4c66f7fb7419c208d5dd01d07.

## Blocked: verify_game

worker/game attempt 2 at 5c1a734e71c3312a8d9174f50951e27fcd26d0b7, gate reasons verbatim:
- unit: no passing test evidence or failed tests
- integration: no passing test evidence or failed tests

Evidence:
- /home/agentops/.local/state/agent-workflows/project-B/skeleton/skeleton-001/verification/worker/game/2/packet.json
- /home/agentops/.local/state/agent-workflows/project-B/skeleton/skeleton-001/verification/worker/game/2/setup-0.log
- /home/agentops/.local/state/agent-workflows/project-B/skeleton/skeleton-001/verification/worker/game/2/check-0.log
- /home/agentops/.local/state/agent-workflows/project-B/skeleton/skeleton-001/verification/worker/game/2/check-1.log
- /home/agentops/.local/state/agent-workflows/project-B/skeleton/skeleton-001/verification/worker/game/2/check-2.log
- /home/agentops/.local/state/agent-workflows/project-B/skeleton/skeleton-001/verification/worker/game/2/check-3.log
- /home/agentops/.local/state/agent-workflows/project-B/skeleton/skeleton-001/verification/worker/game/2/check-4.log
- /home/agentops/.local/state/agent-workflows/project-B/skeleton/skeleton-001/verification/worker/game/2/browser-report-4.json

## Lanes to repair

game owns: package.json, package-lock.json, tsconfig.json, tsconfig.base.json, vitest.config.ts, .gitignore, .npmrc, README.md, CLAUDE.md, docs/architecture.md, apps, packages, tests, assets, infra, scripts. The fix may change only paths the named lanes own.
Checks:
- typecheck (typecheck): npm run typecheck
- unit (unit): npm run test:unit
- integration (integration): npm run test:integration
- build (build): npm run build
- browser (browser): npx --no-install playwright test --config=tests/e2e/playwright.config.ts

## Browser evidence

Every required scenario id appears in exactly one test title as `[scenario:<id>]`, and that test, when it passes, attaches exactly one `image/png` named `screenshot:<id>` (other attachments never count). RUNBOOK: Playwright evidence convention.

## Then

git -C /home/agentops/.local/state/agent-workflows/project-B/skeleton/skeleton-001/repair-workspace-1 commit -am '<what the fix does>'
/home/agentops/dev/md-manager/.venv/bin/python -m workflow repair /home/agentops/.local/state/agent-workflows/project-B/skeleton/skeleton-001 game --commit $(git -C /home/agentops/.local/state/agent-workflows/project-B/skeleton/skeleton-001/repair-workspace-1 rev-parse HEAD) --reason '<why the fix is needed>'
