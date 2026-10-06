# Decisions: veashi-vea-addresses

From the grill session of 2026-09-28 with the operator.

## Decisions

- Data format: the Vea testnet addresses are a generated, committed JSON file in `veashi-sdk` (for example `veashi-sdk/vea/testnet.json`), keyed by `"<sourceChainId>-<destinationChainId>"`, each entry holding `inbox`, `outbox` and, where the route has one, `router`. The package publishes it: `package.json` `files` includes it and `exports` exposes it by path, so Python and Rust projects can read the same file from npm or GitHub without the JS SDK. The TypeScript getters read this file; there is no second copy of the addresses.
- Provenance: each address in the JSON records the deployment it came from, its contract name and network (for example `VeaInboxArbToEthTestnet`, `arbitrumSepolia`). The data carries addresses only, no ABIs.
- Generation: a standalone Node script in `veashi-sdk`, run by a new `yarn extract:vea` script, reads `contracts/deployments` and writes the JSON. `yarn extract` runs it after `generate-types.sh`, so a full extract still produces it. It needs no forge build, and `veashi-contracts/script/generate-types.sh` is left unchanged.
- Public API, exported from `veashi-sdk/index.ts` and following the style of `getters.ts`: `getVeaInbox`, `getVeaOutbox` and `getVeaRouter`, each `` (sourceChainId: number, destinationChainId: number) => `0x${string}` | undefined ``; `getVeaRoute(sourceChainId, destinationChainId)` returning `{ inbox, outbox, router? }` or `undefined`; and `getVeaRoutes()` returning the route keys. Existing exports keep their names and behaviour.
- No tests (operator, after run 001): the feature adds no test suite. Correctness is shown by `build:ts` (check `typecheck`), by `vea-data-fresh` (regenerating the JSON leaves `veashi-sdk` unchanged) and by the worker's own `node -e` verification against `dist`, recorded in its completion.
- From design challenge attempt 1 of run 001: the generator is plain CommonJS (`.cjs`, `fs` and `path` only) outside the tsc graph; nothing in `veashi-sdk` imports a file outside it into tsc, so `dist/index.js` stays at the top of `dist`; the JSON is written as `JSON.stringify(data, null, 2) + "\n"` with sorted keys, so Prettier leaves it unchanged; which routes need a router is a small table in the generator (`ArbToGnosis` needs one), documented in the README with the entry shape.
- Version: `@kleros/veashi-sdk` stays at `0.1.0`. No version bump, no publish; the release bumps it.

## Assumptions

- Testnet means contracts named `*Testnet` in `contracts/deployments/{arbitrumSepolia,sepolia,chiado}`. `Devnet` deployments are never read or returned. Network-to-chain-id mapping: `arbitrumSepolia` 421614, `sepolia` 11155111, `chiado` 10200.
- A route is included only when both its testnet inbox and outbox exist, so today the JSON holds `421614-11155111` and `421614-10200`, and `10200-421614` (Devnet only) is absent. A route that needs a router but has no testnet router is an error at generation, not a silently incomplete entry.
- Address strings keep the checksummed form stored in the deployment files.

## Deferred

- Vea ABIs in the SDK (consumers keep using `@kleros/vea-contracts`).
- Mainnet and Devnet Vea addresses.
- Switching `veashi-scanner` (`lib/vea/config.ts`) and `relayer-cli` to the new getters, and publishing the package.
