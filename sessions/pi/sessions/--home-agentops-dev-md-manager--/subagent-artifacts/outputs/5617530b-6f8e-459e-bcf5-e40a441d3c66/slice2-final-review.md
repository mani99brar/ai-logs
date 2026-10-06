# Slice 2 final review — targeted follow-up

## TL;DR

**The pruning/restoration P1 is resolved.** The original in-memory reproducer now passes, including preservation of surviving node state and rejection of stale visible/pin IDs.

No new P0/P1/P2 findings in this bounded fix. Earlier review conclusions otherwise stand. **Code-review clearance for Slice 3 is conditional on the validator’s post-fix gates passing.**

## Change map

- Snapshot normalization: `src/graph/layout.ts:213–238`.
- Unit regression: `tests/unit/model.test.ts:107–137`.
- Two browser return journeys: `tests/document-history-review.spec.ts:6–35`.
- Evidence and validation boundaries: `docs/HANDOFF_SLICE2.md:67–77`.

## Walkthrough

- `snapshot()` excludes visible IDs whose nodes were pruned (`src/graph/layout.ts:217`).
- `restore()` independently filters stale visible and pin IDs before constructing simulation nodes and links (`src/graph/layout.ts:227–237`). This removes the demonstrated `undefined` node failure.
- Unit coverage checks the original sequence, surviving positions/pins, subsequent synchronization, and deliberately stale incoming snapshots (`tests/unit/model.test.ts:118–133`).
- Browser tests exercise both Back to folder and native Back after a mocked listing deletion. They verify restored focus, subsequent graph rendering, absent deleted nodes, and no page errors without modifying committed samples (`tests/document-history-review.spec.ts:14–33`).

## Decisions and assumptions

The correction normalizes snapshot boundaries rather than changing live pruning behavior. This appropriately leaves `prune()` and `sync()`’s unchanged-list invalidation semantics intact (`src/graph/layout.ts:95–99,203–209`).

It does not introduce layout recalculation, Fit, or new navigation behavior.

## Risks and findings

- **P0:** none identified.
- **P1:** previous pruning/restoration finding **closed**.
- **P2:** none newly identified.

Independent read-only probe passed the original reproducer, surviving-node preservation, and stale-ID/pin normalization. Scoped diff checks and fixture status were clean.

Earlier API/UI correction dispositions and the tab-retention assessment stand. Historical all-behavior TDD compliance remains unestablished; the handoff continues to disclose that honestly (`docs/HANDOFF_SLICE2.md:119`).

## What was NOT done

No edits or browser suite. Full gates were not rerun by this reviewer. Recorded Red→Green results are handoff evidence, not independently replayed here; prior full-suite results are correctly labeled as predating this correction (`docs/HANDOFF_SLICE2.md:73–79`).

## What to verify

- [ ] Validator completes post-fix unit, lint, build, dev/preview browser, and fixture-cleanliness gates.
- [ ] Handoff replaces the pending-validation note with those results.

Linux/procfs approval remains unchanged. Slice 3 still needs separately designed descriptor-relative mutation and atomic-replacement safety (`docs/HANDOFF_SLICE2.md:106–109`).

## Understanding check

- **Why is the crash fixed?** Missing IDs are removed before simulation-node construction.
- **Why leave `prune()` unchanged?** Prematurely updating live visible IDs could incorrectly trigger `sync()`’s unchanged-list early return.