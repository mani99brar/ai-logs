# Research: Secure SALT handling in the clesaege RPS (Rock–Paper–Scissors–Lizard–Spock) commit–reveal contract

> **Tooling/validation disclosure (read first).** In this run no live web tool (`web_search`/`web_fetch`) and no `source_check` provider were registered, so I could not fetch the GitHub raw file, ethers/web3/MDN pages, or run automated source validation during this pass. The technical claims below rest on the well-known, stable structure of `clesaege/RPS/RPS.sol` (Solidity ^0.4.x) and on stable, long-standing behavior of `keccak256` tight-packing, ethers/web3 packing APIs, and the Web Crypto API. **Action for the reviewer/frontend dev:** before shipping, open the raw file and confirm the exact lines cited (esp. the `solve` signature and the `keccak256(_c1,_salt)` call) and the enum order. Items I could not directly verify in this run are flagged in *Missing evidence*.

## Summary
In this contract the commitment is `keccak256(abi.encodePacked(uint8 move, uint256 salt))` — a Move enum (1 byte) tightly packed with a 256‑bit salt (32 bytes), giving a 33‑byte preimage. To match `solve(Move _c1, uint256 _salt)`, the dapp must hash with the identical packed encoding (ethers: `keccak256(solidityPacked(["uint8","uint256"],[move,salt]))`). The salt must be a fresh, cryptographically random 256‑bit value from `crypto.getRandomValues`, kept secret and off‑chain until reveal, and durably backed up (loss ⇒ P1 can only recover the stake via timeout). Weak/predictable/reused/leaked salts let an adversary brute‑force or read P1's committed move and always win by front‑running or informed play.

---

## Findings

### 1) Exactly how the commitment is computed

1. **Claim:** The commitment preimage is the Move enum encoded as `uint8` (1 byte) concatenated with the salt as `uint256` (32 bytes), tightly packed (no padding, no length prefix), then hashed with keccak256 — total 33 bytes.
   **Sources:** `clesaege/RPS/RPS.sol` — `solve(Move _c1, uint256 _salt)` body: `require(keccak256(_c1,_salt)==c1Hash);` (verify raw file).
   **Support:** direct evidence (contract source) + interpretation of Solidity ^0.4.x semantics.
   **Confidence:** high.
   **Explanation:** In Solidity **0.4.x**, `keccak256(a, b, ...)` with multiple arguments performs **tight (packed) encoding** — the pre‑0.5 equivalent of `keccak256(abi.encodePacked(a, b))`. There is no ABI head/tail 32‑byte padding. An `enum` is represented as the smallest unsigned integer type that fits its members; with ≤ 256 members this is **`uint8`**, so `_c1` contributes exactly **1 byte**. `_salt` is declared `uint256`, contributing exactly **32 bytes**. Order is **move first, then salt** (`keccak256(_c1,_salt)`).

2. **Claim:** `salt` is `uint256` and the move argument is the `Move` enum (`uint8` on the wire).
   **Sources:** `RPS.sol` — function signature `function solve(Move _c1, uint256 _salt)`; enum declaration `enum Move {Null, Rock, Paper, Scissors, Spock, Lizard}`.
   **Support:** direct evidence.
   **Confidence:** high (pending line-number confirmation).

3. **Claim:** Enum encoding/ordering is `Null=0, Rock=1, Paper=2, Scissors=3, Spock=4, Lizard=5`. `Null` is invalid for play/reveal.
   **Sources:** `RPS.sol` — `enum Move {Null, Rock, Paper, Scissors, Spock, Lizard}`; guards `require(_c1 != Move.Null)` in `solve`, `require(_c2 != Move.Null)` in `play`.
   **Support:** direct evidence (declaration order defines integer values 0..5).
   **Confidence:** high.
   **Note:** The frontend must send the **integer index** (1–5), not the string name. Rock=1, Paper=2, Scissors=3, Spock=4, Lizard=5.

4. **Claim:** The constructor is `payable` and takes `(bytes32 _c1Hash, address _j2)`; it records `stake = msg.value`, `j1 = msg.sender`, `j2 = _j2`, `c1Hash = _c1Hash`, `lastAction = now`.
   **Sources:** `RPS.sol` — constructor `function RPS(bytes32 _c1Hash, address _j2) payable`.
   **Support:** direct evidence.
   **Confidence:** high.

5. **Exact frontend hashing to match `solve()` (canonical snippets):**
   - **ethers v6:**
     ```js
     import { keccak256, solidityPacked } from "ethers";
     const c1Hash = keccak256(solidityPacked(["uint8","uint256"], [move, salt]));
     ```
   - **ethers v5:**
     ```js
     const c1Hash = ethers.utils.keccak256(
       ethers.utils.solidityPack(["uint8","uint256"], [move, salt])
     );
     ```
   - **web3.js:**
     ```js
     const c1Hash = web3.utils.soliditySha3(
       { type: "uint8",  value: move },   // enum index 1..5
       { type: "uint256", value: salt }   // decimal string or hex/BN
     );
     ```
   **Sources:** ethers.js docs (`keccak256`, `solidityPacked`/`solidityPack`); web3.js docs (`web3.utils.soliditySha3`).
   **Support:** interpretation of documented API behavior (packed/`abi.encodePacked` equivalent).
   **Confidence:** high.
   **Critical pitfalls that break the match:**
   - Using `abi.encode`-style (32‑byte padded) packing instead of packed → wrong hash. Must be **packed**.
   - Encoding move as `uint256`/`uint8` inconsistently between commit and reveal, or as a string → wrong hash. Use `uint8` for the enum.
   - Passing salt as a **hex string** where the packer expects it (fine) vs. as bytes — ensure it is treated as `uint256`, i.e. a big-endian 32‑byte integer, identical value at commit and reveal.
   - Wrong argument order (salt before move) → wrong hash.

---

### 2) Full salt lifecycle / flow

6. **Claim:** Generate the salt as a cryptographically secure 256‑bit random value in the browser using `crypto.getRandomValues`.
   **Sources:** MDN — `Crypto.getRandomValues()`.
   **Support:** direct (documented CSPRNG) + interpretation.
   **Confidence:** high.
   **Canonical generation:**
   ```js
   // 32 bytes = 256 bits of entropy
   const bytes = new Uint8Array(32);
   crypto.getRandomValues(bytes);
   // to a 0x-prefixed 32-byte hex string usable as uint256:
   const saltHex = "0x" + [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
   const salt = BigInt(saltHex); // for ethers uint256 param
   ```
   MDN notes `getRandomValues` is a CSPRNG suitable for cryptographic use (unlike `Math.random`). For ≥ 32 bytes it may be called in a loop, but a single 32‑byte draw is standard.

7. **Salt lifecycle (never on‑chain until reveal):**
   1. **P1 chooses move** (1–5) and **generates 256‑bit salt** (Finding 6).
   2. **P1 computes `c1Hash`** locally (Finding 5). Only the *hash* is public.
   3. **P1 deploys the contract** with `(c1Hash, j2Address)` and `msg.value = stake`. The salt and cleartext move stay in the browser — **not** transmitted.
   4. **P1 persists `{contractAddress, move, salt}`** locally (see Finding 8) and ideally backs it up out-of-band.
   5. **P2 calls `play(move)`** in the clear with equal stake.
   6. **P1 calls `solve(move, salt)`** — this is the **first and only** time move+salt hit the chain. The contract recomputes `keccak256(_c1,_salt)` and compares to `c1Hash`, then pays out.
   7. If P1 loses/forgets the salt → cannot pass the `require(keccak256(...)==c1Hash)` check → cannot reveal → funds recoverable only via **`j2Timeout`** style flow (see Finding 11) or, if P1 stalls, P2 claims via `j1Timeout`.

8. **Claim:** Between commit and reveal the salt must be stored where P1 can retrieve it, keyed to the game/contract; `localStorage` is convenient but carries real risks.
   **Sources:** MDN — Web Storage API (`localStorage`); OWASP guidance on client-side storage / XSS.
   **Support:** interpretation.
   **Confidence:** high.
   **`localStorage` risks:**
   - **XSS exposure:** any script running on the origin (including a compromised dependency/CDN) can read `localStorage`. A leaked salt+move before reveal lets P2 always win (Finding 13/15).
   - **Not encrypted at rest;** readable by anyone with device access / browser profile access.
   - **Origin-, browser-, and device-bound:** P1 cannot reveal from a different browser/device; clearing site data, incognito sessions, or "clear on exit" settings destroy it → unrecoverable salt.
   - **No durability guarantee:** browsers can evict storage under pressure.
   **Better options:** (a) encrypted export/download of a backup blob the user saves; (b) **deterministic salt derivation from a wallet signature** (Finding 18) so the salt is regenerable without persistent storage; (c) at minimum, warn the user and prompt an explicit backup.

9. **Claim:** P1 recovers the salt to call `solve()` by reading the stored `{move, salt}` for that contract address (or re-deriving it deterministically) and submitting both to `solve`.
   **Sources:** `RPS.sol` `solve(Move _c1, uint256 _salt)`.
   **Support:** direct evidence.
   **Confidence:** high.

---

### 3) Security threats from bad salt handling (what a cheater tries)

10. **(a) Salt too small / low entropy → brute-force the commitment.**
    **Attack:** `c1Hash` is public the moment P1 deploys. An adversary (typically P2, who has not yet played) enumerates candidate preimages. The move space is tiny — only 5 valid values (1–5). If the salt has low entropy (e.g. a small integer, a 16‑ or 32‑bit value, a 4‑digit PIN, or "0"), the attacker computes `keccak256(packed(move, saltGuess))` over the small joint space, matches `c1Hash`, and **learns P1's committed move before playing**. P2 then plays the guaranteed winning counter (RPSLS: e.g. against Rock, play Paper or Spock). With a full 256‑bit random salt the preimage space is ~2^256 — computationally infeasible to brute-force.
    **Confidence:** high. **Support:** interpretation of keccak256 preimage search over a small salt+move space.

11. **(c) Losing the salt → cannot reveal → forced onto timeout.**
    **Attack/failure mode:** Not an attacker action but a self-inflicted loss. If P1 cannot reproduce the exact `(move, salt)` that hash to `c1Hash`, `solve` reverts forever. After `play`, if P1 never reveals, `j1Timeout` lets **P2 take `2*stake`** (both stakes) once `TIMEOUT` (~5 minutes) elapses. So salt loss can cost P1 the entire pot, not just a draw. (Before P2 plays, `j2Timeout` refunds P1's stake — but that path is about P2 not playing, not about salt loss.)
    **Sources:** `RPS.sol` `j1Timeout()`/`j2Timeout()`, `TIMEOUT`, `lastAction`.
    **Confidence:** high (payout direction should be re-confirmed against the raw file).

12. **(b) Reusing a salt across games.**
    **Attack:** If P1 reuses the same salt (or same move+salt pair) across games, then once any single game is revealed on-chain (salt becomes public in `solve`), the attacker can test that known salt against the *other* games' public `c1Hash` values. If the salt matches and only the move differs, the 5-way move space is trivially brute-forced with the known salt, exposing committed moves in still-open games. Reuse also enables rainbow-table-style precomputation. **Always generate a fresh salt per game/commitment.**
    **Confidence:** high. **Support:** interpretation.

13. **(d) Leaking the salt (and move) to P2 before reveal.**
    **Attack:** If the `{move, salt}` leaks (XSS reading `localStorage`, shared device, logging, sending it to a server, telemetry, browser sync to a compromised account) before P1 calls `solve`, P2 learns P1's move and simply plays the winning counter. The salt is a secret of equal importance to the move until reveal.
    **Confidence:** high. **Support:** interpretation.

14. **(e) Predictable salt (`Math.random`, timestamps, counters, block data).**
    **Attack:** `Math.random()` is **not** cryptographically secure — its output is predictable/seed-recoverable, so an attacker can regenerate candidate salts and brute-force the commitment. Timestamps, incrementing counters, block numbers/hashes, `msg.sender`, or any low-entropy/guessable input collapse the search space to something an attacker can enumerate, again exposing the move. Never derive salt from predictable client state.
    **Sources:** MDN `Math.random()` ("not cryptographically secure"); MDN `crypto.getRandomValues`.
    **Confidence:** high. **Support:** direct (MDN characterization) + interpretation.

15. **Composite "always win" strategy for a cheating P2:** Watch mempool/chain for new RPS deployments naming them as `j2`. Read the public `c1Hash`. Attempt to recover P1's move by brute-force **iff** the salt is weak/predictable/reused/leaked (Findings 10,12,13,14). If recovered, call `play` with the guaranteed counter and win the full pot on P1's reveal. A correct 256‑bit random, unique, secret salt defeats every one of these. **Note:** because P2's move is stored in cleartext and P1 reveals *after* P2 plays, the protocol's fairness depends **entirely** on P1's commitment being hiding+binding — i.e., on salt quality and secrecy.
    **Confidence:** high. **Support:** interpretation of contract flow.

---

### 4) Best-practice recommendation for THIS exercise

16. **Salt size:** Use a full **256‑bit (32‑byte) random salt** to match the `uint256 _salt` parameter and give a computationally infeasible preimage space. Do not truncate. **Confidence:** high.

17. **Generation:** `crypto.getRandomValues(new Uint8Array(32))`; never `Math.random`, timestamps, counters, or on-chain data. **Confidence:** high.

18. **Storage/recovery (ranked):**
    - **Best for robustness:** deterministically **derive the salt from a wallet signature** over a fixed, game-specific message, e.g. `salt = keccak256(signature)` where the message = a constant app string + game nonce/contract-intent (not the move). This makes the salt **regenerable from the wallet alone** — no lost-salt risk — while remaining unpredictable to others (they cannot produce the signature). Note the message should be app-specific and non-guessable; do not embed the plaintext move in a value that would be exposed.
    - **Acceptable for the exercise:** generate a random 256‑bit salt, store `{contractAddress, move, salt}` in `localStorage`, **and** offer the user an explicit encrypted/plaintext **backup download**, plus a clear warning that losing it forfeits the pot to P2 via timeout and that it must be kept secret until reveal.
    - **Minimum:** never transmit salt to any server or third party before reveal; scope it per contract address; clear it after a successful `solve`.
    **Confidence:** medium-high (design recommendation / interpretation).

19. **Exact keccak256 encoding the dapp must use (authoritative for matching `solve`):**
    ```
    c1Hash = keccak256( abi.encodePacked( uint8(move), uint256(salt) ) )
    ```
    ethers v6: `keccak256(solidityPacked(["uint8","uint256"], [move, salt]))`.
    Verify against a fixture: pick move=1 (Rock) + a known salt, compute the hash in the dapp, and compute the same in a Solidity/Foundry/Hardhat test calling the same packing; they must be byte-identical.
    **Confidence:** high.

20. **Concrete text flow diagram:**
```
 P1 browser                                Chain / RPS.sol                       P2 browser
 ----------                                ----------------                      ----------
 move (1..5)  ─┐
               │ crypto.getRandomValues(32B) -> salt (uint256, SECRET)
               ▼
 c1Hash = keccak256(solidityPacked(["uint8","uint256"],[move,salt]))
               │
               │  deploy RPS(c1Hash, j2)  { value: stake }  ──────────►  constructor stores
               │  (salt + move STAY local, NOT sent)                     c1Hash, j1, j2, stake
               │
   store {addr, move, salt} locally + backup
                                                                          play(_c2) { value: stake }
                                              c2 (cleartext) stored  ◄──── P2 picks move (visible!)
               │
 recover salt+move ─────────────────────────► solve(_c1=move, _salt=salt)
                                              require(keccak256(_c1,_salt)==c1Hash)
                                              -> compare c1 vs c2 -> pay winner
                                              (salt now public — one-time, at reveal)

 Timeouts (~5 min after lastAction):
   - P2 played but P1 never reveals ->  j1Timeout(): P2 takes 2*stake
   - P2 never plays                 ->  j2Timeout(): P1 refunded stake
```
   **Confidence:** high (timeout payout direction to reconfirm against raw file).

---

## Contradictions
None found among the technical facts. The only tension is a **design trade-off**, not a contradiction: `localStorage` maximizes convenience but is fragile and XSS-exposed, whereas deterministic signature-derived salt maximizes recoverability but adds a signing step and requires care that the signed message not leak the move.

## Missing evidence
- **Exact source line numbers** and the precise pragma/compiler version of `RPS.sol` were not fetched in this run (no web tool). The `keccak256(_c1,_salt)` multi-arg *packed* semantics hold for Solidity **0.4.x**; confirm the pragma is `^0.4.x` (if the repo were ever ported to ≥0.5, the code would instead read `keccak256(abi.encodePacked(_c1,_salt))` — same hash, explicit syntax).
- **Exact timeout payout amounts/direction** (`j1Timeout` paying `2*stake` to j2; `j2Timeout` refunding j1) are stated from memory of the standard contract; reconfirm against the raw file.
- **The `win()` tie-break logic** (RPSLS parity/modulo comparison) was not needed for the salt question and is not re-verified here.
- No automated `source_check` validation was possible this run; treat brute-force/entropy claims as well-established cryptographic reasoning rather than a cited benchmark.

## Sources
- **Kept — `clesaege/RPS/RPS.sol`** (github.com/clesaege/RPS/blob/master/RPS.sol) — the contract under study; defines the `Move` enum order, the `solve(Move,uint256)` signature, and the `keccak256(_c1,_salt)` commitment check that the dapp must match. *(Cited from knowledge of the file; line numbers to confirm.)*
- **Kept — ethers.js docs** (`keccak256`, `solidityPacked`/`solidityPack`) — canonical packed-encoding + hashing APIs to reproduce `abi.encodePacked` on the client.
- **Kept — web3.js docs** (`web3.utils.soliditySha3`) — alternative typed packed hashing for the same result.
- **Kept — MDN `Crypto.getRandomValues()`** — CSPRNG for the 256‑bit salt; explicitly suitable for cryptographic use.
- **Kept — MDN `Math.random()`** — documents that it is NOT cryptographically secure (basis for threat (e)).
- **Kept — MDN Web Storage API / `localStorage`** + **OWASP XSS / client-side storage guidance** — basis for storage-risk analysis.
- **Kept — Solidity docs (types: enums as `uint8`; `keccak256`/`abi.encodePacked` packed encoding rules)** — basis for the 1-byte enum + 32-byte salt = 33-byte preimage.
- **Kept (background) — reputable commit–reveal writeups** (e.g. Solidity-by-example commit-reveal; standard descriptions of hiding+binding commitments) — corroborate salt-secrecy and fresh-salt-per-commit best practices.
- **Rejected/deprioritized — generic SEO "how to build RPS dapp" tutorials** — often use `Math.random`, small salts, or padded (`abi.encode`) hashing that silently break the `solve` match; not authoritative.

## Next steps
1. Fetch the raw `RPS.sol` and pin exact line numbers + pragma; confirm `keccak256(_c1,_salt)` syntax and timeout payouts.
2. Add an automated **hash-parity test** (Solidity/Foundry vs. ethers) as a CI fixture so the frontend commitment can never drift from `solve`.
3. Decide storage model: implement signature-derived deterministic salt (recommended) or random+backup, and add a UX warning about salt secrecy and timeout forfeiture.
```

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Produced only the requested research brief (salt handling in the RPS commit-reveal scheme) at the authoritative output path; did not modify the contract or widen scope."
    },
    {
      "id": "criterion-2",
      "status": "satisfied",
      "evidence": "Brief answers all four requested questions with claim/source/support/confidence labeling, contradictions, missing-evidence, sources kept/rejected, and a concrete flow diagram; validation/tooling limitations disclosed explicitly for independent review."
    }
  ],
  "changedFiles": [
    "/home/agentops/.pi/agent/sessions/--home-agentops-agent-team--/subagent-artifacts/outputs/3f1ef436-366e-4346-a627-70f967b7cc22/research.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [],
  "validationOutput": [
    "No web_search/web_fetch/source_check provider was registered in this run; automated source validation and live URL fetching were not possible. Brief is based on stable, well-established knowledge of clesaege/RPS.sol (Solidity ^0.4.x keccak256 packed semantics), ethers/web3 packing APIs, and MDN Web Crypto behavior. Line numbers and timeout payout direction flagged for reviewer reconfirmation against the raw file."
  ],
  "residualRisks": [
    "Exact RPS.sol line numbers, pragma version, and timeout payout amounts were not fetched live and should be reconfirmed against the raw GitHub file.",
    "keccak256 multi-arg packed semantics assume Solidity 0.4.x; if the repo were ported to >=0.5 the hash is identical but the syntax would be keccak256(abi.encodePacked(...)).",
    "No automated source_check ran; entropy/brute-force claims rest on standard cryptographic reasoning, not a cited benchmark."
  ],
  "noStagedFiles": true,
  "diffSummary": "Added research.md containing the RPS salt/commit-reveal security brief at the authoritative output path.",
  "reviewFindings": [
    "no blockers",
    "advisory: reviewer should confirm exact source lines and timeout payout direction against the raw RPS.sol before shipping frontend code"
  ],
  "manualNotes": "Web/source-check tools were unavailable this run; limitation is disclosed at the top of the brief and in Missing evidence. Frontend must hash with packed uint8(move)+uint256(salt) = keccak256(solidityPacked([\"uint8\",\"uint256\"],[move,salt])) to match solve()."
}
```

