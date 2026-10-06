# Overnight Task Plan — vea (`fix/val-doc-1`)

Status: DRAFT (do not implement yet)
Branch: `fix/val-doc-1` (7 commits ahead of `dev`, linear). Merge base `3526d52`.
Net diff: 27 files, +2613 / −343. Bulk is `validator-cli`; `relayer-cli` has **no source changes** (README + docker only).

---

## Workstream A — Review validator-cli vs `dev`

### Task A1 — Full review of validator-cli changes on this branch

- **Goal:** Produce a severity-ranked findings report for every `validator-cli` change between `dev` and `fix/val-doc-1`.
- **Scope (files, in review order):**
  1. `src/utils/envValidation.ts` (new, +432) — startup validation + RPC/contract/funding preflight.
  2. `src/utils/logScanner.ts` (new, +81) — chunked `eth_getLogs` scanning.
  3. `src/utils/claim.ts` (+298/−) — claim reconstruction rewrite, `verifyClaimHash` variant return.
  4. `src/utils/arbToEthState.ts` (+100/−) — `resolveSettledReadBlocks`, `maxTimeVariation()` fix.
  5. `src/utils/epochHandler.ts` (+123/−) — `blockAtTimestamp`, `getLookbackFloorBlock`.
  6. `src/helpers/claimer.ts`, `snapshot.ts`, `validator.ts` — bounded-scan adoption + settled-block gating.
  7. `src/watcher.ts` — env validation entrypoint, removed heartbeat + `RPC_BLOCK_LIMIT`.
  8. `src/consts/bridgeRoutes.ts`, `src/utils/{botEvents,logger,errors}.ts` — config/logging/error surface.
- **Method:** Diff each file vs `dev` (`git diff dev...HEAD -- <path>`), then read the new file in full. Focus on correctness of block-number/block-tag usage across the three chains (Arb 421614 / Sepolia 11155111 / Chiado 10200), not style.
- **Acceptance criteria:** One report, every file above covered, each finding tagged `BUG` / `RISK` / `NIT` with a one-line repro or counterexample and the affected route(s).
- **Effort:** M–L (3–5 h).
- **Leads to verify (hypotheses from an initial pass — confirm or dismiss, do not fix):**
  1. **[BUG?] Cross-chain block numbers on the ArbToGnosis route in `helpers/claimer.ts`.** `queryRpc = veaRouterProvider ?? veaOutboxProvider`; for `arbToGnosis` the router is on **Sepolia** while `veaOutbox` is on **Chiado**. `resolveSettledReadBlocks`'s `outboxBlock` (a Sepolia block number) is then used as `blockTag` on the Chiado `veaOutbox`, and `getLookbackFloorBlock`/`getBlock("finalized")` (Sepolia) bound `findLatestLog` over the Chiado outbox. Verify whether block numbers leak across chains here. ArbToEth has no router, so this is ArbToGnosis-specific.
  2. **[BUG?] `resolveSettledReadBlocks` conflates L1 finality with outbox-chain finality.** For ArbToGnosis the outbox chain (Chiado) is not the L1 (Sepolia) that Arbitrum finality is measured against. Check that `outboxBlock` is always read on the outbox's own chain.
  3. **[REG/RISK] Heartbeat silently removed.** `watcher.ts` no longer imports or calls `sendHeartbeat`, but `utils/heartbeat.ts` still exists and `.env.dist` still documents `HEARTBEAT_URL` (with a comment implying it is active). Determine whether this is intentional; if so, the dead file + env docs should be cleaned, if not it's a monitoring regression.
  4. **[NIT] Leftover dev comment** at top of `epochHandler.ts` ("DONT DECLARE A NEW var here…") and a second stale comment on `getLookbackFloorBlock` that contradicts the code.
  5. **[RISK] `defaultCreateProvider` relies on `FallbackRpcProvider` NOT short-circuiting `_detectNetwork`** so the chain-id check is meaningful. Confirm that invariant holds (see the comment in `envValidation.ts`).
  6. **[RISK] `scanLogs` backward + `stopOnFirstHit` semantics** — confirm `findLatestLog` returns the true newest log (sort + last element) and that a hit in the head chunk doesn't hide an older-but-still-newer-than-floor log elsewhere.
  7. **[RISK] `blockAtTimestamp` floor edge case** — when `timestamp < floorBlock.timestamp` it returns `floorBlock`; confirm no caller passes a `floorBlock` that can be ahead of the target.

---

## Workstream B — Relayer issues (open GitHub issues, mapped to tasks)

### Task B1 — #508: relayer-cli dependency vulnerabilities (45, max 9.1 Critical)

- **Goal:** Triage and eliminate (or document as accepted-risk) the 45 reported vulns in `@kleros/vea-relayer-cli`.
- **Source:** https://github.com/kleros/vea/issues/508 (Mend scan).
- **Scope:** Identify the direct dependency that pulls each flagged transitive package (`basic-ftp`, `systeminformation`, `tar`, `ws`, … — `systeminformation` is a known `pm2` dependency). For each: upgrade, replace, or remove the offending direct dep. Produce a remediation table.
- **Acceptance criteria:** `yarn npm audit --recursive` (or Mend re-scan) shows the Critical/High set cleared or explicitly accepted with rationale; relayer tests still green.
- **Effort:** L (3–5 h). **Risk:** low for CI, but touching `pm2`/`ws` can affect runtime — require full test run before done.
- **Note:** Remediation column in #508 says "N/A" (no fixed version) → likely needs a dependency *removal/replacement*, not a bump.

### Task B2 — #380: Move `releaseLock` into exit-handler cleanup

- **Goal:** Make lock release happen exactly once, at shutdown, instead of inside `updateStateFile`.
- **Source:** https://github.com/kleros/vea/issues/380 (from PR #377 review).
- **Scope:** `relayer-cli/src/utils/relayerHelpers.ts` (`updateStateFile`, `setupExitHandlers`, `cleanupAllLockFiles`) and `relayer.ts:109`. Currently `releaseLock` is called in `updateStateFile` and again in `relayer.ts`, while `setupExitHandlers` only deletes `.pid` files via `cleanupAllLockFiles`. Consolidate so a single cleanup path releases the lock.
- **Acceptance criteria:** `releaseLock` no longer fires per state-file write; lock is released on SIGINT/SIGTERM/SIGQUIT/uncaughtException/exit; `relayerHelpers.test.ts` + `lock.test.ts` updated and green.
- **Effort:** M (1–2 h). **Risk:** medium — lock semantics affect double-start protection; add a test for "no double release / no stale lock".

### Task B3 — #363: Graceful shutdown / avoid corrupting state files on signals

- **Goal:** Guarantee signal-driven shutdown cannot leave a half-written or corrupt state/lock file.
- **Source:** https://github.com/kleros/vea/issues/363 (from PR #344 review).
- **Scope:** `setupExitHandlers` + `updateStateFile`/`initialize` in `relayerHelpers.ts`. Today writes are synchronous `writeFileSync` inside an `async` signal handler that ends with `process.exit(0)`; verify the async cleanup (`cleanupAllLockFiles`) actually completes before exit and that a signal arriving mid-write can't leave a torn file. Consider atomic write-then-rename.
- **Acceptance criteria:** A defined, tested shutdown sequence (flush → release lock → delete pid → exit) with a unit test that emits a signal during a write and asserts file integrity.
- **Effort:** M (1–2 h). **Risk:** medium. Strongly related to B2 — sequence them B2 → B3 in one session.

### Task B4 — #58: Arb Sepolia → Chiado unhappy path (relayer subgraph + contracts)

- **Goal:** Close the remaining relayer-side subtask for the unhappy path (challenge/resolution) on the Arb→Chiado route.
- **Source:** https://github.com/kleros/vea/issues/58 (Epic; subtask #95 open, #152 done).
- **Scope:** Read the epic + open subtask #95 first. This is cross-package (contracts + `relayer-subgraph-inbox`); confirm what is already covered by the current relayer/validator code before scoping further.
- **Acceptance criteria:** A scoped sub-plan (this is a discovery task; likely spawns follow-up tasks) — define exactly what's missing for the unhappy path.
- **Effort:** M (2–3 h discovery). **Risk:** low (analysis only tonight).

### Task B5 — #37: Gnosis Chiado → Polygon Mumbai (fallback via mainnet)

- **Goal:** Scope the relayer-subgraph + bots work for a Chiado→Mumbai route with mainnet fallback.
- **Source:** https://github.com/kleros/vea/issues/37 (Epic, empty body).
- **Scope:** Discovery only tonight — determine current route support in `relayer-subgraph-inbox`, `relayer-cli`, and `vea-validator2`/`vea-validator3`; draft the contract/subgraph/bot sub-tasks.
- **Acceptance criteria:** Written breakdown with owners-by-package and dependencies.
- **Effort:** M (2–3 h discovery). **Risk:** low.

### Task B6 — #84: txn relayers (batched relay + calldata compression + incentive)

- **Goal:** Design task for batching relay proofs so L1 calldata cost is O(n) not O(n·log n), plus a sender-side fee/incentive mechanism (reverse Dutch auction).
- **Source:** https://github.com/kleros/vea/issues/84 (Package: Contracts, but relayer-facing).
- **Scope:** Discovery/design tonight — confirm current relayer submission shape and where batching would live (contracts `TransactionBatcher`/relayer-cli); produce a design note + sub-tasks.
- **Acceptance criteria:** Design doc + task breakdown; no code tonight.
- **Effort:** M (2–3 h). **Risk:** low.

### Optional Task B7 — #279 / #282: subgraph infra (TheGraph migration, endpoint update)

- **Goal:** Assess impact on `relayer-subgraph-inbox`.
- **Source:** #279 (Migrate to TheGraph network), #282 (subgraph endpoint update).
- **Scope:** Discovery only — confirm whether these block or just precede the relayer work above.
- **Effort:** S (≤1 h). **Risk:** low.

---

## Suggested overnight sequencing

1. **A1** (validator review) — start first; it's self-contained and produces the report.
2. **B2 → B3** (relayer lock/exit) — one cohesive session; code changes + tests.
3. **B1** (dependency triage) — runs independently; long, can run in parallel with B2/B3.
4. **B4 / B5 / B6** (discovery) — read-only, good for the tail of the window.
5. **B7** optional.

Blockers to resolve before starting any *code* task: none need live chains, but all code tasks need `yarn install` + `yarn workspace @kleros/vea-contracts build` (typechain types) to run tests.
