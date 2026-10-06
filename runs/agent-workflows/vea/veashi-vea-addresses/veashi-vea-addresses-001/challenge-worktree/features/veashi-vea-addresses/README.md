# veashi-vea-addresses

Consumers of `@kleros/veashi-sdk` (the relayer's Hashi executor, `veashi-scanner`, integrators) can get a route's Hashi contracts from the SDK but not Vea's own contracts, so Vea addresses are hardcoded elsewhere (for example `veashi-scanner/lib/vea/config.ts`). This feature adds testnet-only Vea getters to the SDK, generated from `contracts/deployments`: `getVeaInbox(sourceChainId, destinationChainId)` returns the route's testnet `VeaInbox`, with matching outbox and router getters.

Operator request (2026-09-28): "Update the Veashi SDK to provide Vea specific addresses. Only return testnet addresses for chains. Like getVeaInbox(sourceChainId, destChainId) returns the VeaInbox testnet."

- `feature.json`: the lane, its task file, the reviewers, and this README as the `prd` the design challenge reads.
- `policy.json`: the lane's owned paths (`veashi-sdk`) and the checks the controller runs independently (`build:ts`, `test`).
- `main-task.md`: the lane's task as an outcome brief.
- `decisions.md`: the operator's decisions, assumptions and deferrals from the workflow-grill interview.

Out of scope: updating consumers (`veashi-scanner`, `relayer-cli`) to use the getters, and publishing the package; both follow a release.

Launch: `workflow launch veashi-vea-addresses --dry-run`, then `--live`.
