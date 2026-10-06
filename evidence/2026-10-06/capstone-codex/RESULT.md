# Day 5 capstone: other-provider fresh evaluator (Codex on project-B)

Course reference, PDF p.17 ("Capstone and evidence"): "Include clarification, implementation, executed checks, a fresh
evaluator session and human inspection in the capstone. Under the default policy, use the other provider ... Give the
fresh reviewer the task, diff and acceptance criteria, and require its own checks. As an optional experiment, withhold
the implementer's rationale until its first pass, then share necessary design context. ... Inspect evaluation contamination."

Scratch root: `/tmp/claude-1000/-home-agentops-dev/ade0e1ee-cfaf-469b-985e-ae9aaff165a8/scratchpad/gaps/capstone-codex` (below: `$S`)

## 1. Run picked

| | |
|---|---|
| Feature / run | `ledger-economy` / `ledger-economy-001` (state: `~/.local/state/agent-workflows/project-B-econ/ledger-economy/ledger-economy-001`) |
| Why | approved; pure-logic change of moderate size; 6 recorded Claude findings; decisions.md plus a 7-item acceptance list; a follow-up feature (`ledger-economy-fixes`) shows what the operator did with the findings |
| Base | `4c8e75dbc473772ac05b39b0243cf905182cab47` ("Add the ledger-economy feature") |
| Integrated candidate | `abec252ed436527c2a228541f82289a5ce8ea1da` (tip of `feature/ledger-economy/ledger-economy-001`), merged to main as `f31fa51` (parents `f12feaf`, `abec252`) |
| Diff | 11 files, +744 / -18 (762 changed lines); the 1107-line patch is byte-identical to the Claude reviewers' `review.diff` (`cmp` passed) |
| Claude review | `review.json` verdict `approved`; reviewers `general` (session 8740894a) and `coverage` (session 7846d5c6), both `claude-opus-5-5` per transcripts; 6 findings, all P2 |

Other candidates scanned (approved, 200-1500 changed lines): docking-feel-001 (415), ledger-economy-fixes-001 (584), final-island-001 (710), skeleton-fixes-001 (780), duel-core-fixes-001 (896), fruit-pedestals-001 (1026), claim-channel-001 (1181).

## 2. Clone and packet (contamination controls)

```
git clone --local --single-branch --branch feature/ledger-economy/ledger-economy-001 --no-tags /home/agentops/dev/project-B $S/project-B-clone
git remote remove origin; git checkout --detach abec252
git reflog expire --expire=now --all; git gc --prune=now      # only abec252 and its ancestors remain
npm ci --prefer-offline                                       # 36.5 s, exit 0, 239 packages ($S/npm-ci.log)
```
- `git log --all` in the clone shows `abec252` as the newest commit. The `ledger-economy-fixes` feature (147b8e5), whose task restates the Claude findings, cannot be reached.
- Packet `$S/packet/`: `task.md` (ledger-task.md at base: goal, constraints, settled design, Acceptance 1-7), `decisions.md`, `feature.json` (name/prd/workers only), `diff.patch`, `diffstat.txt`, `README.md`.
- Left out on purpose: `review.json`, `review-*.completion.json`, `ledger.completion.json`, `ledger.handoff.json` (the worker's rationale).
- pi flags: `--no-context-files` (CLAUDE.md not auto-loaded), `--no-skills --no-extensions --no-session --offline`.

## 3. Codex pass 1 (fresh, rationale withheld)

```
cd $S/project-B-clone && DISABLE_AUTOUPDATER=1 timeout --kill-after=30 1500 pi -p --offline --no-session --no-skills \
  --no-extensions --no-context-files --model openai-codex/gpt-6-astra --thinking high --tools read,bash --mode json \
  "$(cat $S/codex-prompt.txt)" > $S/codex-output/codex.jsonl
```
- Wall time: 08:07:27Z to 08:17:16Z = **589 s**, exit 0, empty stderr.
- Usage (summed over 13 assistant messages): input 81,316, cacheRead 512,768, output 9,720 (pi also reports reasoning 2,405 as a separate field; input + cacheRead + output sum to the total), total 603,804 tokens. pi's notional list-price cost was **$1.8119**. Actual billing goes to the Codex subscription; no API key was used.
- 31 tool calls: 26 read, 5 bash.
- Output: `$S/codex-output/codex-review.json` (valid JSON). The full event stream is in `codex.jsonl`, and probes and logs are in `$S/codex-tmp/`.

Checks Codex ran itself (`$S/codex-tmp/checks.json`):

| command | exit | s | result |
|---|---|---|---|
| npm run typecheck | 0 | 8.27 | pass |
| npm run test:unit | 0 | 31.26 | 644 tests / 28 files pass |
| npm run test:integration | 0 | 137.5 | 36 tests / 6 files pass |
| npm run build | 0 | 14.52 | pass |
| probe key-collision | 1 | 0.47 | confirms X2 |
| probe gold-overflow | 1 | 0.45 | confirms X1 |
| probe tonic-overflow | 1 | 0.38 | confirms X1 |
| probe ordinary-adversarial | 0 | 0.35 | cross-player id reuse, `__proto__` keys and replay after use/quit all behave as specified |

I re-ran all 4 probes myself and got the same exit codes and outputs.

Verdict **request-changes**. Acceptance mapping: 2, 4, 5, 6 and 7 met. **1 (Grants) and 3 (Tonics) unmet**, solely because of X1/X2. The named scripted tests exist and pass (ledger.test.ts:582, :599, :611, :722, :739, :750, :767).

Codex findings:
- **X1 P2** `packages/simulation/src/objectives/economy.ts:80` (and `:196`). Additions are unchecked. With `addPlayer(gold=Number.MAX_SAFE_INTEGER)`, which passes `checkLedger`, a 40-gold ruin grant returns ok and gives gold 9007199254741032 (+41 after rounding). `useTonic` at tick MAX_SAFE_INTEGER stores an unsafe `endTick` 241 ticks later. Failing check: `node $S/codex-tmp/economy-probes.mjs gold-overflow|tonic-overflow`.
- **X2 P2** `packages/simulation/src/objectives/invariant.ts:203`. The grant uniqueness key is the unescaped string `ruin ${sourceKey} for ${playerId}`. Grants (`a`, player `b for c`) and (`a for b`, player `c`) are both accepted, then `checkLedger` reports "ruin a for b for c was granted twice". Failing check: `node $S/codex-tmp/economy-probes.mjs key-collision`.

## 4. Optional experiment: share the implementer's rationale after pass 1

This was a second fresh `--no-session` call (`$S/codex-prompt-pass2.txt`, 600 s bound). It received the pass-1 JSON and the worker's `summary`, `open_assumptions`, `untested` and `verify_yourself` (`$S/packet-pass2/implementer-rationale.json`).
- Wall time 08:18:51Z to 08:21:54Z = **183 s**, exit 0. Tokens: input 38,431, cacheRead 148,992, output 4,403, total 191,826. Notional cost **$0.7535**. 23 tool calls.
- Result (`$S/codex-output/codex-review-pass2.json`): X1 and X2 **kept** at P2 and re-confirmed by re-running the probes. **No new findings and no criterion changes.** Codex checked each open assumption with a new probe (`pass2-assumptions.mjs`, exit 0) and judged them consistent with the task.
- No anchoring shift was seen. Two limits: n=1, and pass 2 is the same model reading its own pass-1 output.

## 5. Comparison with the Claude reviewers (same run, same diff)

Claude findings (from `review.json`) against Codex pass 1:

| Claude finding (all P2) | Codex | Class |
|---|---|---|
| L1 requestId is one namespace for the whole match: one player's id can refuse or reveal another's purchase (economy.ts:119) | Exercised cross-player reuse in its probe, got `duplicate`, and judged it correct per "A requestId is unique per match" | **Claude-only** (Codex saw the behaviour and judged it by design) |
| L2 only successful purchases are recorded: a refused request id can succeed on retry | Explicitly considered: "rejected attempts remain unchanged-state rejections, consistent with the task's purity constraint" | **Claude-only** (explicit disagreement) |
| L3 checkLedger never reconciles goldIssued against purses + grants; addPlayer accepts a caller-chosen purse | X1 uses that same caller-chosen purse, but reports overflow, not the missing reconciliation | **Related, not shared** |
| L4 grantGold accepts any sourceKey: farming via fresh keys if a caller forwards them | Treated world eligibility as "caller-owned/deferred as agreed" | **Claude-only** |
| L5 property.test.ts:125-137 "at most one tonic active" check is vacuous | Cited property.test.ts:125 as *evidence* for criterion 4 | **Claude-only** (Codex accepted the vacuous check) |
| L6 duel refusals tested only in `fighting`, not the `choosing` window | Cited ledger.test.ts:645 as covering duel reservation | **Claude-only** |
| (none) | X1 integer overflow on grant / tonic endTick | **Codex-only** |
| (none) | X2 ambiguous grant-key encoding gives a false "granted twice" | **Codex-only** |

Counts: shared 0, Claude-only 6 (one of them, L3, related to X1), Codex-only 2.

What happened next: all 6 Claude findings became acceptance items 1-5 of `ledger-economy-fixes` (commit 147b8e5, merged 0fd0f2f). On current `main`, checked read-only with `git show`, without running anything:
- The X1 grant route is closed, because `addPlayer` now always uses `rules.startingGold` (players.ts:73).
- The tonic `endTick` addition is still unchecked (economy.ts:239).
- The X2 key pattern is unchanged at invariant.ts:215. Fix 4 (`unknown-source`) bounds it for grants. The same unescaped pattern is new at invariant.ts:231: `request ${requestId} of ${playerId}`, where requestId comes from the client.

Process difference: the Claude reviewers ran **0 Bash calls** (their prompt said "No edits or command execution") and relied on the workflow verifier's packet. Codex ran all 4 required checks plus its own probes.
- Claude general: 2 min 21 s (22:17:38Z to 22:19:59Z), 13 API messages, 20 tool uses, output 12,394 tokens, cacheRead 727,001, cacheWrite 88,248.
- Claude coverage: 1 min 26 s, 6 API messages, 11 tool uses, output 8,153, cacheRead 254,777, cacheWrite 72,956.

Assessment: the Claude pair found more consequential, design-level gaps, and the operator acted on all of them. Codex added two real, probe-confirmed boundary defects that the Claude pair missed. Both are low practical impact: they need a purse near 2^53, a tick near 2^53, or player ids containing " for ". On severity, I would rate them P3. Codex's "unmet" for criteria 1 and 3 is a strict reading: the named tests exist and pass. Codex missed both test-adequacy gaps even though the prompt asked about tests that would pass if the behaviour broke.

## 6. Contamination inspection

- Every Codex tool argument in both passes was scanned for `agent-workflows|ai-logs|/home/agentops|.local/|.claude|.pi/|pkill|killall|git log --all|playwright`. Pass 1: 0 hits. The only other matches, `npm ci` and `review.json`, came from text inside Codex's own output heredoc. Pass 2: 0 hits. Its `ls /` and `find features` stayed outside run state.
- Every read was in the packet, the clone or `$S/codex-tmp`. The clone has no reachable post-abec252 history.
- `~/.pi` side effects: no file under `~/.pi` has an mtime after 08:00Z. `auth.json` and `models-store.json` were last modified at 07:35:01Z, before any pi run in this session. The `~/.pi/agent` directory itself shows mtime 08:18:52Z, one second after pass 2 started. That means an entry was created and then removed, probably a transient lock from pi startup. No file persisted. Another pi process on the machine could also explain it.
- Residual risk: the diff includes `docs/objectives.md` and code comments written by the implementer. That is the deliverable, not withheld rationale, but it carries the implementer's framing.
- Clone `git status --porcelain` was clean after both passes.

## 7. Human inspection: read these first

1. `packages/simulation/src/objectives/economy.ts:112-131` (`purchase`): replay lookup by requestId alone, before tick and player checks, recording successes only. The reviewers split here (Claude L1/L2 against Codex's "by design"), so this is the human's call on semantics.
2. `packages/simulation/src/objectives/economy.ts:64-85` (`grantGold`) together with `invariant.ts:199-228` (`economyProblems`) and `players.ts:66-88` (`addPlayer` purse): this is where "no minting outside the rules" lives. Claude L3/L4 and Codex X1/X2 all land here.
3. `packages/simulation/src/objectives/property.test.ts:125-137` (`economyCheck`) and `ledger.test.ts:645` / `:750` (duel refusals): does the test evidence prove what acceptance 3 and 4 claim? Claude coverage called the tonic check vacuous; Codex accepted it.

## Files
- `$S/packet/*` packet; `$S/codex-prompt.txt`, `$S/codex-prompt-pass2.txt` prompts
- `$S/codex-output/codex.jsonl`, `codex-review.json`, `timing.txt`, `tool-calls.txt` (pass 1)
- `$S/codex-output/codex-pass2.jsonl`, `codex-review-pass2.json`, `timing-pass2.txt` (pass 2)
- `$S/codex-tmp/` Codex probes and check logs; `$S/claude-baseline/claude-findings.txt`; `$S/npm-ci.log`
- The clone `$S/project-B-clone` (with 417 MB of node_modules) can be deleted.
