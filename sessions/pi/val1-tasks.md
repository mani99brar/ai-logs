# vea (TypeScript) task backlog

> Single source of truth for `/val1` (single task) and `/val1-batch` (parallel)
> runs in `/home/agentops/dev/vea_validators/vea`. Keep it current: mark `done`
> when a task is committed.

<!-- FORMAT (parseable by /val1-batch)
One task per `## [id] title` block. Fields are `key: value` lines:

    ## [01] Short title
    seam: path/to/file.ts, path/to/other.ts, area-name   # files/areas this task touches
    deps: none | 02,04                                    # task ids this must run after
    status: todo | in-progress | done                     # only `todo` is picked up by --all
    description:
    One or more lines of task text (multi-line allowed; keep indented 4 spaces
    after the first line, or use blank lines).

Parallel rule: two tasks may run in the same batch ONLY if their `seam` sets are
disjoint AND neither lists the other in `deps`. Any shared seam or dep edge makes
them sequential (the earlier one must integrate first).

NOTE: /val1-batch is for CODE tasks (write -> review). Pure review/discovery
tasks (a1) are run as single /val1 runs that produce a document, or handled
directly by the user.
-->

## [a1] Review validator-cli changes vs dev (report only)
seam: validator-cli/
deps: none
status: todo
description:
Produce `review-validator-dev-vs-fix.md` for the `fix/val-doc-1` branch.
Full spec in `tasks/task-a1-validator-review.md`. This is a review/analysis
task, not a code change: `git diff dev...fix/val-doc-1 -- validator-cli/` file-by-file,
classify every behavioral change as BUG/RISK/NIT, run the cross-chain
block-integrity pass, resolve the 7 seeded leads, and read + answer the
author's inline comments in the diff (esp. epochHandler.ts lines 3 and 129).
Do NOT fix anything.

## [b1] relayer: stable Hashi MessageDispatched pagination (#518)
seam: relayer-cli/src/utils/hashiHelpers/envioQueries.ts, relayer-cli/src/utils/hashiHelpers/envioQueries.test.ts
deps: none
status: todo
description:
`envioQueries.ts` paginates `MessageDispatched` by `blockNumber` alone with a
batch `limit`. When one block holds more matching events than the batch size,
the checkpoint advances past that block and the remaining same-block events are
permanently skipped (relayer messages lost). Implement stable event-level
pagination: cursor on `(blockNumber, logIndex)` or drain every matching event in
the checkpoint block before advancing. Keep checkpoint behavior correct for
full, partial, and empty batches. Add a regression test with >10 matching events
in one block proving all are processed across consecutive batches.

## [b2] veashi-scanner: fail closed on partial VEA epoch detail (#514)
seam: veashi-scanner/lib/vea/client.ts, veashi-scanner/hooks/useVeaEpoch.ts
deps: none
status: todo
description:
`fetchEpochDetail` currently returns partial VEA epoch data when an inbox
message-page request or an outbox relay-batch request fails, because it conflates
a failed `gql` request with a valid empty page/batch. Distinguish failure from
empty, propagate the indexer failure instead of returning partial data, and
surface it in `useVeaEpoch` as a load error. A valid empty page/batch must still
end pagination normally. Add tests for failed vs valid-empty for both request
types.

## [b3] CI: scope Dependency Review GHSA exceptions (#512)
seam: .github/workflows/dependency-review.yml
deps: none
status: todo
description:
`dependency-review.yml` allows `GHSA-fvhg-p4hf-79x3` and `GHSA-2g4f-4pwh-qvx6`
globally via `allow-ghsas`, which filters only by GHSA id — a later dependency
update could silently retain an unreviewed exception. Preserve the two IDs but
add an enforced owner + expiry/review date (CI-validated), or CI validation of
the intended vulnerable package versions and dependency paths. Document the
rationale and review process.
