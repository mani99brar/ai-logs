# Review — validator-cli: `dev` → `fix/val-doc-1`

Scope: `git diff dev...HEAD -- validator-cli/` (23 files: 13 runtime source, 8 test, 2 config).
Base: `dev` (`3526d52`). Branch: `fix/val-doc-1`. Review-only; no fixes applied.

## Verdict summary

One **P0** (cross-chain block number on the `arbToGnosis` route), one **P1**
(silent heartbeat regression), several P2/NIT. The branch's core ideas —
settled-read gating, hash-variant return, bounded log scanning, the
`maxTimeVariation()` fix, startup env validation — are sound; the P0 is a
block-tag bookkeeping error introduced by the new block-pinning.

---

## Findings (severity ranked)

### P0 — `arbToGnosis` reads the Chiado outbox at Sepolia block numbers

**Files:** `src/helpers/claimer.ts`, `src/helpers/validator.ts`, `src/utils/arbToEthState.ts`, `src/utils/claim.ts`
**Route affected:** `arbToGnosis` only (`arbToEth` is unaffected).

`queryRpc = veaRouterProvider ?? veaOutboxProvider`. For `arbToGnosis` the router
lives on **Sepolia** (`11155111`) while the outbox lives on **Chiado** (`10200`),
so `queryRpc` is a Sepolia provider. The new block-pinned reads then apply
Sepolia block numbers to the Chiado outbox:

1. `claimer.ts` `makeClaim` →
   `resolveSettledReadBlocks({ outboxProvider: queryRpc })` returns
   `outboxBlock = blockFinalizedEth.number` (Sepolia). Then
   `veaOutbox.stateRoot({ blockTag: settledBlocks.outboxBlock })` reads the
   **Chiado** outbox at a **Sepolia** block number.
2. Same function: `getLookbackFloorBlock({ provider: queryRpc })` and
   `queryRpc.getBlock("finalized")` produce Sepolia bounds that are passed to
   `findLatestLog({ contract: veaOutbox /* Chiado */, ... })`.
3. `validator.ts` `handleResolveFlow` passes `veaOutboxProvider: queryRpc`
   (Sepolia) into `getClaimResolveState`, which does
   `outboxHeadBlock = await veaOutboxProvider.getBlock("finalized")` then
   `veaOutbox.claimHashes(epoch, { blockTag: outboxHeadBlock.number })` on the
   **Chiado** outbox.

**Root cause:** `resolveSettledReadBlocks` conflates two distinct things —
"the L1 that Arbitrum finality is measured against" (Sepolia) and "the chain the
outbox lives on" (Chiado). It uses one `outboxProvider` for both, returning a
single `outboxBlock` on the L1 and handing it to the outbox contract.

**Impact:** wrong `stateRoot`/`claimHashes` reads on a deposit-staking path
(spurious claim, missed challenge/claim, or an `eth_call` revert if the Sepolia
block number exceeds the Chiado head — which can crash the route). This is the
normal happy path for `arbToGnosis` (bridger claiming new messages).

**Fix direction (for the follow-up task):** `resolveSettledReadBlocks` must
return `outboxBlock` **on the outbox's own chain** (Chiado `finalized`), while
still measuring Arbitrum finality against the L1 (Sepolia). I.e. split the
"finality L1" provider from the "outbox read" provider, or have callers compute
the outbox head from `veaOutboxProvider` (as `snapshot.ts` already correctly
does) instead of `queryRpc`.

### P1 — Heartbeat silently removed (monitoring regression)

**File:** `src/watcher.ts`, `src/utils/heartbeat.ts`, `.env.dist`

`watcher.ts` no longer imports or calls `sendHeartbeat` (all three
`started`/`running`/`stopped` calls were removed), but `heartbeat.ts` still
exists and `.env.dist` still documents `HEARTBEAT_URL` as active ("the heartbeat
is only ever sent over https…"). Either the feature was intentionally dropped
(then remove the dead file + env docs) or it's a regression (restore the call).
As-is, a monitoring heartbeat that ops thinks is live will silently never fire.

### P2 — Leftover/stale dev comments in `epochHandler.ts`

- `// DONT DECLARE A NEW var here, i think this wont be needed…` — stray note.
- `getLookbackFloorBlock` docstring says the function "deliberately does not
  carry the cold-start backlog", but the inline comment above it still says
  "we add a backlog … But i think thats too harsh …" — contradicts the code.

### P2 — Dead code: `getBlockFromEpoch` and `sendHeartbeat`

- `getBlockFromEpoch` (`epochHandler.ts:165`) is still exported but has **no
  callers** (the branch removed them all from `watcher.ts`, `claimer.ts`,
  `validator.ts`).
- `sendHeartbeat` (`heartbeat.ts`) has no callers (see P1).

### P2 — `.env.dist` documents a dead knob

`HEARTBEAT_URL` and `LOGTAIL_TOKEN` are documented; `LOGTAIL_TOKEN` is genuinely
used by `logger.ts`, but `HEARTBEAT_URL` is not (see P1).

### P2 (pre-existing, out of branch scope) — `execution.status` enum mapping

`validator.ts` `handleResolveFlow` compares `execStatus === 1` →
`resolveChallengedClaim`, `execStatus === 2` → withdraw. `getMessageStatus`
returns Arbitrum SDK's `ChildToParentMessageStatus` (`NOT_FOUND=0,
NOT_CONFIRMED=1, CONFIRMED=2, EXECUTED=3`). The `1/2` mapping does not obviously
match "ready"/"executed" and predates this branch — worth a separate follow-up
task, not a blocker for this diff.

### NIT — redundant condition in `makeClaimDevnet` (pre-existing)

`newMessagesToBridge = savedSnapshot != outboxStateRoot && savedSnapshot != ZeroHash`,
then `if (newMessagesToBridge && savedSnapshot != ZeroHash)` — the second
`ZeroHash` check is redundant.

---

## Cross-chain block-integrity pass (per file)

| File | Uses block tags/numbers | Verdict |
|---|---|---|
| `helpers/claimer.ts` | `settledBlocks.*`, `getLookbackFloorBlock`, `getBlock("finalized")` | **FAIL** — Sepolia block numbers applied to Chiado outbox (P0) |
| `helpers/validator.ts` | `settledBlocks.inboxBlock`, `queryRpc` as outbox provider | **FAIL** — same P0 in `handleResolveFlow` |
| `helpers/snapshot.ts` | `getLookbackFloorBlock` on `veaInboxProvider` and `veaOutboxProvider` | OK — uses the outbox's own provider, not `queryRpc` |
| `utils/claim.ts` | `blockAtTimestamp`/`claimHashes` on `veaOutboxProvider` | OK for `getClaim`; `getClaimResolveState` inherits P0 via `veaOutboxProvider` arg |
| `utils/arbToEthState.ts` | returns `outboxBlock` = L1 finalized | FAIL as used — conflates L1 finality with outbox chain (root cause) |
| `utils/epochHandler.ts` | `blockAtTimestamp`, `getLookbackFloorBlock` | OK — chain-agnostic helpers; correctness depends on caller's provider |

## Seeded-lead resolution

1. Cross-chain block numbers in `claimer.ts` — **CONFIRMED** (P0).
2. `resolveSettledReadBlocks` conflates L1 vs outbox-chain finality — **CONFIRMED** (root cause).
3. Heartbeat silently removed — **CONFIRMED** (P1).
4. Leftover dev comment — **CONFIRMED** (P2).
5. `defaultCreateProvider` chain-id short-circuit — **DISMISSED**. It constructs
   `new FallbackRpcProvider(urls, defaultEmitter)` *without* a `chainId`, so
   `_detectNetwork()` falls through to a real `eth_chainId` query; the preflight
   check is meaningful.
6. `findLatestLog` backward + `stopOnFirstHit` — **DISMISSED**. First-hit chunk
   from the head is the newest chunk; sort + last element yields the true newest.
7. `blockAtTimestamp` floor edge — **DISMISSED as latent**. When `timestamp <
   floorBlock.timestamp` it returns `floorBlock` (its timestamp is after the
   target), but no current caller passes a non-zero `floorBlock`, so it is not
   reachable today.

## Positive changes (verified)

- `arbToEthState.ts` `getSequencerDelaySeconds` fixes a real bug:
  `Number(await sequencer.maxTimeVariation())` coerced a 4-tuple → `NaN`, which
  then poisoned every derived block range. Now correctly destructures
  `delaySeconds`.
- `verifyClaimHash` now returns the matching `honest` variant (0/1/2) rather than
  a boolean — callers get the struct that actually hashes to `claimHashes[epoch]`.
- `getClaim` pins `claimHashes` and the reconstructed logs to the **same**
  finalized block — closes a reorg-between-read race.
- `resolveSettledReadBlocks` gates reads on "finalized + epoch settled" before a
  deposit is staked — correct safety posture (modulo the P0 chain conflation).
- `getBlocksAndCheckFinality` now always returns the **finalized** L2 block
  instead of `latest` on finality-issue — stricter/safer.
- Startup `envValidation` preflight (chain-id, contract code, funding) is a real
  operability win over the old one-line `MissingEnvError` check.
- Event topic indexing in `claim.ts` matches the Solidity signatures
  (`Claimed`/`Challenged`/`VerificationStarted`) — verified correct.

## Test coverage

105 tests across 8 files (`claimer` 11, `snapshot` 11, `validator` 8,
`arbToEthState` 6, `claim` 23, `envValidation` 24, `epochHandler` 12,
`logScanner` 10).

Gaps to note:
- No test exercises the **`arbToGnosis` router/outbox provider split** — which is
  exactly where the P0 lives. A test with a Chiado outbox + a Sepolia router
  would have caught it.
- `resolveSettledReadBlocks` is unit-tested for the gating logic but (per the
  gap above) not for the cross-chain `outboxBlock` semantics.
- `sendHeartbeat` removal has no test/assertion that the watcher never emits a
  heartbeat.

## Recommended follow-up tasks

1. **P0 fix** — split finality-L1 from outbox-chain in `resolveSettledReadBlocks`
   / its callers (`claimer.ts`, `validator.ts`). Add an `arbToGnosis`-specific
   test.
2. **P1 fix** — restore `sendHeartbeat` in `watcher.ts` (or delete `heartbeat.ts`
   + the `HEARTBEAT_URL` docs, if removal is intended).
3. **Cleanup** — remove dead `getBlockFromEpoch`, stale comments in
   `epochHandler.ts`.
4. **Follow-up (pre-existing)** — verify `ChildToParentMessageStatus` enum
   mapping in `handleResolveFlow`.
