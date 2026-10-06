# Evidence analyses: Day 4 forced branch failure, Day 1 handoff, R32 for Pine

Date of analysis: 2026-10-05. Read-only: no repository, state dir, session, timer or service was modified.
Scratch copies made: `pw001-pipeline.sqlite` (copy of the run's LangGraph checkpoint DB, queried read-only) and the
helper scripts `pi_sum.py`, `pi_tools.py`, `cc_sum.py`, `cc_tools.py`, `bcast.py` (transcript summarisers).

Cost of this analysis: no `claude` or `pi` CLI was launched; no model calls other than this session. The run directory
of project-workflows-001 does not record token/usage cost, so no run cost is reported.

---

## 1. Day 4 · Forced branch failure and replay (PDF p.14, p.18 fig. 2, R19 p.27)

PDF p.14: "Force one branch failure and record which workers actually rerun. Claude workflow relaunch replays agent start
order: a failed agent and all agents started after it run again, including completed siblings. Selective reuse requires
explicit artifact tracking or separately managed stages. Inspect worker and retry bounds".
PDF p.18: "use at most two concurrent workers, one retry per failed branch and a 90-minute execution deadline".
R19 p.27: "LangGraph can preserve successful nodes in a failed superstep with checkpointing. Claude may rerun later
completed workers."

Sources: `/home/agentops/dev/ai-logs/runs/md-manager-workflows/project-workflows/project-workflows-001/` (byte-identical
to `~/.local/state/md-manager-workflows/project-workflows/project-workflows-001/` for events.jsonl, failure-drill.json,
attempts.json, failure-report.json, run-state.json, policy.json, review.json), controller code at commit ea44c51
(`workflow/automatic.py`, `workflow/pipeline.py`), driving Claude session
`~/.claude/projects/-home-agentops-dev-md-manager/51a90443-d885-436e-98ca-f9604a2e21b3.jsonl`, recovery log
`/tmp/claude-1000/-home-agentops-dev-md-manager/51a90443-d885-436e-98ca-f9604a2e21b3/scratchpad/recovery.log`.

Commands: `cat events.jsonl failure-drill.json attempts.json failure-report.json policy.json`; python over run-state.json;
`git show ea44c51:workflow/{automatic,pipeline}.py`; `git show 924f43f ea44c51`; sqlite+ormsgpack decode of the copied
pipeline.sqlite (checkpoints + writes tables); transcript extraction for 14:55-16:00 UTC.

Graph: launch_ui, launch_adapter -> handoff (freeze) -> verify_ui || verify_adapter -> candidate -> review -> approval ->
integrate. Policy 1.1.0: `failure_drill {node_id: adapter, phase: worker, attempt: 1}`, `max_verification_attempts 3`.
The drill (pipeline.py `verify()`) runs the real checks, then appends the marker "Intentional lab drill: verification
branch failure, not a worker or test failure" and forces gate status `blocked`.

Timeline (UTC, 21 Sep 2026; seq = events.jsonl sequence):

| Time | Seq | What happened |
|---|---|---|
| 14:33:24.82 / .82 | 1-2 | adapter then ui native Claude worker sessions launched (adapter 2.5 ms earlier) |
| 14:59:39.71 | 6-7 | both workers stopped, immutable snapshots: adapter 94755e9, ui b72eacc (worker phase 26 m 15 s) |
| 14:59:39-15:01:25 | 8-21 | verify attempts 1-3 on both lanes all blocked by a real environment bug (tsx IPC socket path > 107 bytes under the lane TMPDIR); drill marker also appended on adapter attempt 1 (seq 10) and `failure-drill.json` written (`injected_at` 15:00:12.18) |
| 15:30:35 / 15:34:30 | - | controller fixes committed: 924f43f (short TMPDIR; refuse retry when gate reasons identical) |
| 15:30:36 | - | operator (Claude Fable 5.1 on the user's behalf) moved `verification/` to `verification-attempts-1-3-tmpdir-bug/` and deleted `attempts.json` (counter reset) |
| 15:30:54 | 23-25 | `workflow retry`: both lanes attempt 1 aborted at `git worktree add` (stale registrations); automatic controller PID 730819 refused "Non-retryable graph failure" |
| 15:31:40.064 / .067 | 26-27 | `workflow retry` again: verify_adapter then verify_ui (3 ms apart, same superstep), attempt 1 each |
| 15:32:24.51 | 28 | verify_adapter BLOCKED by the drill only; its real checks all exited 0 (packet worker/adapter/1) |
| 15:32:39.40 | 29 | verify_ui PASSED (packet worker/ui/1) |
| 15:32:39-42 | 30 | `automatic --live` (PID 731894) refused "Non-retryable graph failure": stale `verify_ui` `__error__` (the 15:30:54 CalledProcessError) still on the step-2 checkpoint |
| 15:34:30 | - | fix ea44c51: classify only pending tasks (`task.name in state.next`) |
| 15:34:37.09 | 31-32 | manual relaunch, controller PID 733173 bumps attempts.json to `{"worker:adapter": 2}`; ONLY verify_adapter re-executes (attempt 2, same revision 94755e9) |
| 15:35:11.99 | 33 | verify_adapter PASSED (34.9 s); LangGraph step-3 checkpoint at 15:35:11.998 |
| 15:36:02 / 15:36:39 | 34-35 | combined candidate b5385b3 passed both lane check sets |
| 15:42:27.85 | 36 | independent review approved (6 P2 findings, none blocking) |
| 15:42:28.06 | 37 | fast-forward to b5385b3, no push |
| 15:52:04 | 38 | operator's `automatic --live` (PID 735915) confirms the verified branch (no-op) |
| 15:57:03 | - | merged to main as f95ac1c; GitHub issues #3-#8 filed for the six P2 findings |

Checkpoint evidence (pipeline.sqlite, step-2 checkpoint `1f1b5cd1-1ee9-6f32-8002-04e0bda8ab60`, ts 14:59:39.897):
task 205e5135 (verify_ui): `__error__` CalledProcessError(128, git worktree add ...) at idx -1 AND successful write
`ui_packet = verification/worker/ui/1/packet.json` at idx 0; task 9bcc52b6 (verify_adapter): `__error__` "adapter
verification blocked" and later `adapter_packet = verification/worker/adapter/2/packet.json`. The 15:33:24 state dump
in the transcript shows `next: ('verify_adapter',)`, values already containing `ui_packet`.

Which workers reran:
- Native AI worker sessions: none. `failure-report.json`: launcher_invocations 1 -> 1 for both (adapter 47f79a44,
  ui 68269267), `workers_with_changed_launch_evidence: []`. The controller never relaunches workers ("no automatic
  relaunch"; retry refuses launch steps).
- Verification lanes after the drill: only verify_adapter (attempt 2). verify_ui was reused from the LangGraph pending
  write; no `verify_ui running` event after seq 27.
- Under Claude's native start-order relaunch (p.14), verify_ui (started 3 ms after the failed verify_adapter) would have
  rerun. Here it was reused: the R19 LangGraph behaviour, not start-order replay.
- Candidate checks (seq 34-35) ran once on new inputs (b5385b3); that is a new stage, not a replay.

What triggered the retry: the drill raised in verify_adapter; LangGraph recorded the task error. The automatic
retry classifier (`advance_failed_checks`) should have bumped the adapter counter, but on first contact it refused
because of the stale sibling error. The retry happened only after a code fix (ea44c51) and a manual relaunch. Replay
semantics worked; automatic triggering did not, first time.

Bounds:
- `max_verification_attempts: 3` enforced in `attempt()` / `retry_check()` (ValueError beyond 3) and checked in
  `advance_failed_checks` before changing counters. It is per-run-directory state: the operator reset it by moving
  `verification/` and deleting `attempts.json`. Real starts: verify_adapter 6 (seq 8,13,18,23,26,32; 5 ran checks),
  verify_ui 5 (seq 9,14,19,24,27). `failure-report.json` reports adapter [1,2], ui [1] only because the earlier
  attempts were archived; it understates.
- 924f43f added the refusal of a retry whose gate reasons equal the previous attempt's.
- Worker deadline 3600 s per worker (CLI `--worker-timeout-seconds 3600`; code default 4 h), review deadline 1800 s,
  supervisor restart limit 45 processes, LangGraph `max_concurrency: 2`, per-check process timeouts (120-600 s).
- p.18 comparison: 2 concurrent workers (met). One retry per failed branch: policy allows 2, the drill branch used 1.
  90-minute execution deadline: no run-wide deadline exists; launch -> integrate took 69 m 03 s (unenforced).

Final verdict: run succeeded. Verified feature branch at b5385b3 (review approved, 6 P2), merged to main f95ac1c.

---

## 2. Day 1 · Handoff between subscription sessions (PDF p.8)

PDF p.8: "During harness setup, practise a handoff: stop the first writer, save the relevant commit or diff and a short
status note, then open the other subscribed agent with the brief and acceptance evidence. Keep one active owner for each
editable worktree. Each agent retains its own subscription login and quota."

Commands: `find docs -name 'HANDOFF*' -o -name 'PROGRESS*'`; `git log` with trailers 18-22 Sep; summaries of
`~/.pi/agent/sessions/--home-agentops-dev-md-manager*/2026-09-1[89]*,2026-09-2[01]*` and
`~/.claude/projects/-home-agentops-dev-md-manager*/*.jsonl`; tool-call extraction around each switch.

Pattern on 19-21 Sep: Pi (provider openai-codex, model gpt-6-astra) wrote PRDs and reviews; Claude Code
(claude-fable-5-1) implemented. Four switches happened in /home/agentops/dev/md-manager.

Best instance (all four elements) - Pi -> Claude Code, 20 Sep:
- First writer: Pi session `01a0bb74-23a8-7156-8fb8-1e30eb54507a` (`~/.pi/agent/sessions/--home-agentops-dev-md-manager--/2026-09-19T20-55-45-832Z_...jsonl`).
  It had applied the Slice 2 review fixes. At 06:04:41Z it committed and pushed 03a6fb8 "Implement Slice 2 secure
  Markdown preview and navigation" (no Claude trailer). At 06:04:52Z it reported "Working tree is clean". Its last
  action, at 06:07:08-06:07:41Z, stopped the dev servers (processes only, no file edits).
- Status note: `docs/HANDOFF_SLICE2.md` (121 lines, in 03a6fb8) with "Accepted review corrections (observed
  2026-09-19)" and final gates. `docs/PRD_SLICE3.md` status line edited by Pi: "Ready for implementation. Slice 2's
  final independent review and quality gates passed on 2026-09-19; see docs/HANDOFF_SLICE2.md".
- Second agent: Claude Code session `3e51e41c-c0ef-49e9-b8bc-9d1d5379a34f`, opened 06:06:14Z (93 s after the commit)
  with the 25,055-char PRD_SLICE3 pasted as the brief. It read HANDOFF_SLICE2.md at 06:06:27Z. At 06:08:11Z it said
  "Baseline: 48 unit tests pass and the tree is clean" (acceptance evidence re-run), then did Slice 3 test-first.
- Deviation: the Pi session was not closed. It was idle after the commit, and it stopped servers while Claude was
  reading. Same worktree throughout, not separate worktrees.

Second instance, Claude -> Pi, 19 Sep (has deviations):
- Claude `fcfd1807` implemented PRD_SLICE2 (21:00:49Z ->), wrote `docs/HANDOFF_SLICE2.md` (Write at 21:32:16Z), left
  an uncommitted diff, last turn 21:38:43Z. Pi was asked "The changes for PRD_SLICE2 are done review them" at 21:36:34Z.
  It ran a read-only review and read HANDOFF_SLICE2.md at 21:38:02Z. Its first write followed "Make these fixes" at
  21:41:27Z.
- Deviations: no commit (diff only), about 2 min of overlap (read-only), and Claude's dev server on 5173 blocked Pi's
  browser validation.

Third instance, Claude -> Pi, 20 Sep: commit a5e1a5d + PR #1 + `docs/HANDOFF_SLICE3.md` at 07:16:37Z. Pi `01a0bdc7`
reviewed the PR from 07:46:36Z and found 3 blockers. Claude's last write was a stash of the user's manual fixture edits
(stash 4a843a1) at 07:55:07Z. Pi's first write (delegated fix worker) was at 07:58:13Z. Pi committed 146493b at
15:50:48Z and merged the PR (b6a7ba8). Pi was briefed only with the PR link; the PR body carried the gate results, and
Pi did not open HANDOFF_SLICE3.md during the review.

Same-provider variant (does not meet the cross-subscription requirement): Claude `81f9ad5a` was interrupted, then
committed dceb4a7 with `docs/PROGRESS_LIVE_SKILLS.md` ("Committed mid-slice so it can be resumed") at 18:20:48Z. After
`/clear`, Claude `f1e52842` started at 18:24:24Z with "Continue @docs/PROGRESS_LIVE_SKILLS.md" and finished in 4b4c4f6.

No quota-driven switch is evidenced: every switch was a role change (implement vs review/PRD).

---

## 3. Day 2 · Development mode by risk (R32) for Pine (PDF p.31, p.20)

PDF p.31: "Classify the change or component, rather than treating the whole project as one category." Critical/Hard
cell: "Write by hand and audit with AI. You write the implementation. AI hunts for bugs and exploits." "For Web3, assess
transaction contents as well as the visible interface." PDF p.20: "For critical logic with hard-to-detect defects, write
the implementation by hand and use AI to hunt for bugs and exploits".

What Pine is: the backend of a GitHub claim-verification market. A customer publishes one bounded, versioned claim
about an exact commit and funds a Seer prediction market on Gnosis Chain (Reality.eth question, Kleros arbitration).
Pine is non-custodial: it never holds keys or funds and never signs. Every on-chain action is a transaction plan the
user's wallet verifies and sends (README.md).

Smart contracts: yes. `contracts/src/ClaimRegistry.sol` (223 lines) and `EvidenceRegistry.sol` (134 lines) are
immutable and ownerless. Neither holds or forwards tokens ("Never holds or forwards tokens or native value"); grep for
payable/transfer/msg.value/call{ in src finds only that comment. Funds move through Seer/CTF/Swapr calls that
`packages/shared/src/tx-plan.ts` (433 lines; approve/split/mint/redeem allowlist) and `packages/api/src/modules/funding`
compose for the user to sign. Collateral is sDAI 0xaf20...3701.

Networks: only Gnosis mainnet, chain id 100.
- `Deploy.s.sol` reverts `WrongChain` when chain id is not 100.
- `deployment.ts` throws "only Gnosis (100) has a verified manifest".
- API config refuses `PINE_CHAIN_ID != 100` (config.test.ts:248).
- 10200 (Chiado) appears only in negative tests. SEC-TX-05 mentions 10200 for staging, but the release checklist
  defines staging as "an anvil fork of Gnosis ... throwaway keys only".
- Fork tests deploy in memory on a forge fork at block 48550000 (`test/e2e/E2EFork.sol`). No testnet configuration
  exists.

Deployed: no, on four local grounds.
1. No `broadcast/` directory in pine, pine-chain, pine-claims, pine-indexers, pine-markets, pine-platform or pine-runs.
2. `deploy/env/api.env` and `indexer.env` hold placeholder addresses 0x0...0 / 0x0...1 with block 0, and
   `packages/api/.env.example` has 0x0...0 x2.
3. No executed `forge script --broadcast`, `cast send` or `--private-key` command appears in the 211 Pine Claude project
   dirs (top-level and subagent jsonl) or the Pi pine sessions. The matches were doc text only.
4. The release-checklist "Done" column is empty and `/etc/pine` does not exist.

On-chain state was NOT checked (no RPC used).

Deployer key: `PINE_DEPLOYER` is read with `vm.envAddress` (an address, not a key), and signing uses `--ledger`
(hardware wallet). The only `PRIVATE_KEY` string is prose in docs/security/requirements.md:715 (§11.3 redaction
critique). The CI secret is `GNOSIS_RPC_URL` only, and SEC-TX-09 forbids keys in the API. No funded deployer key is
referenced; no values were read.

docs/security/requirements.md stance: "Status: research draft, 2026-10-02. Author: security research agent." P0 means
"required before any public deployment or mainnet contract deployment".
- SEC-SC-17 (P0): fuzz/invariant suites, read-only fork tests, slither/aderyn triage, "at least one independent
  external audit; a public bug-bounty scope".
- SEC-SC-19: hardware-wallet deployer with no privileges.
- SEC-TX-01..13: frozen allowlist, deterministic calldata, exact approvals, no permits, chain binding, client-side
  re-verification.
- ADR-0001 launch gates: external audit, human approval of policy text, and an independent client (gate 8). All gates
  are open.

Authorship: 100% AI.
- 58 of 59 commits by "Mani Brar" carry "Co-Authored-By: Claude Opus 5.5". The other 50 commits are "Workflow
  snapshot" agent output.
- Contracts first landed in chain-004 snapshot 03dff00 (workers claude-opus-5-5, 20:18-20:35Z 2 Oct). Main got them
  from chain-005 (7194918, 3169c5a) and hardening-c-001 (98f0190).
- chain-005 review: three AI print reviewers (general, coverage, security) approved, with 3, 1 and 3 findings, all P2.

R32 classification (who implements / what is checked / when reviewed / hidden failure that would flip the cell):

| Component | Cell | Reason | Actual approach | Match |
|---|---|---|---|---|
| contracts/src ClaimRegistry + EvidenceRegistry | Critical x Hard -> write by hand, AI audits | Immutable once deployed, no fix path. Question-injection, timing-window and ERC-677 reentrancy defects are subtle; the project's own SEC-SC-17 requires an external audit, so the team does not trust tests alone. | AI-written (Claude Opus 5.5 workers), AI-reviewed, fuzz/invariant/fork tests, audit pending. Hidden failure: a question-text or deadline bug misresolves every market. | No |
| shared tx-plan.ts + funding plans + question renderer + claim-document canonicalisation (transaction contents) | Critical x Hard -> write by hand, AI audits | Composes the calldata that moves users' sDAI (approve spender/amount, split, LP, redeem). Until the independent client of gate 8 exists, nothing else stands between the API and the wallet prompt. | AI-written (foundation commits by Claude Opus 5.5, markets-004 workers), unit/e2e verifyPlan tests. Hidden failure: a self-consistent but wrong plan passes verifyPlan. | No |
| contracts/script/Deploy.s.sol | Critical x Easy -> vibecode + vibecheck | One-shot and irreversible, but its checks (chain id, factory address + runtime codehash, nonce prediction) run on a fork dry run (E2EDeploy). | AI-written, dry-run tested; real deploy by human with ledger. | Yes |
| API platform core (SIWE, sessions, CSRF, quotas, GitHub gateway) | Not critical (funds) x Hard -> vibecode then review | Non-custodial: a takeover cannot sign transactions, but SIWE/CSRF defects are hard to see (viem findings §0). | AI-written, AI-reviewed, e2e negative paths. Flip: while no independent client exists, users sign API-served plans, so API compromise becomes critical. | Partly (review happened, but only by AI) |
| indexer-native / Envio read model | Not critical x Hard -> vibecode then review | Finalized-only, halts on conflict; reorg/RPC non-atomicity bugs are hard to see. | AI-written, AI-reviewed. Flip: if the read model decides which market is registry-linked for funding, a twin-market bug becomes critical. | Partly |
| deploy/, runbooks, CI, docs | Not critical x Easy -> vibecode and use | Config and docs, CI-enforced. | AI-written. | Yes |
| policies/ catalog text | Critical x Hard (semantic) | Wording decides resolution; no test catches ambiguity. | AI-drafted; human approval + Seer/Kleros review is an open launch gate. | Pending |

Verdict: the agent-built approach did not match the course policy for the critical/hard components. It applied the
course's audit half (AI review, fuzz/invariant/fork tests, a planned external audit) without the human-implementation
half. Real compensation exists: nothing is deployed, no funded key exists, and launch is gated on human decisions. To
comply, hand-port the 996 lines of Solidity (src + libraries + interfaces + script) and the tx-plan core, then point AI
at bug and exploit hunting. Alternatively, keep the AI version as one of several implementations compared against a
hand-written one (p.31 redundancy option).
