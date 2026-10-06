# Research: Secure SALT handling in the RPS (clesaege/RPS) commit-reveal scheme

## Tooling / validation limitation (disclosed up front)
No live web tools (`web_search`, `source_check`) were registered for this run, so I could not
re-fetch the GitHub source or external docs live. This brief relies on (a) the verified source
facts supplied in the task and (b) well-established, version-specific behavior of Solidity
0.4.26 `keccak256`, ethers.js `solidityKeccak256`/`solidityPackedKeccak256`, web3.js
`soliditySha3`, and the WebCrypto `crypto.getRandomValues` API. Claims are labeled by support
type and confidence. Anything that must be byte-exact against a live deploy should be confirmed
by a one-time on-chain round-trip test (see Next steps).

## Summary
The commitment is `keccak256(abi.encodePacked(uint8 move, uint256 salt))` — a **33-byte
preimage** (1 byte move + 32 bytes salt), because Solidity 0.4.26's multi-argument
`keccak256(_c1, _salt)` does non-standard *tight packing* and the enum `Move` packs to `uint8`.
To reveal correctly you must reproduce that exact packed hash off-chain (ethers
`solidityKeccak256(["uint8","uint256"], [move, salt])`). The salt must be a **256-bit
cryptographically random value** generated with `crypto.getRandomValues`, kept secret until
reveal, and never reused; a deterministic salt derived from a wallet signature is an acceptable
recoverable alternative. Low-entropy, reused, predictable, or leaked salts let the counterparty
brute-force the committed move and always win or grief.

## Findings

1. **Claim:** The on-chain commitment is `keccak256` over a **tightly packed 33-byte** preimage:
   1 byte for the move (uint8) followed by 32 bytes for the salt (uint256).
   **Sources:** Verified source facts (task); Solidity 0.4.26 language semantics of
   multi-arg `keccak256` / `abi.encodePacked`.
   **Support:** direct evidence (source) + interpretation (packing rule).
   **Confidence:** high.
   **Explanation:** In Solidity ≤0.4.x, `keccak256(a, b, ...)` implicitly `abi.encodePacked`s the
   arguments (no 32-byte padding, no length prefix, no offset). `Move` is
   `enum {Null,Rock,Paper,Scissors,Spock,Lizard}` (6 values), and an enum is packed as its
   underlying `uint8` = **1 byte**. `uint256 _salt` packs as **32 bytes**. The provided
   `Hasher.hash(uint8 _c, uint256 _salt)` returning `keccak256(_c,_salt)` is a deliberate
   confirmation that the move contributes exactly one byte. Preimage layout:
   `bytes1(move) ‖ bytes32(salt)` → 33 bytes. **Researcher inference:** the whole point of the
   `Hasher` helper is to let clients compute the identical packed hash without guessing the
   encoding.

2. **Claim:** To match `solve()` off-chain, hash with *packed* (not standard-ABI) encoding using
   the exact types `uint8` (move) and `uint256` (salt).
   **Sources:** ethers.js and web3.js documented behavior of packed keccak helpers.
   **Support:** interpretation grounded in documented API behavior.
   **Confidence:** high.
   **Exact snippets:**
   - **ethers v5:**
     `ethers.utils.solidityKeccak256(["uint8","uint256"], [move, salt])`
   - **ethers v6:**
     `ethers.solidityPackedKeccak256(["uint8","uint256"], [move, salt])`
   - **web3.js:**
     `web3.utils.soliditySha3({type:"uint8", value: move}, {type:"uint256", value: salt})`
     (`soliditySha3` = keccak256 with `encodePacked` semantics).
   - **Do NOT** use `ethers.utils.keccak256(abi.encode(...))` /
     `defaultAbiCoder.encode` — that produces a 64-byte padded preimage and will **not** match
     `solve()`. **Do NOT** use `web3.utils.keccak256(...)` on already-abi-encoded padded data.
   - `salt` must be passed as a full 256-bit value (BigInt / decimal string / `0x`+64 hex chars).
     `move` must be the integer enum index (Rock=1, Paper=2, Scissors=3, Spock=4, Lizard=5;
     Null=0 is invalid to commit).
   **Pitfall (Confidence: high):** If you pass the move as a wider type (e.g. `"uint256"`) the
   packed length becomes 32+32 = 64 bytes and the hash will differ from the 33-byte on-chain
   value. Type width must be `uint8` to reproduce the contract.

3. **Claim:** Correct salt lifecycle: generate 256 bits of CSPRNG entropy, keep it secret and
   durable off-chain from commit until reveal, then supply `(move, salt)` to `solve()`.
   **Sources:** WebCrypto `crypto.getRandomValues` spec behavior; commit-reveal design principles.
   **Support:** interpretation / best practice.
   **Confidence:** high.
   **Generation (browser/WebCrypto):**
   ```js
   const bytes = new Uint8Array(32);
   crypto.getRandomValues(bytes);                 // 256 bits CSPRNG
   const salt = "0x" + [...bytes].map(b => b.toString(16).padStart(2,"0")).join("");
   // or: const salt = ethers.hexlify(bytes)  (ethers v6)
   ```
   Avoid `Math.random()` (not cryptographic) and avoid truncating to <256 bits.
   **Flow:**
   - Player 1 picks `move`, generates `salt`, computes `c1Hash` (Finding 2), deploys `RPS(c1Hash, j2)`
     with stake — the salt/move never touch the chain at commit time.
   - `salt` + `move` must survive until reveal; loss = cannot call `solve()` (see Finding 5/6).
   - At reveal, call `solve(move, salt)`; contract recomputes the 33-byte packed hash and compares.
   **localStorage / storage risks (Confidence: high):** `localStorage`/`sessionStorage` are
   plaintext, per-origin, readable by any script on that origin (XSS = full salt+move
   disclosure), not encrypted at rest, and can be cleared by the user/browser (data loss →
   inability to reveal → loss of stake via `j1Timeout`). Preferred: keep the secret in memory for
   the (short, 5-minute-TIMEOUT) game, or persist encrypted (e.g., derive from a wallet signature,
   Finding 8) rather than storing the raw salt in `localStorage`. If persisted, treat it as a
   credential, not UI state.

4. **Claim:** The 5-minute TIMEOUT makes salt *availability* a real, time-boxed liability.
   **Sources:** Verified facts (TIMEOUT=5 minutes; `j1Timeout` pays `2*stake` to j2;
   `j2Timeout` refunds stake to j1).
   **Support:** direct evidence + interpretation.
   **Confidence:** high.
   **Explanation:** Player 1 (the committer) must be able to reveal within the timeout window; if
   the salt is lost/inaccessible and Player 2 has moved, `j1Timeout` lets j2 take `2*stake`. So
   salt durability for the short window matters as much as secrecy. **Inference:** losing the salt
   is economically equivalent to forfeiting the entire pot.

5. **Claim (security — brute force / low entropy):** A short or low-entropy salt lets Player 2
   brute-force Player 1's committed move before/at reveal.
   **Sources:** commit-reveal threat model; the hash preimage structure (Finding 1).
   **Support:** interpretation.
   **Confidence:** high.
   **Explanation:** `c1Hash` is public on-chain. The move space is tiny (5 valid values). If the
   salt has low entropy (e.g., a small integer, timestamp, counter, or weak PRNG), an attacker
   enumerates `keccak256(uint8 move ‖ uint256 salt)` over the small move set × the reachable salt
   space and recovers the move — then plays the guaranteed winner. A full 256-bit random salt
   makes this space (2^256) infeasible to search, which is the defense. **Attacks a
   "always-win" party could use:** (a) precompute/guess the move from a weak salt then choose the
   beating move; (b) exploit predictable salts (block data, `now`, incrementing nonce, PID/time
   seeds); (c) rainbow-table small salt ranges offline.

6. **Claim (security — reuse):** Reusing a salt (or salt+move) across games leaks information and
   can fully deanonymize a future commit.
   **Sources:** cryptographic commitment hygiene.
   **Support:** interpretation.
   **Confidence:** high.
   **Explanation:** If a `(move, salt)` pair was ever revealed on-chain, its `keccak256` is now
   public knowledge. Reusing that same salt in a new game lets anyone match the new `c1Hash`
   against known pairs and instantly learn the move. Even reusing only the salt across moves lets
   an attacker test all 5 moves against the known salt cheaply. **Rule:** one fresh 256-bit salt
   per commitment.

7. **Claim (security — leak / loss):** Leaking the salt before reveal breaks the binding secrecy;
   losing it forfeits the game.
   **Sources:** commit-reveal design; Finding 4.
   **Support:** interpretation.
   **Confidence:** high.
   **Explanation:** *Leak* (XSS reading `localStorage`, logging the salt, transmitting it,
   committing it to shared storage/repos) → opponent learns the move and picks the winner → j1
   loses. *Loss* (cleared storage, lost device within the 5-min window) → j1 cannot `solve()` →
   `j1Timeout` hands `2*stake` to j2. Both failure modes are catastrophic; secrecy AND durability
   are both required.

8. **Claim (best practice):** Use a **256-bit CSPRNG salt** per game as the default; a
   **deterministic salt derived from a wallet signature** is the recommended *recoverable*
   alternative when durability/UX matters.
   **Sources:** best-practice commit-reveal patterns; EIP-191/EIP-712 signing model; WebCrypto.
   **Support:** interpretation / recommendation.
   **Confidence:** medium-high (recommendation, not a single canonical spec).
   **Recommendation details:**
   - **Option A — random (simplest, strongest secrecy):**
     `crypto.getRandomValues(new Uint8Array(32))` → `salt` (Finding 3). Persist ephemerally
     (memory) or encrypted; never plaintext-log or reuse.
   - **Option B — deterministic from signature (recoverable, no plaintext storage needed):**
     Have the player sign a fixed, game-specific message (e.g. EIP-712 domain with contract
     address + a per-game nonce/label), then
     `salt = keccak256(signature)` truncated/taken as `uint256`. Because a wallet signature is
     high-entropy and reproducible only by the key holder, the player can **re-derive** the salt at
     reveal time from the same message without ever storing the raw salt — this removes the
     `localStorage` loss/leak risk while preserving 256-bit strength. **Caveats:** the signing
     message MUST be unique per game (include contract address + nonce) so salts are never reused
     (Finding 6); use deterministic ECDSA signing or you must persist the signature; do not reuse
     a signature that is also used elsewhere.
   - **Exact keccak256 encoding to commit/reveal in both options (must match Finding 1/2):**
     `c1Hash = keccak256(abi.encodePacked(uint8(move), uint256(salt)))`
     ↔ ethers `solidityKeccak256(["uint8","uint256"],[move,salt])`.
   - Always validate off-chain that your computed `c1Hash` equals `Hasher.hash(move, salt)` (the
     contract's own helper) before deploying, to guarantee `solve()` will succeed.

## Contradictions
None found. (No conflicting evidence surfaced; note that live-source cross-checks were not
possible this run — see limitation.)

## Missing evidence
- Byte-exactness of the ethers/web3 snippets against the *actual deployed bytecode* was not
  live-verified (no on-chain execution and no live doc fetch this run). High confidence from
  version semantics, but a one-time round-trip test is recommended before production use.
- Whether the specific compiler build used for the deployed contract has any nonstandard enum
  packing quirk — extremely unlikely, but unverified live.
- The exact text/structure of any recommended EIP-712 message for Option B is a design choice,
  not dictated by the contract; no canonical source mandates a specific format for this contract.

## Sources
- Kept: Task-provided verified RPS source facts (pragma 0.4.26; `Move` enum 0..5;
  `solve(Move,uint256)` with `require(keccak256(_c1,_salt)==c1Hash)`; `Hasher.hash(uint8,uint256)`;
  constructor; TIMEOUT=5m; timeout payouts) — defines the exact preimage and reveal check.
- Kept (knowledge, not live-fetched): Solidity 0.4.26 `keccak256`/`abi.encodePacked` tight-packing
  and enum→uint8 rules — determines the 33-byte layout.
- Kept (knowledge): ethers.js `solidityKeccak256`/`solidityPackedKeccak256` and web3.js
  `soliditySha3` packed-hash semantics — the correct off-chain reproduction.
- Kept (knowledge): WebCrypto `crypto.getRandomValues` (CSPRNG) — salt generation.
- Rejected/deprioritized: generic "how to play RPS" and SEO tutorials — not authoritative on
  byte-level encoding or threat model.

## Next steps
1. Run a one-time round-trip test: pick `move`/`salt`, compute `c1Hash` with
   `solidityKeccak256(["uint8","uint256"],...)`, call the deployed `Hasher.hash(move,salt)`, and
   assert equality; then confirm `solve()` accepts it on a testnet fork. This closes the only
   material uncertainty (byte-exactness).
2. If adopting Option B (signature-derived salt), pin an EIP-712 message that includes the RPS
   contract address + a per-game nonce to guarantee uniqueness and re-derivability.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Produced a focused research brief answering all four requested questions (commitment computation/33-byte packed preimage + exact ethers/web3 hashing; full salt lifecycle incl. crypto.getRandomValues, localStorage risks, recovery to solve(); security threats brute-force/reuse/loss/leak/predictable; best-practice 256-bit random vs signature-derived salt with exact keccak256 encoding). No scope widening; contract not modified."
    },
    {
      "id": "criterion-2",
      "status": "satisfied",
      "evidence": "Findings labeled by support type (direct evidence vs interpretation vs inference) and confidence; contradictions and missing-evidence sections included; validation limitation (no live web_search/source_check this run) disclosed; kept/rejected sources listed; concrete verification next step provided for independent acceptance review."
    }
  ],
  "changedFiles": [
    "/home/agentops/.pi/agent/sessions/--home-agentops-agent-team--/subagent-artifacts/outputs/f9d6d466-eaea-4fe6-8aba-62698e535112/research.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [],
  "validationOutput": [
    "No live search/validation tools registered this run; brief based on task-verified source facts and version-specific Solidity/ethers/web3/WebCrypto semantics. Limitation disclosed in-document."
  ],
  "residualRisks": [
    "Byte-exactness of ethers/web3 snippets vs deployed bytecode not live-verified; recommended one-time on-chain round-trip test via Hasher.hash before production use.",
    "web_search/source_check unavailable, so external citations could not be freshly fetched."
  ],
  "noStagedFiles": true,
  "diffSummary": "Added research.md containing the RPS commit-reveal SALT security brief at the runtime-authoritative output path.",
  "reviewFindings": [
    "no blockers"
  ],
  "manualNotes": "Only Read/Write/contact_supervisor tools were available; web research tools were not registered, so findings rest on supplied verified facts plus established Solidity 0.4.26 packing and JS crypto semantics. A testnet round-trip is the single recommended confirmation step."
}
```
