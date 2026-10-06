# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Vea is an optimistic cross-chain message bridge (Arbitrum → Ethereum, Arbitrum → Gnosis, Gnosis → Arbitrum). The repo is a Yarn 4 monorepo (node-modules linker, no PnP) that also hosts **Veashi**: Kleros' integration of the Hashi multi-bridge aggregator, where Vea is one of several bridge adapters alongside LayerZero, CCIP, deBridge and Axelar.

Two product lines live side by side and share tooling but not much code:

| Line   | Workspaces                                                                                  |
| ------ | ------------------------------------------------------------------------------------------- |
| Vea    | `contracts`, `validator-cli`, `relayer-cli`, `envio-indexer`, `veascan-web`, `*-subgraph-*` |
| Veashi | `veashi-contracts`, `veashi-sdk`, `veashi-scanner`, plus the Hashi executor in `relayer-cli` |

Default branch and PR target is `dev`. `master` is release.

## Setup and repo-wide commands

```bash
yarn install                      # from root; runs husky install via postinstall
yarn workspace <pkg> <script>     # run any workspace script from root
```

Toolchain pinned via `packageManager`/volta: Yarn 4.6.0, Node 22–24. Prettier (printWidth 120, es5 trailing commas) runs on staged files via lint-staged; commits are checked by commitlint with the conventional-commits preset (`feat:`, `fix:`, `chore:` ...). Solidity is formatted by prettier-plugin-solidity and linted by solhint; `.editorconfig` sets 4-space indent for `.sol`, 2 for everything else.

`enableTransparentWorkspaces: false` in `.yarnrc.yml` means workspaces only link to each other through an explicit `workspace:` dependency. `veashi-scanner` and `relayer-cli` deliberately consume `@kleros/veashi-sdk` from npm, not the local workspace, so a local SDK change is not picked up by them until published and bumped.

## Build order dependency: contracts typechain

`validator-cli`, `relayer-cli` and `veascan-web` import `../../../contracts/typechain-types` and `contracts/deployments/**.json` directly by relative path. `typechain-types` is gitignored, so on a fresh clone nothing in those packages type-checks or tests until you run:

```bash
yarn workspace @kleros/vea-contracts build     # hardhat compile + typechain
```

Similarly `envio-indexer` needs `yarn codegen` once (and after any `config.yaml`/`schema.graphql` change) before `build`/`test`/`dev` will type-check.

## Per-workspace commands

### `contracts` (Hardhat, Solidity 0.8.30, viaIR, ethers v6)

```bash
cd contracts
yarn build                                   # hardhat compile
yarn test                                    # TS_NODE_TRANSPILE_ONLY=1 hardhat test (mocha, 20s timeout)
yarn hardhat test test/integration/ArbToEth.ts   # single test file
yarn check                                   # hardhat check (solhint)
yarn lint                                    # solhint --fix src/**/*.sol
yarn size                                    # contract sizer
yarn start-local                             # hardhat node with ArbToEth inbox+outbox mocks deployed
yarn deploy --network <net> --tags <Tag>     # hardhat-deploy; see package.json deploy:* scripts for route combos
```

CI (`.github/workflows/contracts-testing.yml`) runs `hardhat coverage --testfiles "./test/**/*.ts"`. Tests live in `test/integration/*.ts` (full claim/challenge/verify/relay flows against bridge mocks in `src/test/`) and `test/merkle/`. Deploy scripts in `deploy/01-outbox`, `02-inbox`, `03-routers` are ordered because the outbox is deployed first and predicts the inbox address from the deployer nonce on the other chain. Named accounts: `deployer`, `relayer`, `bridger`, `challenger`. Requires a `.env` (copy `.env.example`) for live networks. `./scripts/populateReadme.sh` regenerates the deployed-addresses section of `contracts/README.md` from `deployments/`.

### `validator-cli` (Oracle + Challenger bot, Jest)

```bash
cd validator-cli
yarn start --saveSnapshot --path=both      # ts-node src/watcher.ts; --path=challenger|bridger|both
yarn test                                  # jest --coverage
yarn jest src/helpers/validator.test.ts    # single file
yarn jest -t "snapshot"                    # by name
```

Tests are colocated `*.test.ts` next to sources. Config comes from `.env` (see `.env.dist`): `NETWORKS=devnet,testnet`, `RPC_ARB/RPC_ETH/RPC_GNOSIS` (comma-separated, first is primary and the rest are fallbacks), `ENVIO_URL`.

### `relayer-cli` (Vea relayer + Hashi executor, Jest)

```bash
cd relayer-cli
yarn start-relayer                    # ts-node src/relayer.ts
yarn test                             # jest --coverage (jest.setup.ts stubs RPC env vars)
yarn test src/utils/relay.test.ts     # single file
```

Routes are selected by env: `VEA_CHAINS=421614-11155111,...` for Vea, `HASHI_CHAINS=...` for Hashi. Per-route progress is persisted in `state/<network>_<src>_<dst>.json` (Vea: last relayed nonce; Hashi: last scanned block + pending messages) under `STATE_DIR`, and a lockfile guards each route. These state files are committed.

### `envio-indexer` (Envio HyperIndex, ESM, Jest)

```bash
cd envio-indexer
yarn codegen     # required first; writes .envio/types.d.ts (gitignored)
yarn dev         # local indexer + GraphQL playground on :8080 (password "testing")
yarn build
yarn test        # tsc --build && NODE_OPTIONS=--experimental-vm-modules jest
```

One `config.yaml`/`schema.graphql` indexes VeaInbox (Arbitrum Sepolia), VeaOutbox (Sepolia, Chiado) and Hashi's Yaho (Story, Arbitrum One, Arbitrum Sepolia). Handlers in `src/handlers/{inbox,outbox,yaho}.ts`; tests use `createTestIndexer` and need no database. The outbox's relayed-message entity is `MessageExecution`, not `Message`, to avoid colliding with the inbox's `Message` entity. Both bots and `veashi-scanner` read from this indexer via `ENVIO_URL` / `VITE_ENVIO_URL`.

### `veashi-contracts` (Foundry, git submodules)

```bash
git submodule update --init --recursive    # lib/ holds forge-std, hashi, OZ, chainlink, LayerZero, axelar
cd veashi-contracts
forge build
forge fmt
./script/deploy-route.sh --reporter-chain $SOURCE_RPC --adapter-chain $DESTINATION_RPC --vea --lz --ccip [--hashi] [--lightbulb] [--debridge] [--axelar]
```

No Foundry test suite exists here. `remappings.txt` maps external libs into `lib/`, and OZ 5.0.2 plus `solidity-rlp` come from the root `node_modules`. `deploy-route.sh` writes deployed addresses to `broadcast/<src>-<dst>.json` via `script/helpers/DeploymentState.sol`; those files are the source of truth the SDK ingests. Some chains (Tempo, id 4217) need a raised gas multiplier and the script auto-applies it.

### `veashi-sdk` (`@kleros/veashi-sdk`, published to npm)

```bash
cd veashi-sdk
yarn build     # clean → extract → tsc
```

`yarn extract` runs `../veashi-contracts/script/generate-types.sh`, which: copies Hashi core (Yaho/Yaru/Hashi) and adapter `.sol` sources into `contracts/`, pulls ABIs from `veashi-contracts/out`, runs TypeChain (ethers-v6) into `typechain-types/`, copies `broadcast/<src>-<dst>.json` into `addresses/`, and regenerates `registry.ts`. So `contracts/`, `abi/`, `addresses/`, `typechain-types/` and `registry.ts` are generated: edit `veashi-contracts` and re-run `yarn build` rather than editing them by hand. Route lookups (`getRoute`, `getYaho`, `getAvailableBridges`, ...) in `getters.ts` are keyed by `"<sourceChainId>-<destinationChainId>"`. Adding a route to Veashi means deploying with `deploy-route.sh`, rebuilding the SDK, publishing, then bumping the pinned version in `veashi-scanner` and `relayer-cli`.

### `veashi-scanner` (Vite + React 18 + Tailwind v4 + viem)

```bash
cd veashi-scanner
yarn dev        # :5173
yarn build      # tsc -b && vite build
yarn lint       # eslint (flat config, eslint 9)
```

Path alias `@/` → package root (there is no `src/`; `components/`, `hooks/`, `lib/`, `pages/` sit at the top). Hashi routes come from the SDK; Vea routes are hardcoded in `lib/vea/config.ts`. Env: `VITE_ENVIO_URL`, optional `VITE_RPC_<chainId>` overrides.

### `veascan-web` (Parcel + React + styled-components, legacy explorer)

```bash
cd veascan-web
yarn start / yarn build      # via scripts/runEnv.sh which sources .env and .env.public
yarn generate                # graphql-codegen against the subgraph URLs in env → src/gql/
yarn check-types && yarn check-style
```

Depends on `@kleros/vea-contracts` as a `workspace:^` dependency and on the three subgraphs below.

### Subgraphs (`veascan-subgraph-inbox`, `veascan-subgraph-outbox`, `relayer-subgraph-inbox`)

```bash
yarn update:<network>   # rewrites subgraph.yaml addresses from ../contracts/deployments
yarn codegen && yarn build
yarn test               # relayer-subgraph-inbox only (matchstick)
```

`services/graph-node` has a docker-compose for a local graph node. These predate `envio-indexer`, which the bots and the new scanner now use instead.

## Vea protocol architecture (what the code is modelling)

Every route has an **inbox** on the source chain and an **outbox** on the destination chain, plus a **router** on Ethereum when neither end is Ethereum (Arbitrum ↔ Gnosis). Contract names encode the route: `VeaInboxArbToEth` / `VeaOutboxArbToEth`, `VeaInboxArbToGnosis` / `RouterArbToGnosis` / `VeaOutboxArbToGnosis`, etc. `*Devnet` variants are outboxes with relaxed timing for testing, and `contracts/src/test/` holds mocks of the canonical Arbitrum bridge and the Gnosis AMB used in Hardhat tests and local deploys.

Message lifecycle, which is also the sequence the bots and indexer follow:

1. **Send** — a sender gateway calls `VeaInbox.sendMessage(to, data)`. The inbox appends `keccak(keccak(msgId, to, from, data))` to an incremental Merkle tree (`bytes32[64]`) and emits `MessageSent(nodeData)`. Relayers rebuild the tree off-chain from these events to produce proofs.
2. **Snapshot** — anyone calls `saveSnapshot()`; the root for the current epoch (`block.timestamp / epochPeriod`) is stored and `SnapshotSaved` emitted. The validator bot does this near the end of each epoch (`--saveSnapshot`).
3. **Claim** — an oracle posts `VeaOutbox.claim(epoch, stateRoot)` with a deposit (Gnosis outbox uses WETH). `Claim` struct in `interfaces/types/VeaClaim.sol` is passed back by callers on every later step because the outbox stores only its hash.
4. **Challenge / Verify** — within `minChallengePeriod` anyone can `challenge`. Unchallenged claims pass a censorship test (`startVerification` → `verifySnapshot`, bounded by `maxMissingBlocks`), and the outbox's `stateRoot` is set. Challenged claims are resolved by sending the true root through the canonical bridge: `VeaInbox.sendSnapshot` → Arbitrum outbox (→ router → AMB for Gnosis) → `resolveDisputedClaim`. The honest party gets the deposit.
5. **Relay** — `sendMessage(proof, msgId, to, data)` on the outbox verifies inclusion against `stateRoot` and calls `to`. `TransactionBatcher` lets the relayer bot relay many messages in one tx.

The outbox also tracks a `sequencerDelayLimit` mirrored from Arbitrum's `SequencerInbox` (via the router on Gnosis routes) so timing assumptions stay valid if Arbitrum changes it.

**Bots.** `validator-cli/src/watcher.ts` loops every 2 minutes over `NETWORKS × chains`, keeps a per-epoch `TransactionHandler` (chosen by chainId+network in `utils/transactionHandlers/index.ts`) that owns pending txs, and dispatches to `helpers/claimer.ts`, `helpers/validator.ts` (challenge + resolve) and `helpers/snapshot.ts`. `relayer-cli/src/relayer.ts` loops over `VEA_CHAINS` (relay from indexer-derived proofs, once per epoch) and `HASHI_CHAINS` (`utils/hashi.ts`, every 5 minutes). Route constants for both bots live in `src/consts/bridgeRoutes.ts`, keyed by **destination** chainId, and import deployment JSON straight from `contracts/deployments`.

## Veashi / Hashi architecture

Hashi is a "bridge of bridges": a message is dispatched once via **Yaho** on the source chain, each configured **Reporter** forwards its hash over its own bridge to a matching **Adapter** on the destination chain, and **Yaru** executes the message once `threshold` adapters agree on the hash. `veashi-contracts/src/adapters/` holds the Reporter/Adapter pairs per bridge; `VeaReporter` implements Vea's `ISenderGateway` and `VeaAdapter` implements `IReceiverGateway`, which is how Vea plugs into Hashi. `HashiSwitch`/`HashiLightbulb` are demo contracts used to smoke-test a route.

Data flow: `deploy-route.sh` → `broadcast/<src>-<dst>.json` → `veashi-sdk/addresses` + `registry.ts` → consumed by `veashi-scanner` (UI), `relayer-cli` Hashi executor (which Yaho/Yaru/Hashi to talk to) and `envio-indexer` (Yaho `MessageDispatched` events).

## Boundaries

- Never change anything under `features/`, `contracts/deployments/`, `veashi-contracts/broadcast/`, `relayer-cli/state/` or the generated `veashi-sdk` files (`contracts/`, `abi/`, `addresses/`, `typechain-types/`, `registry.ts`) unless the task says so.
- Never deploy, send transactions or run scripts against a live chain (`yarn deploy`, `forge script --broadcast`, `deploy-route.sh`, the bots' `start` scripts). Never push.
- A fresh worktree has no `node_modules`, `contracts/typechain-types` or envio codegen: from the repository root run `bash features/_shared/setup.sh install`, then `contracts`, then `envio` if you touch `envio-indexer`.
- The machine is shared by parallel runs: never stop processes by name pattern (`pkill -f`, `killall`); stop only the PIDs you started.

## Workflow (operator notes; workers skip this section)

Features under `features/` run with md-manager's workflow controller (`~/dev/md-manager/workflow`, see its README.md and RUNBOOK.md). `workflow` on PATH wraps `~/dev/md-manager/.venv/bin/python -m workflow`; with no `--repo` it targets this repository.

- This workflow setup (this file, `features/` and `.husky/pre-push`) lives on the local branch `workflow/base`, cut from `dev`, and is never pushed. A pre-push hook (`.husky/pre-push`, copied to `.git/hooks/pre-push`) refuses any commit containing `CLAUDE.md` or `features/`. Launch from `workflow/base`; to open a PR, cherry-pick the run's fix commits onto a branch cut from `dev`.
- New feature: `workflow init <feature>`, then `/workflow-grill <feature>` writes `features/<feature>/decisions.md`. Commit the feature files before launching; preparation refuses a dirty tree.
- Every acceptance item names the test that proves it.
- Features share the policy `setup` in `features/_shared/setup.sh` (`install`, `contracts`, `envio`).
- Check: `workflow launch <feature> --dry-run`.
- Launch in a new Herdr tab: `WORKFLOW_WORKER_EFFORT=medium ANTHROPIC_MODEL=claude-opus-5-5 workflow launch <feature> --live --automatic --worker-timeout-seconds 10800 --review-timeout-seconds 3600`.
- Runs are stored in `~/.local/state/agent-workflows/vea/<feature>/<run-id>`. `workflow status|answer|resume|repair` take that run path.
