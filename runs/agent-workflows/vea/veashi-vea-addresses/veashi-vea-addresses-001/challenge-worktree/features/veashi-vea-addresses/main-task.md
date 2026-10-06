# Task: main

## Goal

`@kleros/veashi-sdk` exposes Vea's own contract addresses per route, testnet only: `getVeaInbox(sourceChainId, destinationChainId)` returns the testnet `VeaInbox` of that route, alongside getters for the outbox and, on routes that have one, the router. The addresses are generated from `contracts/deployments`, never typed by hand. The exact API, data layout and generation step are set in `decisions.md`.

## Context

- The SDK today only knows Hashi routes: `veashi-sdk/getters.ts` looks up `ROUTES` (from the generated `registry.ts` and `addresses/<src>-<dst>.json`) keyed by `"<sourceChainId>-<destinationChainId>"`, and returns `undefined` for an unknown route. New getters follow that shape and style.
- Vea deployments live in `contracts/deployments/<network>/<Contract><Route><Flavour>.json` (hardhat-deploy; the address is the top-level `address`). Networks map to chain ids: `arbitrumSepolia` 421614, `sepolia` 11155111, `chiado` 10200. Testnet contracts end in `Testnet`; `Devnet` ones are excluded.
- Testnet routes today:
  - Arbitrum Sepolia → Sepolia (`421614-11155111`): `VeaInboxArbToEthTestnet` on arbitrumSepolia, `VeaOutboxArbToEthTestnet` on sepolia.
  - Arbitrum Sepolia → Chiado (`421614-10200`): `VeaInboxArbToGnosisTestnet` on arbitrumSepolia, `VeaOutboxArbToGnosisTestnet` on chiado, `RouterArbToGnosisTestnet` on sepolia.
  - Gnosis → Arbitrum has only Devnet deployments, so it has no testnet route.
- `yarn extract` (`veashi-contracts/script/generate-types.sh`) wipes and regenerates `veashi-sdk/addresses/`, `abi/`, `contracts/`, `typechain-types/` and `registry.ts`. It needs a forge build of `veashi-contracts` (git submodules), which a fresh worktree does not have, so the Vea generation must run on its own too.
- Setup already run for you: `bash features/_shared/setup.sh install` then `sdk` (typechain types from the committed `abi/`). The SDK has no tests yet.

## Constraints

- Change only the owned paths in `policy.json`. Do not edit `contracts/deployments/` or the files `generate-types.sh` generates (`addresses/`, `abi/`, `registry.ts`) by hand.
- The existing exports and getters behave exactly as before.
- No new runtime dependencies. Do not publish or bump the package version unless `decisions.md` says so.

## Acceptance

Each item names the test that proves it (node:test, run by the SDK's new `test` script against the compiled output):

- `getVeaInbox(421614, 11155111)` returns `VeaInboxArbToEthTestnet`'s address and `getVeaOutbox(421614, 11155111)` returns `VeaOutboxArbToEthTestnet`'s address; the test reads the expected values from `contracts/deployments`, not from literals.
- The same holds for `421614-10200`, and the router getter returns `RouterArbToGnosisTestnet`'s address there and `undefined` on `421614-11155111`.
- Every Vea getter returns `undefined` for a route with no testnet deployment (for example `10200-421614`, and a Hashi-only route such as `42161-1514`), and no getter ever returns a `Devnet` address.
- A test proves the committed generated Vea data equals what the generation step produces from `contracts/deployments` now, so a stale file fails.
- Running the generation step twice leaves the tree unchanged.
- The policy checks pass: `yarn workspace @kleros/veashi-sdk build:ts` and `yarn workspace @kleros/veashi-sdk test`.
- `veashi-sdk/README.md` documents the new getters, and says they return testnet addresses only.

## Stop

Report `blocked` instead of continuing when any of these happens:

- A setup step (`bash features/_shared/setup.sh install|sdk`) fails twice for reasons outside the repository (registry, network).
- A check can pass only by changing a path outside the owned paths.
- After sixty minutes of work, a required check still fails and you cannot name the next fix.

Report `question` only for a choice that would change this acceptance.
