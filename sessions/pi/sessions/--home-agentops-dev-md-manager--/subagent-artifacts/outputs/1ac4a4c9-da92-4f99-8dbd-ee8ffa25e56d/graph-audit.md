# Graph and lifecycle audit

Static inspection only; no files changed, tests run, or agents launched.

## Findings

### P1 — Automatic reviewers can launch without `--live`
**Location:** `workflow/pipeline.py:957–972`, also `897–905`.

`retry` only forbids pending `launch_*` nodes; it invokes the graph without checking `--live`. On an automatic run, successful verification continues into the review node, which calls `review_candidate` and launches reviewers. Manual `freeze` likewise accepts automatic runs without this authorization.

**Scenario:** An automatic run stops at a failed verification check. The operator runs `retry --node <lane>` without `--live`, and the check succeeds.

**Impact:** New paid reviewer sessions launch despite the documented authorization requirement and the retry path’s explicit “No new agent launch” guarantee.

### P1 — Integration can update the wrong branch during concurrent operations
**Location:** `workflow/pipeline.py:552–564`.

Branch/base checks and `git merge --ff-only` are separate operations. The controller lock is scoped to the run directory (`workflow/sessions.py:143–154`), not the shared source checkout.

**Scenario:** After run A validates its source branch, another supported feature launch executes `git switch -c` in that repository (`workflow/launch.py:105,157–159`). Both branches initially point to A’s base. A’s subsequent merge fast-forwards the newly checked-out branch instead.

**Impact:** An unrelated branch receives A’s candidate while A records successful integration. `--ff-only` does not enforce the previously checked branch identity.

### P1 — Failure cleanup abandons remaining workers after the first stop error
**Location:** `workflow/pipeline.py:356–358`; failure-cleanup caller: `workflow/automatic.py:808–818`.

`stop_workers` stops lanes sequentially and immediately propagates any exception. Automatic failure handling catches that exception, logs it, and exits without attempting the remaining workers.

**Scenario:** Automatic handoff processing fails, and the first worker is missing from inventory or its stop command fails. Other workers remain live and independently identifiable.

**Impact:** Those workers receive no stop attempt and can continue editing and consuming usage after the run has failed. Unlike deliberate interruption, this path explicitly intends to terminate the workers.

### P2 — Valid Unicode filenames prevent snapshot capture
**Location:** `workflow/pipeline.py:409–411`.

The initial changed-file list uses NUL-delimited Git output, but the captured-tree comparison uses newline-delimited `diff-tree` output. With Git’s default `core.quotePath`, non-ASCII filenames are quoted and escaped in the latter.

**Scenario:** A worker changes an owned file such as `docs/café.md`. Ownership validation accepts the path, but the captured list contains Git’s quoted representation rather than the original filename.

**Impact:** Freeze incorrectly raises “Files changed during snapshot” after stopping the workers, preventing verification of otherwise valid changes.

## Design limitations, not findings

Ambiguous launches deliberately refuse automatic relaunch; partial candidate worktrees require manual inspection; existing terminal mappings prevent automatic layout recreation. These are explicit fail-closed behaviors, not duplicate-launch or recovery bugs.