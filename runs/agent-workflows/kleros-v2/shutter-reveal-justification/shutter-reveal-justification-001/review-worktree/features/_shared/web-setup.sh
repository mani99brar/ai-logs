#!/usr/bin/env bash
# Prepares a fresh worktree so the web package's checks (vitest, tsc, eslint) can run.
# Used as the `setup` steps of web features' policy.json; run from the repository root:
#   bash features/_shared/web-setup.sh install|build|codegen
# Every output is gitignored, so the verifier's clean-tree rule holds.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

case "${1:-}" in
  install)
    # HUSKY=0: husky install would set core.hooksPath in the shared .git/config for every checkout.
    HUSKY=0 yarn install --immutable
    ;;
  build)
    # The packages web imports from their dist/ builds (same set as build:web:ci, plus the SDK for tsc).
    yarn workspace @kleros/kleros-v2-contracts run build
    yarn workspace @kleros/kleros-v2-contracts run build:all
    yarn workspace @kleros/kleros-app run build
    yarn workspace @kleros/kleros-sdk run build
    ;;
  codegen)
    cd web
    # web/scripts/gitInfo.js uses `import ... assert`, which Node >= 22 rejects; write the same file inline.
    node -e '
      const { execSync } = require("child_process");
      const run = (cmd) => { try { return execSync(cmd).toString().trim(); } catch { return null; } };
      const info = {
        version: require("./package.json").version,
        gitCommitHash: run("git rev-parse HEAD"),
        gitCommitShortHash: run("git rev-parse --short=7 HEAD"),
        gitBranch: run("git rev-parse --abbrev-ref HEAD"),
        gitTags: run("git tag --points-at HEAD") || "",
        clean: true,
      };
      require("fs").writeFileSync("src/generatedGitInfo.json", JSON.stringify(info, null, 2));
    '
    echo '{}' > src/generatedNetlifyInfo.json
    # GraphQL codegen introspects the devnet subgraphs (network); wagmi reads contracts/deployments.
    scripts/runEnv.sh devnet 'yarn generate'
    ;;
  *)
    echo "usage: $0 install|build|codegen" >&2
    exit 2
    ;;
esac
