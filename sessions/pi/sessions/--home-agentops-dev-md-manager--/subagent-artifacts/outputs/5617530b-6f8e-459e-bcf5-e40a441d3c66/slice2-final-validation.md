# Test Report: final Slice 2 pruned-layout correction

## Commands run
Independently rerun sequentially in `/home/agentops/dev/md-manager`, branch `main`, HEAD `cec5fce`. Read current package scripts, Playwright configuration and handoff environment/follow-up notes. No root `plan.md` present. Bounds: 120 seconds per unit/lint/build command; 180 seconds per browser run; 10 seconds for housekeeping checks.

- `set -o pipefail; npm run test:unit 2>&1 | tail -65` (exit code 0; output tail only, full suite executed)
- `npm run lint` (exit code 0)
- `npm run build` (exit code 0)
- `MD_MANAGER_WEB_PORT=5184 MD_MANAGER_API_PORT=3014 npm run test:e2e` (exit code 0)
- `MD_MANAGER_TEST_PREVIEW=1 MD_MANAGER_WEB_PORT=4184 MD_MANAGER_API_PORT=3014 npm run test:e2e` (exit code 0)
- `git diff --check` (before/after: exit code 0, empty output)
- `git status --short -- fixtures/` (before/between/after: exit code 0, empty output)
- `find fixtures -name 'scratch-*' -print` (before/between/after: exit code 0, empty output)
- `git diff --cached --name-only` (before/after: exit code 0, empty output)
- `git status --short`, `git branch --show-current`, `git rev-parse --short HEAD` (before/after: exit code 0)
- `git diff --stat` (after: exit code 0)
- `ss -ltnp '( sport = :5173 or sport = :3001 or sport = :5184 or sport = :4184 or sport = :3014 )'` (before/after: exit code 0)
- `ss -ltnp '( sport = :5184 or sport = :3014 )'` (immediately before dev: exit code 0, no listeners)
- `ss -ltnp '( sport = :5184 or sport = :4184 or sport = :3014 )'` (after dev, immediately before preview: exit code 0, no listeners)

## Results
| Check | Result | Evidence |
|-------|--------|----------|
| Full unit/API/model suite | pass | `tests 48`, `pass 48`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`, `duration_ms 1162.233675` |
| New pruning regression | pass | `a layout snapshot after pruning restores without retaining removed visible nodes (20.797978ms)` |
| Lint | pass | `eslint .`; no diagnostics |
| Typecheck and production build | pass | `tsc -b && vite build`; `308 modules transformed.`; `built in 370ms` |
| Full dev E2E | pass | `Running 52 tests using 1 worker`; `52 passed (53.1s)` |
| Full built-preview E2E | pass | `Running 52 tests using 1 worker`; `52 passed (35.8s)` |
| New deletion return via button | pass | `tests/document-history-review.spec.ts:7:3` passed dev 995ms / preview 682ms |
| New deletion return via native history | pass | `tests/document-history-review.spec.ts:7:3` passed dev 941ms / preview 615ms |
| Large-document gate | pass | `tests/document-failure.spec.ts:176:1` passed both modes; whole-test durations 3.2s / 1.7s (not individual tab timing) |
| Fixture preservation | pass | `tests/zz-fixtures-clean.spec.ts:6:1` passed both modes; fixture status and scratch searches empty before/between/after |
| Diff hygiene and staged state | pass | `DIFF_CHECK_EXIT=0` before/after; cached-name output empty |
| Server ownership and cleanup | pass | Test ports free before use and after completion; protected listeners retained same PIDs |

**Actual total: 152 test executions passed, 0 failed** (48 unit + 52 dev + 52 preview), matching requested counts. Lint/build also passed. No test reruns, retries, alternate runners or infrastructure workarounds were used.

## Failures
None. Injected backend error logging in successful negative tests is expected, not a product or infrastructure failure.

## Coverage of plan
Requested final full verification seam completed after the pruned-layout correction. New model and both browser deletion-return regressions passed. Existing suites also cover confined descriptor reads and error classification, capability rejection and descriptor cleanup, single-read byte hashing, per-entry history restoration, stale-response protection, fresh reopen states, loading announcements, malformed actual navigation in both serving modes, Markdown safety/source fidelity, performance gates and Slice 1 regressions.

The handoff documents test-first reds for the final correction; this run independently establishes present green behavior, not historical red evidence.

## Preservation and cleanup evidence
- Protected dev services remained listening at `127.0.0.1:3001` PID **534562** and `127.0.0.1:5173` PID **528579**, unchanged before/after. No server was manually killed or reused.
- Ports **5184**, **4184**, **3014** were free initially; applicable ports were rechecked immediately before each suite. Dev ports were released before preview; all three were free afterward. Playwright owned server lifecycle with `reuseExistingServer:false` and one worker.
- Existing tests owned scratch creation/removal. No manual fixture cleanup was needed; no committed samples were edited.
- `git status --short` identical before/after: 15 tracked modified paths plus 12 untracked entries (including `src/document/`). The intentionally dirty implementation tree remains intact. Tracked summary: `15 files changed, 536 insertions(+), 90 deletions(-)`; excludes untracked files.
- Existing tracked modifications: `README.md`, `package.json`, `playwright.config.ts`, `server/app.ts`, `server/index.ts`, `src/App.css`, `src/App.tsx`, `src/graph/Breadcrumbs.tsx`, `src/graph/GraphCanvas.tsx`, `src/graph/Outline.tsx`, `src/graph/layout.ts`, `src/graph/model.ts`, `tests/graph.spec.ts`, `tests/unit/model.test.ts`, `vite.config.ts`.
- Existing untracked entries: `docs/HANDOFF_SLICE2.md`, `docs/PRD_SLICE2.md`, `docs/PRD_SLICE3.md`, `server/file.test.ts`, `server/files.ts`, `src/document/`, `tests/document-failure.spec.ts`, `tests/document-history-review.spec.ts`, `tests/document-render.spec.ts`, `tests/document-review.spec.ts`, `tests/document.spec.ts`, `tests/unit/document.test.ts`.
- No source/docs/tests/config/VCS edits by verifier; only this external report authored. Requested build/test commands generated their normal ignored outputs. No files staged.

## Unverified
- Browser gate remains Chromium with reduced motion; not all browsers/devices.
- Backend exercised on supported Linux/procfs only; tests do not prove exclusion of every conceivable filesystem race.
- One full run per mode does not statistically establish absence of performance flakes.
- Historical TDD sequence and architectural reviewer sign-off are separate from current verification. No historical failure was reconstructed or code mutated.

## Recommendation
**pass** — all requested final checks passed, including all three new pruning/deletion regressions; protected services and fixture/staged hygiene preserved. Remaining limits are coverage boundaries, not observed failures.
