#!/usr/bin/env node
/**
 * Generates vea/testnet.json: the testnet Vea contract addresses per route, read from the
 * hardhat-deploy files in contracts/deployments. Run with `yarn extract:vea` (no forge build needed).
 *
 * Usage: node scripts/extract-vea.js [outFile]
 */
const fs = require("fs");
const path = require("path");

const DEFAULT_DEPLOYMENTS_DIR = path.resolve(__dirname, "../../contracts/deployments");
const DEFAULT_OUT_FILE = path.resolve(__dirname, "../vea/testnet.json");

// Only these networks are read; anything else (e.g. mainnets) is out of scope.
const NETWORK_CHAIN_IDS = {
  arbitrumSepolia: 421614,
  sepolia: 11155111,
  chiado: 10200,
};

const FLAVOUR = "Testnet";
const DEPLOYMENT_PATTERN = /^(VeaInbox|VeaOutbox|Router)([A-Za-z0-9]+?)(Testnet|Devnet)\.json$/;
const ROLES = { VeaInbox: "inbox", VeaOutbox: "outbox", Router: "router" };

function readDeployments(deploymentsDir) {
  const deployments = [];
  for (const network of Object.keys(NETWORK_CHAIN_IDS)) {
    const dir = path.join(deploymentsDir, network);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).sort()) {
      const match = DEPLOYMENT_PATTERN.exec(file);
      if (!match) continue;
      const [, kind, bridge, flavour] = match;
      deployments.push({ kind, bridge, flavour, network, file: path.join(dir, file) });
    }
  }
  return deployments;
}

function toEntry(deployment) {
  const { address } = JSON.parse(fs.readFileSync(deployment.file, "utf8"));
  if (typeof address !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(`${deployment.file}: missing or invalid top-level "address"`);
  }
  return {
    address,
    contract: `${deployment.kind}${deployment.bridge}${deployment.flavour}`,
    network: deployment.network,
  };
}

function generate(deploymentsDir = DEFAULT_DEPLOYMENTS_DIR) {
  const deployments = readDeployments(deploymentsDir);

  // A route needs a router when any flavour of it has one deployed.
  const bridgesWithRouter = new Set(deployments.filter((d) => d.kind === "Router").map((d) => d.bridge));

  const byBridge = {};
  for (const deployment of deployments.filter((d) => d.flavour === FLAVOUR)) {
    const role = ROLES[deployment.kind];
    const parts = (byBridge[deployment.bridge] ??= {});
    if (parts[role]) {
      throw new Error(`Duplicate ${deployment.kind}${deployment.bridge}${FLAVOUR}: ${parts[role].file}, ${deployment.file}`);
    }
    parts[role] = deployment;
  }

  const routes = {};
  for (const bridge of Object.keys(byBridge).sort()) {
    const { inbox, outbox, router } = byBridge[bridge];
    // A route exists only when both its testnet inbox and outbox are deployed.
    if (!inbox || !outbox) continue;
    if (bridgesWithRouter.has(bridge) && !router) {
      throw new Error(`Route ${bridge} needs a router but Router${bridge}${FLAVOUR} is not deployed`);
    }

    const key = `${NETWORK_CHAIN_IDS[inbox.network]}-${NETWORK_CHAIN_IDS[outbox.network]}`;
    if (routes[key]) throw new Error(`Route ${key} is produced by more than one bridge (${bridge})`);

    routes[key] = { inbox: toEntry(inbox), outbox: toEntry(outbox) };
    if (router) routes[key].router = toEntry(router);
  }

  const sorted = {};
  for (const key of Object.keys(routes).sort()) sorted[key] = routes[key];
  return sorted;
}

function serialize(routes) {
  return JSON.stringify(routes, null, 2) + "\n";
}

function main() {
  const outFile = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUT_FILE;
  const routes = generate();
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, serialize(routes));
  console.log(`✅ Wrote ${Object.keys(routes).length} Vea testnet routes to ${path.relative(process.cwd(), outFile)}`);
}

module.exports = { generate, serialize, NETWORK_CHAIN_IDS, DEFAULT_DEPLOYMENTS_DIR, DEFAULT_OUT_FILE };

if (require.main === module) main();
