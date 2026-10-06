# vea-validator2 task backlog

> Single source of truth for `/val2` (single task) and `/val2-batch` (parallel)
> runs. Keep it current: mark `done` when a task is committed to `master`.

<!-- FORMAT (parseable by /val2-batch)
One task per `## [id] title` block. Fields are `key: value` lines:

    ## [01] Short title
    seam: src/file.rs, src/other.rs, area-name   # files/areas this task touches
    deps: none | 02,04                            # task ids this must run after
    status: todo | in-progress | done             # only `todo` is picked up by --all
    description:
    One or more lines of task text (multi-line allowed; keep indented 4 spaces
    after the first line, or use blank lines).

Parallel rule: two tasks may run in the same batch ONLY if their `seam` sets are
disjoint AND neither lists the other in `deps`. Any shared seam or dep edge makes
them sequential (the earlier one must integrate first).
-->

## [01] Make challenge writes reorg-safe (reconcile claim)
seam: src/tasks/validate_claim.rs, src/tasks/reconcile_claim.rs, src/contracts.rs, src/tasks/dispatcher.rs, src/indexer.rs, tests/common/mod.rs, tests/reconcile_test.rs, DESIGN_AND_RATIONALE.md
deps: none
status: in-progress
description:
Make challenge writes reorg-safe by adding a claim re-verification /
reconciliation pass. **Committed as `14623aa`; superseded by [04].**

## [02] Seed the binary-search lower bound in finality/indexer (issue #3)
seam: src/finality.rs, src/indexer.rs
deps: none
status: done
description:
`find_block_by_timestamp` re-runs a full binary search from block 0 on every
idle cycle, rediscovering a block we already knew (~28 sequential fetches on
Arbitrum, ×3 transports ×2 chains ×2 routes). Issue #3 in the repo.

Goal: stop seeding the search at 0. The `find_block_by_timestamp_from(provider,
ts, lo)` helper already exists — use it at the remaining lo=0 call sites:
- `src/finality.rs:27` (L2 block for `epoch_end_ts`),
- `src/finality.rs:62` (L1 batch-scan start block),
- `src/indexer.rs:90-91` (init-sync start, both inbox and outbox).

Seeding strategies, in order of preference:
1. **Cold-start cache** — persist/remember the last `(timestamp → block)` answer
   per provider and seed `lo` from it. Safe in general: the target timestamp
   only moves forward, so the previous answer is a valid lower bound. The
   indexer already does this via `catchup_target`; extend the same idea to the
   finality.rs call sites (an in-memory per-route last-answer field is
   sufficient; cross-restart persistence is optional).
2. **Finalized block number** — use `get_block_by_number(Finalized)` as the
   floor where it is provably ≤ the target.

SAFETY (critical): the "stale lo above the answer is safe" comment in
`find_block_by_timestamp_from` is true ONLY for the indexer caller (which has
already scanned past the returned block). For the `finality.rs` call sites the
returned block is used directly in `findBatchContainingBlock`, so a `lo` ABOVE
the true epoch-end block would silently pick the wrong batch. The seeded lower
bound here must be a TRUE lower bound (≤ the answer). A finalized-block floor is
only valid when its timestamp ≤ `epoch_end_ts`; otherwise fall back to the
cold-start cache or 0.

Requirements:
- Reuse `find_block_by_timestamp_from`; do NOT modify `src/lib.rs` (owned by
  task [03]) unless strictly necessary and coordinated.
- Never fetch mutable/latest data for the bound in a way that can exceed the
  target.
- Add unit tests (no devnet) proving a seeded search returns the same block as
  an unseeded one, and that an over-high `lo` is never returned for the
  finality call sites.

## [03] RPC failure-mode tests + CI (issue #2)
seam: src/lib.rs, src/config.rs, src/startup.rs, tests/, .github/workflows/
deps: none
status: done
description:
The test suite can't exercise RPC failure modes: 24 integration tests run only
against a healthy devnet; there are no unit tests in `src/`; there is no CI.
The retry/failover code is therefore unfalsifiable. Issue #2 in the repo.

Deliverables, in priority order:
1. **Unit tests for the retry layer** (no devnet, `#[cfg(test)]` in the owning
   modules): `retry_rpc` / `retry_rpc_opt` with a mock `Transport` that fails N
   times then succeeds (assert the attempt count and backoff ordering); the
   `Ok(None)` retry path; JSON-RPC errors returned over HTTP 200; error-string
   propagation to sentinel handling.
2. **A fault-injection layer** — a mock `alloy` `Transport` (or tiny in-process
   proxy) able to return: JSON-RPC errors over HTTP 200, `null` results, stale
   blocks, 429s, and timeouts. This is what makes failover (3× transport
   fan-out) and the `Ok(None)` paths testable.
3. **Integration tests for RPC failure modes** using that layer, mirroring the
   existing `#[serial]`/snapshot-revert harness style.
4. **Coverage for the startup path**: `load_route_settings` and
   `get_avg_block_time_ms`. Note `get_avg_block_time_ms` has a pre-existing
   `latest - 10000` underflow bug against a non-forked devnet (panics in debug,
   wraps in release) — fixing it is in scope, it's both a testability blocker
   and a real bug.
5. **CI**: a `.github/workflows/` job running `cargo build`, `cargo clippy`,
   and `cargo test` (unit + non-devnet), plus a `docker build` step. `Cargo.lock`
   is already committed — keep it that way.

Constraints:
- Clean-room (no TS CLIs); crate conventions (`Box<dyn Error>`, sentinel
  strings, no anyhow in src/).
- Do not modify `src/finality.rs` or `src/indexer.rs` (owned by task [02]).
- New tests that need the devnet must be clearly marked and kept out of the
  default fast `cargo test` path.
- `cargo build` must pass; run `cargo test` (unit + the new non-devnet tests).

## [04] Replace the reconcile-claim watchdog with a write-durability gate
seam: src/tasks/mod.rs, src/tasks/reconcile_claim.rs, src/tasks/dispatcher.rs, src/contracts.rs, src/indexer.rs, tests/, DESIGN_AND_RATIONALE.md
deps: none
status: done
description:
The reorg-safe-challenge fix in [01] added a periodic `ReconcileClaim` watchdog.
It works, but it patches only one symptom: every write task (`challenge`,
`start_verification`, `verify_snapshot`, `withdraw`, `execute_relay`) goes
through `send_or_replace` (src/tasks/mod.rs:143), which returns `Ok(())` after
ONE confirmation — so any of them can be reorged out after the task self-removes.

Replace the watchdog with a durability gate at the source, in `send_or_replace`:

1. After a successful receipt, do NOT clear the pending tx record and return Ok
   unless the receipt's block is finalized. If mined but not yet finalized,
   keep the pending record and return a "wait" sentinel (reuse
   `PendingReplacement`, or add a clearer one) so the dispatcher keeps the task
   and re-checks next cycle WITHOUT re-sending a mined tx.
2. On re-check, distinguish the two states from the pending record:
   - a receipt exists but its block is not yet finalized → wait (never replace a
     tx that is already mined);
   - no receipt for the nonce (the block was reorged back to the mempool) →
     fall through to the existing fee-bump/replacement path and re-send.
3. Durability bar is chain-aware:
   - L1 writes (`challenge`, `start_verification`, `verify_snapshot`, `withdraw`,
     `execute_relay` on the outbox) → receipt block number <= L1 `finalized`
     block number (`provider.get_block_by_number(Finalized)`).
   - L2 writes (`send_snapshot` on the Arbitrum inbox) → L2 finality, i.e. reuse
     `finality::is_epoch_finalized`; do not apply a naive L1-finalized check.
     If `send_snapshot` does not currently go through `send_or_replace`, state
     that and make its durability consistent.

Remove the now-redundant watchdog machinery:
- delete `src/tasks/reconcile_claim.rs` (whole file);
- remove the `ReconcileClaim` arm in `src/tasks/dispatcher.rs`;
- remove `TaskKind::ReconcileClaim` (+ its display name) in `src/tasks/mod.rs`;
- remove the `hashClaim` ABI added in `src/contracts.rs`;
- remove the watchdog scheduling added in `src/indexer.rs` (KEEP the
  `sync_lower_bound` seeding from [02] — that is a different change);
- delete `tests/reconcile_test.rs`.

Keep:
- the `finalized_state_root()` extraction in `src/tasks/validate_claim.rs`
  (clean refactor; still used by `validate_claim`);
- the `mine_blocks` helper in `tests/common/mod.rs` (reuse in the new tests).

Add tests (no devnet where possible):
- mined-but-not-finalized → task kept alive, tx NOT replaced;
- finalized receipt → done, pending record cleared;
- reorged-before-finality → existing replace/re-send path re-mines it;
- (optional, devnet) an end-to-end challenge whose tx is reorged out is re-mined
  and the `Challenged` event lands; mark clearly if devnet-only.

Update `DESIGN_AND_RATIONALE.md`: replace the "Claim Reconciliation" section
with a "Write durability" section documenting the gate and the chain-aware bar.

Constraints:
- Clean-room (no TS CLIs); crate conventions (`Box<dyn Error>`, sentinel
  strings, no anyhow in src/). If you add a sentinel, add the matching
  dispatcher arm in the same change.
- `cargo build --all-targets` and `cargo test --lib` must pass. Do not run
  `cargo fmt`/`cargo clippy`. Do not touch `scripts/agent-loop.sh` or any `.env*`.
