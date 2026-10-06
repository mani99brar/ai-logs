# Vea Workspace — Master Info File

> Auto-loaded by pi as an `AGENTS.md` context file. This is the single source of
> truth for everything built for **Vea** in this workspace. Keep it up to date
> when repos, routes, or contract addresses change.

Workspace root: `/home/agentops/dev/vea_validators`

## What Vea is

Vea is a **trust-minimized, optimistically-verified cross-chain message bridge**
designed for optimistic rollups. Trust model: only **1 live honest verifier** is
needed (like optimistic rollups). Anyone can be an **Oracle**, **Challenger**, or
**Relayer**.

- Happy path: an Oracle makes an unchallenged **claim** of the inbox state root;
  cheap and fast.
- Unhappy path: a Challenger disputes; resolution falls back to the canonical
  rollup bridge (slow but secure).

Links: Website https://vea.ninja · Docs https://docs.vea.ninja · Explorer https://veascan.io

## Repositories in this workspace

| Dir | Repo | Lang | Branch | Purpose |
|-----|------|------|--------|---------|
| `vea/` | `git@github.com:kleros/vea.git` | TypeScript/Solidity monorepo | `dev` | Canonical protocol: contracts + official validator/relayer CLIs + indexers + explorer |
| `vea-validator2/` | `git@github.com:kleros/vea-validator2.git` | Rust | `master` | Independent full validator (oracle + challenger + relayer) |
| `vea-validator3/` | `git@github.com:kleros/vea-validator3.git` | Python | `main` | Independent challenger-only bot |

The two independent validators (`vea-validator2`, `vea-validator3`) are
**deliberately clean-room** reimplementations built from contracts + public docs.
`vea-validator3`'s CLAUDE.md explicitly says **not to read or reference** the
TS `validator-cli`/`relayer-cli` when working in it. Respect that boundary.

---

## Protocol primer (shared mental model)

Roles and the epoch lifecycle (origin = L2 e.g. Arbitrum, destination = L1 e.g. Ethereum/Gnosis):

- **Epoch**: `epoch = block.timestamp / epochPeriod`.
- **Inbox** (origin/L2): accumulates messages into a merkle tree. `saveSnapshot()`
  records `snapshots(epoch) → bytes32` (the state root). Overwritable within the
  epoch, immutable once the L2 clock passes epoch end. `sendSnapshot(epoch, claim)`
  relays the true root through the canonical bridge for dispute resolution.
- **Outbox** (destination/L1): lifecycle
  `claim → (challenge?) → startVerification → verifySnapshot → withdraw`.
  - `claim(epoch, stateRoot)`: needs deposit (native ETH on ArbToEth, WETH on ArbToGnosis). Stores only `claimHashes[epoch] = hashClaim(Claim{...})`, emits `Claimed`.
  - `challenge(epoch, claim)`: permissionless, needs deposit + exact current claim preimage. Emits `Challenged`.
  - `startVerification` → `verifySnapshot`: happy-path finalization after delay + challenge window.
  - `resolveDisputedClaim(epoch, trueRoot, claim)`: only from canonical bridge; picks honest party.
  - `withdrawChallengeDeposit`: pays winner `1.5 × deposit`, burns half the loser's.
- **Key invariant**: the `Claim` struct is **never stored on-chain**, only its hash.
  `hashClaim = keccak256(abi.encodePacked(stateRoot, claimer, uint32 timestampClaimed, uint32 timestampVerification, uint32 blocknumberVerification, uint8 honest, address challenger))` (85 bytes). Any state-changing call must pass the *exact current* struct or it reverts with `"Invalid claim."`. Reconstruct it from events + block headers.
- **Safety timing**: verdicts must come only from immutable inbox reads — the
  `finalized` L2 tag once past epoch end, or `latest` only once `sequencerDelayLimit`
  past epoch end (a malicious sequencer can backdate `saveSnapshot` before that).

Supported routes across the stack:
- **ArbToEth**: Arbitrum → Ethereum (native ETH deposits)
- **ArbToGnosis**: Arbitrum → Gnosis (WETH deposits; `sendSnapshot` takes an extra gasLimit arg)

---

## `vea/` — canonical monorepo

Toolchain: Solidity 0.8, Hardhat, Ethers v6, Node 22, TypeScript, Yarn Berry (v4.6.0, no PnP).
Install: `yarn install` at repo root.

Packages:

| Package | Description | Key scripts |
|---------|-------------|-------------|
| `contracts/` | Vea bridge smart contracts (Hardhat) | `yarn test`, deploy scripts under `deploy/`, `scripts/populateReadme.sh` refreshes addresses |
| `validator-cli/` (`@kleros/vea-validator-cli`) | Official TS validator: Oracle + Challenger | `yarn start`, `yarn test` |
| `relayer-cli/` (`@kleros/vea-relayer-cli`) | Automates relaying messages for verified roots; includes Hashi helpers | `yarn start-relayer`, `yarn test` |
| `relayer-subgraph-inbox/` | Subgraph: inbox indexing for relayer proof-of-inclusion | — |
| `veascan-subgraph-inbox/` | Subgraph: inbox indexing for VeaScan frontend | — |
| `veascan-subgraph-outbox/` | Subgraph: outbox indexing for VeaScan frontend | — |
| `veascan-web/` (`@kleros/veascan-web`) | VeaScan explorer frontend | `yarn start`, `yarn build`, `yarn codegen` |
| `envio-indexer/` | Envio-based indexer (config.yaml, schema.graphql, abis) | — |
| `services/` | Supporting services (e.g. local graph-node container) | `docker-compose.yml` at root |
| `veashi-contracts/` | Hashi-integration contracts (LayerZero + Vea + CCIP bridges) | — |
| `veashi-sdk/` (`@kleros/veashi-sdk`) | Veashi SDK: contracts + TypeChain types + UI utils | `yarn build` |
| `veashi-scanner/` (`@kleros/veashi-scanner`) | Cross-chain message explorer for Hashi `Yaho` messages | `yarn dev`, `yarn build` |

Contracts source layout (`contracts/src/`):
- `arbitrumToEth/` — `VeaInboxArbToEth.sol`, `VeaOutboxArbToEth.sol`
- `arbitrumToGnosis/` — `VeaInboxArbToGnosis.sol`, `VeaOutboxArbToGnosis.sol`, `RouterArbToGnosis.sol`
- `gnosisToArbitrum/` — `VeaInboxGnosisToArb.sol`
- `merkle/` — `MerkleTree.sol`, `MerkleProof.sol`
- `interfaces/` — inboxes, outboxes, gateways, routers, updaters, tokens, types (`VeaClaim.sol`)
- `utils/` — snapshot/touch helpers, multi-challenge, TransactionBatcher
- `test/` — mocks (bridge mocks for arbitrum/gnosis, gateway/token mocks)

### Deployed contract addresses (testnet/devnet)

Refresh with `contracts/scripts/populateReadme.sh`. Current known:

**Sepolia (L1)**
- RouterArbToGnosisDevnet: `0xfA08cfe2530c01045D953f824b836f6757670cD0`
- RouterArbToGnosisTestnet: `0xd7C54E4cA686a8C51D44534AC6b756676961Fccf`
- VeaOutboxArbToEthDevnet: `0x60af9Fc1dd7d5bce69a66A8AEf456952b03A39C7`
- VeaOutboxArbToEthTestnet: `0xf720FA4575FB2FE96c7f05B1b5abc2d281cDa09a`

**Arbitrum Sepolia (L2)**
- VeaInboxArbToEthDevnet: `0x45138BC4E364A16919C4571699171d774A7590BD`
- VeaInboxArbToEthTestnet: `0x8B925669606026CcCfAFD72840F5b0CAeDA80078`
- VeaInboxArbToGnosisDevnet: `0x2E973e20B24088bc74755a7A5cd1A37Dcb53E061`
- VeaInboxArbToGnosisTestnet: `0x162f826E18380567CE0548395a3Ad2A54EA87B96`

**Chiado (Gnosis testnet)**
- VeaInboxGnosisToArbDevnet: `0xc0804E4FcEEfD958050356A429DAaaA71aA39385`
- VeaOutboxArbToGnosisDevnet: `0x879A9F4476D4445A1deCf40175a700C4c829824D`
- VeaOutboxArbToGnosisTestnet: `0x15aC29269b044E1d9042F597513B27Ffa4A7f257`

---

## `vea-validator2/` — Rust validator (full)

Independent full validator: monitors claims, challenges fraud, advances verification,
relays L2→L1 messages, withdraws deposits. Routes: ArbToEth, ArbToGnosis.

Docs: `README.md`, `DESIGN_AND_RATIONALE.md` (read before touching task/dispatch logic).

Prereqs: Rust (rustup), Foundry. Fetch contracts: `./scripts/fetch-vea-contracts.sh`.

Dev / test:
```bash
./scripts/full-devnet.sh          # spins L1+L2 anvil chains + deploys, writes .env.local
source .env.local && cargo test   # in another terminal
```
Testnet run: `cp .env.example .env.test`, add PRIVATE_KEY, `source .env.test && cargo run`.
Docker: `docker build -t vea-validator .` then `docker run --rm --env-file .env -v $(pwd)/data:/app/data vea-validator`.

Config env: `MAKE_CLAIMS` (default false = monitor/challenge only; true also claims),
comma-separated RPC URLs for failover (`ETHEREUM_RPC_URL=url1,url2`), `RUST_LOG` (JSON logs).

Architecture (`src/`):
- `main.rs` — startup checks (RPC health, balances, WETH approval), then per-route spawns.
- `epoch_watcher.rs` — polls 10s; saves snapshot ~60s before epoch end; optionally claims ~20min after epoch start.
- `indexer.rs` — scans inbox/outbox events (only blocks older than 20min finality buffer), schedules tasks, proactive task invalidation.
- `tasks/dispatcher.rs` — polls 15s, runs tasks whose `execute_after` passed.
- `tasks/` — one file per task: `save_snapshot`, `claim`, `validate_claim`, `challenge`, `start_verification`, `verify_snapshot`, `send_snapshot`, `execute_relay`, `withdraw_deposit`.
- `finality.rs` — L2→L1 finality verification via Arbitrum `NodeInterface.findBatchContainingBlock` + `SequencerInbox.SequencerBatchDelivered` vs L1 `finalized`. Requires `SEQUENCER_INBOX` in prod (bypassed when unset, e.g. anvil tests).
- `contracts.rs`, `config.rs`, `startup.rs`, `lib.rs`.
- Persistence: per-route JSON files — TaskStore (tasks, block cursors, `on_sync`) + ClaimStore (claim data to reconstruct structs).

Key behaviors: 20min finality buffer on all indexed events; self-filters `SnapshotSent`
to only its own txs; reschedules on race/revert (see DESIGN_AND_RATIONALE tables).
Known issue: `execute_relay` needs the merkle root confirmed on L1 Arbitrum Outbox
(`roots(root)==0` → reschedule +1h); occasional root-inclusion computing error under investigation.

---

## `vea-validator3/` — Python challenger bot

Independent **challenger-only** bot (`vea-challenger`). Watches `Claimed` events,
independently re-derives the claimed root from inbox snapshot (quorum reads over
multiple RPCs at `finalized`), challenges mismatches, drives to resolution, withdraws.
Python ≥3.12, uv-managed. **Clean-room: do not reference the TS CLIs here.**

Docs: `README.md`, `CLAUDE.md`, `docs/design.md` (read design.md before touching
verdict/claims/resolver logic).

Commands:
```bash
uv sync
cp .env.example .env               # add VEA_CHALLENGE_PRIVATE_KEY (funded EOA), pick route
uv run vea-challenger scan         # one read-only detection pass
uv run vea-challenger run          # long-running watcher/challenger (challenges cost deposit!)
uv run vea-challenger --dry-run run
uv run vea-challenger status
uv run vea-challenger challenge|resolve|withdraw --epoch N   # manual lifecycle
uv run pytest                      # unit tests (no network)
uv run pytest -m live              # opt-in read-only RPC smoke tests
```
No ruff/mypy configured. `live`-marked tests excluded by default.

Architecture (`src/vea_challenger/`):
- `watcher.py` — composition root: `build_app()` wires Store, ChainClients (inbox/outbox, +L1 for arb_to_gnosis), Detector, Challenger/Resolver; `startup_checks()`, `tick()`/`run_loop()`.
- `cli.py` — argparse CLI dispatch.
- `config.py` — `RouteCfg`/`Settings` (TOML+env), builtin route registry.
- `chain.py` — multi-RPC pool, failover, quorum reads, finalized/latest, tx send+wait, EIP-1559 fees.
- `abi.py` / `contracts.py` — minimal hand-written ABIs + typed wrappers.
- `claims.py` — `Claim` + `hash_claim()` byte-exact parity w/ Solidity; hash-probing (`probe_variants`/`find_matching`) for the two event-less transitions (Verified winner, escape-hatch mutations).
- `detector.py` — scans Claimed/VerificationStarted/Challenged, reconstructs state, produces verdicts.
- `verdict.py` — pure decision: HONEST / CHALLENGE / WAIT from finalized+latest reads.
- `challenger.py` — submits challenge txs (native ETH or WETH), pre-flight funding/allowance checks.
- `resolver.py` — sendSnapshot (L2), L2→L1 execute (L1), withdraw, bridge-shutdown escape hatch.
- `arbitrum.py` — `NodeInterface.constructOutboxProof`, `L2ToL1Tx` parsing, `Outbox.executeTransaction`.
- `txsender.py` — nonce/fee mgmt + tx-journal, two independent key lanes.
- `store.py` — SQLite: claims state machine, tx journal, scan cursors (idempotent writes).
- `notify.py` — fire-and-forget webhook (Slack/Discord JSON).

Safety rules (must preserve):
- Verdicts only from immutable inbox reads; every RPC must agree (quorum), else CRITICAL alert (no silent fallback) unless `VEA_CHALLENGE_ON_AMBIGUITY=true`.
- `snapshots(epoch)==0x0` → any claim is fraudulent.
- Two tx lanes (`VEA_CHALLENGE_PRIVATE_KEY`, `VEA_OPS_PRIVATE_KEY`) never share a nonce sequence.
- Tx intents journaled to SQLite before broadcast (crash-safe, never double-sent).
- Deposits sent as **exactly** `deposit` (refunds use 2300-gas `.send()` — use plain EOAs, never contracts).

Claim state machine (SQLite `claims.status`):
`SEEN → HONEST` | `SEEN → UNDECIDED → CHALLENGE_PENDING → CHALLENGED → SNAPSHOT_SENT → L1_EXECUTED → RESOLVED → WITHDRAWN`; edge states `MISSED / LOST / DESYNC`.

Routes (data, not code): builtin `arb-sepolia-to-sepolia-testnet` (default),
`arb-sepolia-to-sepolia-devnet`, `arb-sepolia-to-chiado-testnet`,
`arb-sepolia-to-chiado-devnet`. Custom routes via `VEA_ROUTE_FILE` TOML.
Docker image: `ghcr.io/kleros/vea-validator3:latest`; state under `/data`.

---

## Comparison at a glance

| | vea/validator-cli | vea-validator2 | vea-validator3 |
|---|---|---|---|
| Language | TypeScript | Rust | Python |
| Roles | Oracle + Challenger | Oracle + Challenger + Relayer | Challenger only |
| Makes claims | yes | optional (`MAKE_CLAIMS`) | no |
| Relays messages | relayer-cli (separate) | yes (`execute_relay`) | drives own challenge resolution only |
| State store | — | per-route JSON | per-route SQLite |
| Routes | ArbToEth, ArbToGnosis | ArbToEth, ArbToGnosis | arb→sepolia, arb→chiado (+custom TOML) |

---

## Overnight task board (agent-workflow)

Task management now runs through the **agent-workflow control plane**
(`/home/agentops/dev/agent-workflow`), independent of this repo:

- Boards: `agent-workflow/tasks/<project>.md` — `vea.md` holds this repo's
  tasks. Grammar: `project/seam/deps/risk/status/scheduled/acceptance/description`.
  `scheduled: no` parks a task (visible, never runs); default yes.
- Registry: `agent-workflow/projects.toml` — `[vea]` table: base
  `fix/val-doc-1`, build `yarn workspace @kleros/vea-contracts build`, test
  `yarn workspace @kleros/vea-validator-cli test`, writer `claude-code`,
  reviewer `pi:val1-tester`, explainer `explain-html`, clean-room excludes
  vea-validator2/3.
- Nightly: `agent-night.timer` (systemd user, 23:00, Persistent) runs the
  agent-workflow skill: todo+scheduled tasks → worktree lanes → fresh writer →
  fresh reviewer → commit on `task/<project>/<id>-<slug>` → explain.html per
  task → `runs/<date>/digest.md`.
- Pane: Herdr `prefix+t` (plugin `agent-tasks`) shows all boards combined;
  keys `n` new, `s` status, `t` schedule-toggle, `d` delete, `p` open in pi,
  `e` edit, `r` refresh, `q` quit.
- Explain-diff HTMLs: `agent-workflow/runs/<date>/vea/<id>/explain.html` and
  `~/explain-diff/` (served at http://localhost:8123 for browsing).

**Retired:** the old pi-subagents schedule store
(`vea/.pi/subagents/schedules/`) was deleted after the b-pipeline completed
manually. The systemd `pi-schedule-run-due-vea` timer/scripts remain installed
but find nothing due.

**Task pipeline conventions (why this shape):** `val1-writer` is write-only by design —
its Claude runner only allows `git diff/log/status` and its system prompt forbids
commits. So task pipelines are: `delegate` runs `~/.local/bin/vea-task-prep.sh <id>`
(branch task/<id> off fix/val-doc-1) → `val1-writer` edits+tests only → `val1-tester`
reviews → `delegate` runs `~/.local/bin/vea-task-commit.sh <id> <msg>` (commits,
back to fix/val-doc-1; commit skipped if review returns FAIL). Never put git
branch/commit instructions in a val1-writer task. Commit messages must use
conventional types (`fix(b1): ...`, `ci(b3): ...`) — commitlint rejects `task(...)`.
For parallel work use a git worktree + `~/.local/bin/vea-task-commit-wt.sh`; note
worktrees need `.husky/_` copied in or the pre-commit hook fails.

**Task status (2026-09-16):**
- a1 (validator-cli review dev→fix/val-doc-1): DONE — report at
  `tasks/review-validator-dev-vs-fix.md` (NEEDS-CHANGES; findings F1–F7).
- b1 (#518 relayer pagination): committed `a16f390` on `task/b1` (review PASS). KEEP.
- b2 (#514 veashi-scanner fail-closed): committed `02ed613` on `task/b2` (review PASS). KEEP.
- b3 (#512 CI GHSA scoping): DROPPED by user — branch, commit, board entry and
  explain HTML all deleted.
- Follow-ups executed in parallel worktrees (2026-09-16), all reviewed PASS:
  `relayer-fix-1` = `11ae13a` (jest.setup wiring), `validator-fix-1` = `d105e59`+`76fbd7f`
  (F1 claimer cross-chain + router threading), `validator-fix-2` = `af4bb19`+`d61aee5`
  (F2 provider separation + claim-path wiring), `validator-fix-3` = `14a8286` (F3
  sendSnapshot args), `validator-fix-4` = `52d00c9` (F4 cold-start fallback),
  `validator-fix-5` = `66584b3` (F5 heartbeat cleanup, Option B), `validator-fix-6`
  = `a38e8ee` (F6 dead comment), `validator-fix-7` = `b2b36a6` (F7 docstring).
  All on `task/<id>` branches, not merged/pushed — integrate manually.

## Working conventions

- This file is loaded automatically by pi from the workspace root. Sub-repo
  specifics also live in each repo's `README.md` / `DESIGN_AND_RATIONALE.md` /
  `CLAUDE.md` / `docs/design.md` — read those before deep changes.
- Keep the clean-room boundary: don't cross-pollinate the TS CLIs into
  `vea-validator2` / `vea-validator3`.
- When contract addresses or routes change, update the tables above (and run
  `contracts/scripts/populateReadme.sh` in `vea/`).
- Never commit private keys / `.env*` files. Deposits are real value even on testnet.
