# Test Report: independent unit, lint, build, dev and preview validation

## Commands run
Working directory: `/home/agentops/dev/md-manager`; branch `slice-3-editing-and-file-operations`; HEAD remained `a5e1a5d81d37d2487ac413ed4e40fd933c87963c`.

Executed sequentially, each bounded (180 seconds for unit/lint/build, 600 seconds per browser suite):
- `npm run test:unit > /tmp/md-manager-validation-338c3409-unit.log 2>&1` (exit code 0)
- `npm run lint > /tmp/md-manager-validation-338c3409-lint.log 2>&1` (exit code 0)
- `npm run build > /tmp/md-manager-validation-338c3409-build.log 2>&1` (exit code 0)
- `MD_MANAGER_WEB_PORT=5284 MD_MANAGER_API_PORT=3114 npm run test:e2e -- --output=/tmp/md-manager-validation-338c3409-dev-results > /tmp/md-manager-validation-338c3409-dev.log 2>&1` (exit code 0)
- `MD_MANAGER_TEST_PREVIEW=1 MD_MANAGER_WEB_PORT=4284 MD_MANAGER_API_PORT=3114 npm run test:e2e -- --output=/tmp/md-manager-validation-338c3409-preview-results > /tmp/md-manager-validation-338c3409-preview.log 2>&1` (exit code 0)

Read package scripts and Playwright/Vite configuration before running. `ss -ltn '( sport = :5284 or sport = :4284 or sport = :3114 )'` initially and `ss -ltn '( sport = :4284 or sport = :3114 )'` before preview returned no listeners (exit 0). Each browser suite reported `Running 98 tests using 1 worker`; no retries or repeat runs were performed.

Preservation checks (all exit 0): `git status --porcelain --untracked-files=all -- fixtures` and `find fixtures -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum` before tests and after each browser suite; `git diff --binary | sha256sum` before and after; `git status --short`, `git rev-parse HEAD`, and final `git diff --cached --stat`.

## Results
| Check | Result | Evidence |
|-------|--------|----------|
| Unit | pass | `ℹ tests 102`, `ℹ pass 102`, `ℹ fail 0`, `ℹ skipped 0` |
| Lint | pass | `> eslint .`, exit 0, no diagnostics |
| Build / TypeScript | pass | `> tsc -b && vite build`; `✓ 338 modules transformed.`, `✓ built in 693ms` |
| Full dev browser suite | pass | `98 passed (2.4m)` |
| Full preview browser suite | pass | `98 passed (1.7m)` |
| Fixture preservation | pass | Git fixture status empty before/after both suites; aggregate file-content/path checksum unchanged: `5ec5bc9ed1b98b41e44fe5fb389c65c65650958e980817114dc47f654a1bcf53` |
| Existing user diff preserved | pass | Diff checksum unchanged: `3db17e2d7e0b0a7ecb393ba5b97c5d99fb8cd16af3744b3565e84092dd7fd731`; same 13 modified files; no staged changes |

Total: 298 test executions passed, 0 failed, 0 skipped; lint and build also passed.

## Failures
- None in this validation. Unit logs contain deliberately injected EIO/EACCES error logging; associated tests passed, not environment or product failures.
- Build has a non-failing bundle-size warning: `Some chunks are larger than 500 kB after minification.` JS bundle is 972.73 kB (319.93 kB gzip).
- Previously disclosed create/double-submit flake was not reproduced: `tests/operations.spec.ts:42:1` passed in dev (1.5s) and preview (1.1s). These clean runs do not establish its cause or prove it eliminated. No retries were used to mask failures.

## Coverage of plan
No `plan.md` present. All explicitly requested verification gates ran.
- Reload serialization, non-roundtrippable recovery, retained drafts, and abandoned-session isolation: browser cases in `tests/edit-recovery.spec.ts:374-484` passed in both modes.
- Pending Escape protection: Reload and Rename cases at `tests/edit-recovery.spec.ts:427` and `tests/operations.spec.ts:312` passed in both modes.
- Navigation-context protection: delayed response/refresh and history cases at `tests/operations.spec.ts:331-406` passed in both modes.
- Bounded staging basename: unit log lines 696/699 report passing 255-byte ASCII and UTF-8 basename PUT tests.
- Exclusive create/copy publication: unit log lines 498/518/521/524 report passing external-destination preservation and file/symlink collision tests.
- Final target recheck classification: unit log lines 702/705/709 report passing delete, symlink, and io-error cases.
- Browser suites never concurrent; build completed before preview. Logs and browser outputs are outside the repository. No source edits, commits, or GitHub posting performed.

## Unverified
- Previously disclosed intermittent create/double-submit failure root cause remains unknown; only one full run per serving mode was requested/performed.
- External-writer recheck/rename race and other explicitly excluded platform/permission/recovery redesigns were not independently proven safe by these gates.

## Recommendation
pass — all five requested gates passed independently, with unchanged fixtures and user diff; retain disclosure of the historical flake.
