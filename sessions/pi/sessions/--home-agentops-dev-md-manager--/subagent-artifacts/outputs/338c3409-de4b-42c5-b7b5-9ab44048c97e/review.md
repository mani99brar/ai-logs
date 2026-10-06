## TL;DR

**Accept: the cleanup correction resolves the previous P1 finding. No remaining blockers identified within this bounded review.**

Reviewed `publishFile` and all eight added regression cases. Successful publication and original failures now survive cleanup errors without destination rollback.

## Change map

- `server/mutations.ts:124–132` — isolate staging cleanup errors from the primary mutation result.
- `server/mutate.test.ts:604–655` — eight fault-injection cases covering create and copy.

## Walkthrough

Publication still commits at successful `fs.link()` (`server/mutations.ts:123`). Cleanup now catches unlink failures, silently tolerates `ENOENT`, and warns for other errors without throwing (`:128–132`).

Consequently:
- A published destination remains a successful mutation.
- Collision and write errors retain their original meaning.
- Cleanup never removes the destination.

Tests verify successful results and complete destination bytes, preservation of external collision content, original write-error identity, absence of partial destinations, warning behavior, and unchanged source content (`server/mutate.test.ts:637–650`).

## Decisions & assumptions

- **Cleanup is best effort:** an unlink failure can leave a non-Markdown staging file; the server logs it rather than misreporting a committed mutation (`server/mutations.ts:126–130`).
- No publication flag is necessary: catching only the cleanup rejection preserves the surrounding `try` block’s success or original exception.
- Tests restore mocks and remove their temporary fixture trees (`server/mutate.test.ts:15–23`, `:651`).

## Risks / findings

- **P0:** None identified.
- **P1:** Previous cleanup-result ambiguity **resolved**.
- **P2:** No new finding in this correction.

The eight cases directly cover the requested failure semantics, including strict identity preservation for the original write error (`server/mutate.test.ts:641`).

## What was NOT done

No edits, browser tests, or independent test execution during this follow-up. Scope was limited to the cleanup correction and its tests; previously documented out-of-scope limitations remain unchanged.

The reported independent dev **98/98** and preview **98/98** results were supplied by the orchestrator, not independently rerun here.

## Verification checklist

- [x] Inspected implementation and all eight regression cases.
- [x] Inspected red log: all eight added cases failed before correction (`/tmp/md-cleanup-red.log:281–292`).
- [x] Inspected final unit log: **110 passed, 0 failed**, including all eight cases (`/tmp/md-cleanup-unit.log:525–532`, `:742–745`).
- [x] Inspected lint/build logs: no lint errors; build completed with a bundle-size warning.
- [x] `git diff --check HEAD` passed.

**No additional correction requested before acceptance.**

## Understanding check

- **When does publication commit?** When the exclusive hard link succeeds.
- **Can cleanup failure turn success into failure or replace the original error?** No; it is caught separately.
- **What remains after an unlink failure?** Potentially a staging file and a server warning—not destination rollback.