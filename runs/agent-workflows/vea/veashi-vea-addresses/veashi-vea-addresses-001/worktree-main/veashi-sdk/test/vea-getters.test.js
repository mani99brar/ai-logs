const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const sdk = require("../dist/index.js");

const DEPLOYMENTS_DIR = path.resolve(__dirname, "../../contracts/deployments");

function deployedAddress(network, contract) {
  return JSON.parse(fs.readFileSync(path.join(DEPLOYMENTS_DIR, network, `${contract}.json`), "utf8")).address;
}

function devnetAddresses() {
  const addresses = new Set();
  for (const network of fs.readdirSync(DEPLOYMENTS_DIR)) {
    for (const file of fs.readdirSync(path.join(DEPLOYMENTS_DIR, network))) {
      if (file.endsWith("Devnet.json")) addresses.add(deployedAddress(network, file.replace(/\.json$/, "")).toLowerCase());
    }
  }
  return addresses;
}

const VEA_GETTERS = ["getVeaInbox", "getVeaOutbox", "getVeaRouter", "getVeaRoute"];

test("Arbitrum Sepolia -> Sepolia returns the ArbToEth testnet inbox and outbox, no router", () => {
  const inbox = deployedAddress("arbitrumSepolia", "VeaInboxArbToEthTestnet");
  const outbox = deployedAddress("sepolia", "VeaOutboxArbToEthTestnet");

  assert.equal(sdk.getVeaInbox(421614, 11155111), inbox);
  assert.equal(sdk.getVeaOutbox(421614, 11155111), outbox);
  assert.equal(sdk.getVeaRouter(421614, 11155111), undefined);
  assert.deepEqual(sdk.getVeaRoute(421614, 11155111), { inbox, outbox });
});

test("Arbitrum Sepolia -> Chiado returns the ArbToGnosis testnet inbox, outbox and router", () => {
  const inbox = deployedAddress("arbitrumSepolia", "VeaInboxArbToGnosisTestnet");
  const outbox = deployedAddress("chiado", "VeaOutboxArbToGnosisTestnet");
  const router = deployedAddress("sepolia", "RouterArbToGnosisTestnet");

  assert.equal(sdk.getVeaInbox(421614, 10200), inbox);
  assert.equal(sdk.getVeaOutbox(421614, 10200), outbox);
  assert.equal(sdk.getVeaRouter(421614, 10200), router);
  assert.deepEqual(sdk.getVeaRoute(421614, 10200), { inbox, outbox, router });
});

test("getVeaRoutes lists exactly the testnet routes", () => {
  assert.deepEqual([...sdk.getVeaRoutes()].sort(), ["421614-10200", "421614-11155111"]);
});

test("every Vea getter returns undefined for a route without a testnet deployment", () => {
  const routes = [
    [10200, 421614], // Gnosis -> Arbitrum: Devnet only
    [42161, 1514], // Hashi-only route
    [11155111, 421614], // reversed testnet route
    [1, 42161],
  ];
  assert.ok(sdk.hasRoute(42161, 1514), "42161-1514 is expected to be a Hashi route");
  for (const [src, dst] of routes) {
    for (const getter of VEA_GETTERS) {
      assert.equal(sdk[getter](src, dst), undefined, `${getter}(${src}, ${dst})`);
    }
  }
});

test("no Vea getter ever returns a Devnet address", () => {
  const devnet = devnetAddresses();
  assert.ok(devnet.size > 0, "expected Devnet deployments to exist");

  for (const key of sdk.getVeaRoutes()) {
    const [src, dst] = key.split("-").map(Number);
    const returned = [
      sdk.getVeaInbox(src, dst),
      sdk.getVeaOutbox(src, dst),
      sdk.getVeaRouter(src, dst),
      ...Object.values(sdk.getVeaRoute(src, dst)),
    ].filter(Boolean);
    for (const address of returned) {
      assert.ok(!devnet.has(address.toLowerCase()), `${key} returned Devnet address ${address}`);
    }
  }
});

test("existing Hashi getters are unaffected", () => {
  const route = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../addresses/421614-11155111.json"), "utf8"));
  assert.deepEqual(sdk.getRoute(421614, 11155111), route);
  assert.equal(sdk.getRoute(10200, 421614), undefined);
});
