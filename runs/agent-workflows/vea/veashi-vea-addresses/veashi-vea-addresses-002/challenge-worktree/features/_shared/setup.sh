#!/usr/bin/env bash
# Prepares a fresh worktree so the TypeScript packages' checks (jest, tsc) can run.
# Used as the `setup` steps of features' policy.json; run from the repository root:
#   bash features/_shared/setup.sh install|contracts|envio|sdk
# Every output is gitignored, so the verifier's clean-tree rule holds.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

case "${1:-}" in
  install)
    # HUSKY=0: husky install would set core.hooksPath in the shared .git/config for every checkout,
    # which would also bypass the local pre-push guard in .git/hooks.
    HUSKY=0 yarn install --immutable
    ;;
  contracts)
    # validator-cli, relayer-cli and veascan-web import contracts/typechain-types by relative path.
    yarn workspace @kleros/vea-contracts build
    ;;
  envio)
    # envio-indexer's build and tests type-check against the codegen output.
    yarn workspace envio-indexer codegen
    ;;
  sdk)
    # veashi-sdk's index.ts re-exports typechain-types (gitignored). Generate them from the committed abi/
    # instead of `yarn extract`, which needs a forge build of veashi-contracts and its submodules.
    cd veashi-sdk
    rm -rf typechain-types
    npx --no-install typechain --target ethers-v6 "abi/*.json" --out-dir typechain-types
    ;;
  *)
    echo "usage: $0 install|contracts|envio|sdk" >&2
    exit 2
    ;;
esac
