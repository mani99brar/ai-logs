const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const { generate, serialize, DEFAULT_OUT_FILE } = require("../scripts/extract-vea.js");

const SCRIPT = path.resolve(__dirname, "../scripts/extract-vea.js");

test("committed vea/testnet.json equals what the generator produces from contracts/deployments", () => {
  assert.equal(fs.readFileSync(DEFAULT_OUT_FILE, "utf8"), serialize(generate()));
});

test("committed vea/testnet.json holds no Devnet deployment", () => {
  const routes = JSON.parse(fs.readFileSync(DEFAULT_OUT_FILE, "utf8"));
  for (const [key, route] of Object.entries(routes)) {
    for (const entry of Object.values(route)) {
      assert.match(entry.contract, /Testnet$/, `${key}: ${entry.contract}`);
    }
  }
});

test("running the generation step twice produces the same bytes as the committed file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vea-extract-"));
  try {
    const out = path.join(dir, "testnet.json");
    execFileSync(process.execPath, [SCRIPT, out], { stdio: "ignore" });
    const first = fs.readFileSync(out, "utf8");
    execFileSync(process.execPath, [SCRIPT, out], { stdio: "ignore" });
    const second = fs.readFileSync(out, "utf8");

    assert.equal(second, first);
    assert.equal(first, fs.readFileSync(DEFAULT_OUT_FILE, "utf8"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a route that needs a router but has no testnet router fails generation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vea-deployments-"));
  try {
    const write = (network, name, address) => {
      fs.mkdirSync(path.join(dir, network), { recursive: true });
      fs.writeFileSync(path.join(dir, network, `${name}.json`), JSON.stringify({ address }));
    };
    write("arbitrumSepolia", "VeaInboxArbToGnosisTestnet", `0x${"1".repeat(40)}`);
    write("chiado", "VeaOutboxArbToGnosisTestnet", `0x${"2".repeat(40)}`);
    write("sepolia", "RouterArbToGnosisDevnet", `0x${"3".repeat(40)}`);

    assert.throws(() => generate(dir), /needs a router/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a route missing its testnet outbox is left out", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vea-deployments-"));
  try {
    fs.mkdirSync(path.join(dir, "chiado"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "chiado", "VeaInboxGnosisToArbTestnet.json"),
      JSON.stringify({ address: `0x${"4".repeat(40)}` })
    );
    assert.deepEqual(generate(dir), {});
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
