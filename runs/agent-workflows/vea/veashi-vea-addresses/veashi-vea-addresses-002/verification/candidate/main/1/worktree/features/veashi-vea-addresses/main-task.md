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
- Setup already run for you: `bash features/_shared/setup.sh install` then `sdk` (typechain types from the committed `abi/`). The SDK has no tests, and this feature adds none (see `decisions.md`).
- `.nvmrc` pins Node 18: no `--experimental-strip-types`, no `fs.globSync`.

## Constraints

- Change only the owned paths in `policy.json`. Do not edit `contracts/deployments/` or the files `generate-types.sh` generates (`addresses/`, `abi/`, `registry.ts`) by hand.
- The existing exports and getters behave exactly as before.
- No new runtime dependencies, no tests, no version bump, no publish (see `decisions.md`).
- Build layout: nothing under `veashi-sdk` may import a file outside `veashi-sdk` into the tsc graph (`tsconfig.json` has no `rootDir`; an import of `../contracts/deployments/...` moves the output to `dist/veashi-sdk/` and breaks the package's `main`/`types` even though `build:ts` passes). `dist/index.js` and `dist/index.d.ts` stay at the top of `dist`.
- The generator is a plain CommonJS script (`.cjs`, only `fs` and `path`), outside the tsc graph, reading `contracts/deployments` at runtime. It writes `JSON.stringify(data, null, 2) + "\n"` with keys in a stable sorted order, so Prettier (lint-staged runs it on committed `*.json`) leaves the file unchanged.

## Acceptance

Proved by the policy checks (`typecheck`: `yarn workspace @kleros/veashi-sdk build:ts`; `vea-data-fresh`: `yarn workspace @kleros/veashi-sdk extract:vea` leaves `veashi-sdk` unchanged) and by what you verify and report yourself:

- `getVeaInbox(421614, 11155111)` and `getVeaOutbox(421614, 11155111)` return the addresses of `VeaInboxArbToEthTestnet` and `VeaOutboxArbToEthTestnet`; on `421614-10200` they return `VeaInboxArbToGnosisTestnet` and `VeaOutboxArbToGnosisTestnet`, and `getVeaRouter` returns `RouterArbToGnosisTestnet` there and `undefined` on `421614-11155111`.
- Every Vea getter returns `undefined` for a route with no testnet deployment (for example `10200-421614`, and a Hashi-only route such as `42161-1514`); no `Devnet` address appears in the JSON.
- The committed JSON is exactly what `yarn extract:vea` produces now, and running it twice leaves the tree unchanged (`vea-data-fresh`). `yarn extract` runs it after `generate-types.sh`.
- After `build:ts`, `dist/index.js`, `dist/index.d.ts` and the Vea JSON are in `dist` at the expected paths, and `package.json` `files`/`exports` publish the JSON by path. Record in `verify_yourself` the `node -e` command that prints the getters' results from `dist`.
- `veashi-sdk/README.md` documents the new getters (testnet addresses only), the JSON's entry shape (it is a public contract for non-JS consumers) and which routes need a router.

## Stop

Report `blocked` instead of continuing when any of these happens:

- A setup step (`bash features/_shared/setup.sh install|sdk`) fails twice for reasons outside the repository (registry, network).
- A check can pass only by changing a path outside the owned paths.
- After sixty minutes of work, a required check still fails and you cannot name the next fix.

Report `question` only for a choice that would change this acceptance.
