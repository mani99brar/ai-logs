# Course exercises: per-exercise write-ups

Companion to the AI Roadmap Report (https://claude.ai/artifact/4Rif48YoL5xGZUvoxrM6LS), whose Course exercises tab keeps the 21-item status table. These are the write-ups that tab held until 7 Oct 2026: what was run for each exercise, what it showed and where its evidence is. "Evidence log row N" means the report's Evidence log tab; S numbers are its Screenshots; "p.N" is page N of the course roadmap. Paths starting with `~/dev/course-gap-runs-2026-10-05/` are local originals; redacted copies of the 5 Oct results are the sibling folders of this file.

## Day 1 · Handoff between subscription sessions

A real cross-provider handoff exists. On 20 Sep Pi (gpt-6-astra) committed Slice 2 with a handoff note. 93 seconds later Claude Code opened with the Slice 3 brief, read the note and re-ran the 48 unit tests before writing anything.

1. 06:04:41 UTC — Pi commits and pushes `03a6fb8` (Slice 2) with `docs/HANDOFF_SLICE2.md` (accepted review fixes, final gates); the tree is clean.
2. 06:06:14 — Claude Code (Fable 5.1) opens with PRD\_SLICE3 as the brief.
3. 06:06:27 — Claude reads HANDOFF\_SLICE2.md.
4. 06:08:11 — Claude reports "48 unit tests pass and the tree is clean", then writes red tests.

There were four provider switches on 19–20 Sep, each a role change: Pi reviewed, Claude implemented. Two gaps against p.8:

- Every switch reused the same checkout. One owner was kept by timing, not by separate worktrees.
- Pi's session was left idle, not closed; it stopped its dev servers while Claude was already reading.

No switch was caused by a plan running out of quota.

Evidence: Pi session `2026-09-19T20-55-45-832Z_01a0bb74…` in `~/.pi/agent/sessions/--home-agentops-dev-md-manager--/`, Claude session `3e51e41c` in `~/.claude/projects/-home-agentops-dev-md-manager/`, and `docs/HANDOFF_SLICE2.md` in md-manager.

## Day 1 and Day 4 · Five builds of one brief

Five builds of the listing task (the 19 Sep brief for four of them) were scored the same way. The outcome brief beat my old one-line prompt, 7 of 7 acceptance items against 4. Higher effort or a different provider added time and cost but no acceptance gain.

All five started from commit `21db6f7` and were checked by one scorer: a Playwright script that reads the rendered rows and forces loading, empty, HTTP 500 and refused-connection states, plus build, lint, each build's own tests and fixture checksums. The scorer was written for the 5 Oct retrospective evaluation, not before the September builds; before implementation only the brief's 7 items existed, and attempt-a (18 Sep) predates even those.

| Build | Setup | Acceptance (of 7) | Own tests on 5 Oct | Agent time | Cost (list-price estimate) | Diff |
| --- | --- | --- | --- | --- | --- | --- |
| attempt-a | Pi, gpt-6-astra, medium; old one-line prompt | 4 pass, 1 partial, 2 fail | 0 | 422 s | $1.16 | 4 files, +95/−410 |
| attempt-b | Pi, gpt-6-astra, medium; outcome brief | 7 | 6/6 | 238 s | $0.85 | 13 files, +251/−468 |
| attempt-c | Claude Code, Fable 5.1, high; same brief | 7 | 9/9 | 363 s | $4.66 (whole session) | 16 files, +479/−357 |
| opus55-medium (5 Oct) | Claude Code, Opus 5.5, medium; same brief | 7 | 9/9 | 387 s | $2.03 | 19 files, +420/−393 |
| opus55-xhigh (5 Oct) | Claude Code, Opus 5.5, xhigh; same brief | 7 | 17/17 | 839 s | $3.59 | 25 files, +743/−430 |

What each pair shows:

- **Day 1 rediscovery (a vs b; only the prompt changed):** the outcome brief met all 7 items in 0.56× the time and at 0.73× the cost. The old prompt bundled the files at build time, so it had no loading or error state, no tests and no source field. It also added features the brief excludes. attempt-a never saw these criteria, and there is one run each.
- **Day 1 second provider (b vs c; the setup changed):** both met 7 of 7, with no shared misses. Claude took 1.5× as long, needed one intervention (a model switch before work began), and its error message gives no next step. Its tests all ran in the original session (9 of 9), while only 2 of Pi's 6 could, because Playwright was blocked. Model, harness and effort all changed, so this is a setup comparison (p.8).
- **Day 4 effort (Opus 5.5 medium vs xhigh; only effort changed):** both met 7 of 7. xhigh took 2.2× the time, cost 1.8× as much and wrote 1.5× the app code, including a Size column, `.markdown` support and a README rewrite nobody asked for. On this task medium is enough. The training report's routing claim now rests on my own run, not only on a benchmark (p.14: "do not assume maximum effort wins").

Caveats: one run per build. Costs are list-price estimates, not subscription charges, and my Fable advisor setting made up 49–61% of the two Opus runs' cost. The live attack-pass-003 run shared the machine, which may have slowed runs unevenly. Human review time was not measured.

Evidence: `~/dev/course-gap-runs-2026-10-05/effort-bench/` (brief, both new runs' results and patches) and `~/dev/course-gap-runs-2026-10-05/bench-eval/` (scorer, per-build logs and screenshots, full comparison table).

## Day 2 · R32 classification for Pine

Pine's critical, hard-to-check code was written entirely by AI, which is the opposite of the course rule for that cell (p.31). Nothing is deployed, and launch is gated on an external audit, so this can still be fixed before it matters.

Pine is the backend for a GitHub claim-verification market on Gnosis. It is non-custodial: users' wallets sign every transaction plan. It targets only Gnosis mainnet (chain 100), with no testnet config. No deployment was found locally. No funded key is referenced: `PINE_DEPLOYER` is an address and signing uses a Ledger.

| Component | R32 cell | Course rule | What happened | Match |
| --- | --- | --- | --- | --- |
| ClaimRegistry and EvidenceRegistry contracts (357 lines, immutable) | Critical × hard to identify | Write by hand, audit with AI | Written by Opus 5.5 workers on 2 Oct; AI reviewers found 7 P2 | No |
| Transaction-plan builder (`tx-plan.ts`, 433 lines) | Critical × hard to identify | Write by hand, audit with AI | AI-written | No |
| Deploy script | Critical × easy (a fork dry run checks chain, codehash, nonce) | Vibecode and vibecheck | Vibecoded, fork-tested | Yes |
| API platform (SIWE, CSRF, quotas) | Not critical × hard; Critical until an independent client exists | Vibecode then review | AI review only | Partial |
| Indexer and read model | Not critical × hard | Vibecode then review | AI review only | Partial |
| Policy catalog text | Critical × hard (meaning) | Human approval | Approval is a pending launch gate | Pending |
| Deploy assets, runbooks, CI | Not critical × easy | Vibecode and use | Vibecoded | Yes |

Decision, 6 Oct: keep the AI-written contracts and tx-plan core for now and rely on the external audit that gates launch. I will hand-write them later; until then this is a known deviation from R32. To match R32 later: hand-write the Solidity (about 1,000 lines including interfaces, libraries and the deploy script) and the tx-plan core, then use AI to hunt for bugs and exploits. The alternative is to keep the AI version as a second implementation and compare both against the same requirements (p.31). On-chain state was not checked; "not deployed" rests on local evidence only.

Evidence: `pine/contracts/`, `pine/packages/shared/src/tx-plan.ts`, `pine/docs/operations/release-checklist.md`, `pine-runs/chain/chain-005`; write-up in `~/dev/course-gap-runs-2026-10-05/replay-handoff-r32/RESULT.md`.

## Day 3 · Retest one old workaround (team-prd)

The shorter skill gave the same result at about 40% less parent cost. Both versions passed on the same input; the old one spent its extra context reading source files it did not need.

On 20 Sep the `team-prd` SKILL.md was cut from 1,327 to 586 words (commits `a7b4b23` → `2084dd2`, in my local Pi skills repo). Only SKILL.md changed between those commits; the helper scripts are byte-identical, so the instructions are the only variable. Each version ran once on 5 Oct in a fresh Pi session on gpt-6-astra at medium, with the same fixture record. The frozen record hash (`f1e01ce7…`) matched in both runs.

| Measure | v1.0.0 (1,327 words) | v1.0.1 (586 words) |
| --- | --- | --- |
| Verdict | PASS, 1 draft, 1 review | PASS, 1 draft, 1 review |
| Record IDs present in the PRD (of 16) | 16 | 16 |
| Review blockers / optional notes | 0 / 0 | 0 / 0 |
| Source files the parent read | 3 (`team_prd.py`, `workflow.js`, `templates.json`) | 0 |
| Parent turns | 21 | 14 |
| Parent tokens: fresh input / cached / output | 47.3k / 594k / 2.3k | 33.5k / 264k / 1.8k |
| Parent cost reported by Pi (subscription) | $1.18 | $0.69 |
| Session time | 353 s | 301 s |
| Draft + review time (helper) | 205 s | 232 s |

Keep the cut. The safeguards (three-round cap, timeouts, output validation) live in `team_prd.py`, which did not change, so nothing that prevents a demonstrated failure was removed (p.12). This is one run per version, so read the cost gap as an indication, not a measurement (p.4).

Evidence: `~/dev/course-gap-runs-2026-10-05/team-prd-retest/` (input message, both session logs, both run folders, `comparison.txt`).

## Day 3 · workflow-grill trigger test

`workflow-grill` triggers when it should and stays quiet when it shouldn't: 4 of 4 runs on a real request, 0 of 2 on a near-miss, and 2 of 2 on the missing-input case without inventing a feature. The test found one missing instruction.

Each run was a fresh `claude -p` session in a local clone of md-manager (HEAD `8178efb`) on subscription auth. No run wrote a file.

| Case | Prompt | Expected | Result |
| --- | --- | --- | --- |
| 1 | Grill the named feature viewer-ux-depth before launch, no slash command | Activate; ask one question with a recommended default | 4/4 activated; 2/2 with the skill allowed asked one "Question 1 of at most 5" with Recommended and Consequence |
| 2 | "Grill me on the indexing decisions in this SQL query" | Do not activate | 0/2 activated |
| 3 | Grill "the workflow feature" before launch, no name | Activate; ask which feature; invent nothing | 2/2 asked which feature, 0 invented; but only 3 of 8 features listed, after 7–9 file reads ($0.42–$0.76) |

The missing instruction: SKILL.md has no rule for an unnamed feature, so the model guessed by keyword. It left out viewer-ux-depth, the only 2.2.0 feature that launch refused on 5 Oct. A one-bullet fix, applied on 5 Oct and committed on main as ca0009a on 6 Oct, made case 3 list all 8 features with 0 file reads in 2 of 2 runs. The Opus cost fell from $0.33–$0.42 to $0.13–$0.17; the earlier $0.42–$0.76 figure also includes the Fable advisor, which the patched runs didn't load.

- In headless `-p` sessions the Skill call is refused unless `Skill(workflow-grill)` is allowlisted; the model then reads SKILL.md by hand.
- Case 1 takes 28–31 turns, about 6 minutes and $2.50–$3.26 to reach the first question, because SKILL.md's section 1 reads every file first.
- Not tested: the interactive part (one question per turn, read-back, writing decisions.md), since `-p` stops at the first question.

Evidence: `~/dev/course-gap-runs-2026-10-05/grill-trigger-test/` (RESULT.md, prompts, 13 streams, the proposed diff). The 13 runs cost $11.21 API-equivalent.

## Day 4 · Forced branch failure and replay

In the 21 Sep drill only the failed branch reran. The controller re-ran adapter verification (attempt 2, passed in 34.9 s), reused the UI lane's result from a checkpoint and relaunched 0 AI workers. That is LangGraph checkpoint behaviour (R19, p.27). Claude's start-order relaunch would have rerun the UI lane too (p.14).

The drill in project-workflows-001 (UTC):

1. 15:31:40 — Both verification lanes start, adapter first.
2. 15:32:24 — Adapter blocked by the drill marker; all 4 of its real checks exit 0.
3. 15:32:39 — UI lane passes.
4. 15:32:42 — Controller refuses with "Non-retryable graph failure", because of a stale error left by an earlier aborted launch.
5. 15:34:30 — Fix `ea44c51`: classify only pending tasks.
6. 15:34:37 — Relaunch re-runs adapter verification only (attempt 2).
7. 15:35:11 — Adapter passes.
8. 15:42:28 — Candidate `b5385b3` integrated, after review approved it with 6 P2 findings.

Two caveats. The automatic retry did not work the first time; it needed a code fix and a manual relaunch. And after an earlier real failure (a TMPDIR socket path over 107 bytes), the attempt counter was reset by hand, which went round the 3-attempt cap. The drill failed a verification lane, not an AI worker, so replay after a worker failure is still untested. The 90-minute run deadline on p.18 is not enforced anywhere: launch to integrate took 69 minutes, about 29 of them operator diagnosis.

Evidence: `ai-logs/runs/md-manager-workflows/project-workflows/project-workflows-001/` (events.jsonl, failure-report.json, policy.json); write-up in `~/dev/course-gap-runs-2026-10-05/replay-handoff-r32/RESULT.md`.

## Day 4 · Claude workflow relaunch drill (stop, fix, resume)

Claude's own workflow relaunch behaves as p.14 says. After an agent's prompt is fixed, that agent and every agent started after it run again, including a sibling that had already finished. Resuming without an edit does not retry a failure.

The drill was a four-agent workflow started in order A, B, C, D. B fails because its input file is missing. D was meant to sleep; the harness blocked the sleep, so the stop caught D by timing, before it returned. Each agent writes a line to a log when it actually executes, so a cached agent leaves no line.

| Run | What changed | A | B | C | D |
| --- | --- | --- | --- | --- | --- |
| 1 | Launched; stopped with D mid-run | ran | ran, failed | ran | ran, stopped |
| 2 | Input fixed; resumed, script unchanged | cached | cached, still failed | cached | reran |
| 3 | B's prompt edited; resumed | cached | reran, passed | reran | reran |

Two lessons for my workflows. Fixing the cause outside the script isn't enough, because a failed result is cached like any other; the failed agent's prompt or options must change. And a fix to one agent reruns everything started after it, so put cheap or independent agents first and expensive ones late, or split them into separate stages (R19).

Evidence: `~/dev/course-gap-runs-2026-10-05/workflows/relaunch-drill/` (both script versions, `drill.log`, journal, run outputs).

## Day 5 · Routine: repeated and changed inputs

The weekly context audit fails the course's idempotency test (p.17). A second run on identical input calls the model again, sends a second notification and overwrites the baseline. The patch that fixes this was applied on 5 Oct and re-tested against the live script.

The 5 Oct timer-fired run (07:47 UTC, not started by hand) finished with rc=0 in 10 min 23 s, at $5.88 against $4.40 on 1 Oct. Standing context grew from 39,572 to 73,147 tokens (+85%). Memory files drove 72% of that growth (12,105 → 36,103 tokens, 27 → 63 files). None of the six actions recommended on 1 Oct was applied; their target files are byte-identical. That run recommended nine actions; all nine were prepared as reviewable patches that dry-run clean, and only action 4 (memory files) was applied, on 5 Oct at 14:37 UTC. The log shows a notification was attempted; delivery can't be seen locally.

The sandbox tests ran on a copy of the routine, with the model and the notifier stubbed: no model calls, no Telegram.

| Test (p.17) | Current script | With the patch |
| --- | --- | --- |
| Run 2 on identical input | 2nd model call, 2nd notification; baseline overwritten, so the delta reads "+0 vs 2026-10-05" | No-op: 0 model calls, 0 notifications, report unchanged |
| Changed input (CLAUDE.md +62 tokens, one new agent file) | Picked up: +91 tokens, new file listed, report changed | Same |
| No report written | FAILED notification, exit 1 | Same |
| No report, after a success the same day | Exit 0 and a success notification with the old summary (failure hidden) | FAILED, exit 1 |
| Model error or malformed result JSON, with a report | Treated as success | FAILED, exit 1 |
| Corrupt baseline file | Exit 1, no notification | FAILED, exit 1 |

The routine contract, as the script implemented it before the patch:

- **Trigger:** systemd timer, Mondays 07:47 UTC, catch-up after downtime. Nothing stops a second run the same day.
- **Input version:** the live files under `~/dev` and `~/.claude` at run time, plus the last baseline. No input hash, CLI version or model is pinned (1 Oct ran Fable 5.1; 5 Oct ran Opus 5.5 and Fable 5.1).
- **Permissions:** read tools plus Write under `acceptEdits` across `~/dev` and `~/.claude`, with an $8 cap. "Read-only everywhere else" is enforced only by the prompt.
- **Output:** `runs/context-audit/<date>/`, `last-metrics.json`, the log, and a Telegram summary.
- **Validation:** only "report.md is non-empty".
- **Owner:** not written in the unit or the script.
- **Failure:** a FAILED notification on a missing report; silent on metrics errors and on the cases above.

The patch adds a per-date no-op guard (with `--force`), freezes the baseline per date, clears old outputs before the model call, and treats a model error, bad JSON or a missing report as FAILED. Two trade-offs to accept knowingly: a same-day input change needs `--force`, and a run that writes a full report but exceeds its budget now counts as FAILED. Applied 5 Oct at 10:34 UTC, with a follow-up fix at 10:50: a 31-case sandbox run against the live script passed. One regression it found was fixed: a corrupt baseline used to stay frozen for the day. The 5 Oct run is marked done, and its baseline stays frozen to 1 Oct. Two gaps remain after the patch: a run killed by the 1-hour timeout sends no failure notice, and a crash between the report and the done marker can send a second notification. The originals are runner/context-audit.sh.bak-20261005 (before the patch) and .bak-20261005-patch1 (before the fix). Separately, the Claude Code package reinstalled itself at 07:52 during the 5 Oct run; the unit doesn't set `DISABLE_AUTOUPDATER`.

Evidence: `~/dev/course-gap-runs-2026-10-05/routine-tests/` (RESULT.md, before/after snapshots, `patch/context-audit-idempotency.patch`); the 5 Oct run's real outputs in `agent-workflow/runs/context-audit/2026-10-05/`.

## Day 5 · Capstone: Codex as the other-provider evaluator

Codex found two defects the two Claude reviewers missed, and the providers shared no findings at all. That supports keeping a second evaluator, but the setups differed: Codex ran checks and wrote probes while the Claude reviewers were barred from running commands, so it shows the value of a different evaluation setup, not of the provider alone.

The run was project-B `ledger-economy-001`: approved, 11 files, +744/−18, base `4c8e75d`, candidate `abec252`. Codex (gpt-6-astra via Pi, high effort, read and bash tools only) got the task, decisions, acceptance list and diff, but not the Claude reviews or the worker's rationale (p.17). It ran every check itself: typecheck, 644 unit tests, 36 integration tests and the build, all passing. The order differs from p.17: the run was approved and merged on 24 Sep by the two Claude reviewers, and I picked it on 5 Oct from already-approved runs, so Codex reviewed it after the merge and its request-changes verdict blocked nothing. Its design decisions were made by the assistant overnight under my standing instruction, not in a grill with me. The capstone is therefore Partial.

|  | Claude reviewers (general, coverage) | Codex |
| --- | --- | --- |
| Verdict | Approved, 6 P2 | Request changes, 2 P2 |
| Checks the reviewer executed | 0 (their prompt forbids running commands) | 4, plus 4 probes it wrote |
| Findings shared with the other side | 0 | 0 |
| Review time | 2 m 21 s and 1 m 26 s | 9 m 49 s |

Codex's two findings were both confirmed by re-running its probes:

- **X1:** unchecked integer overflow in `grantGold` (economy.ts:80) and in the tonic `endTick` (economy.ts:196).
- **X2:** the grant key at invariant.ts:203 is an unescaped string, so two different grants can collide and report a false "granted twice".

Codex rated both P2; the Claude analysis of its pass rated them P3, because they need values near 2^53, or player ids containing " for ". Re-checked on main on 6 Oct: X1 still applies; X2 can no longer happen, because the follow-up run (0a32ab9) made grantGold accept only known island keys. Sharing the implementer's rationale after the first pass changed nothing (n=1). Pi's list-price estimate for the pass was $1.81, billed to the ChatGPT subscription.

Human inspection, 6 Oct (p.17): I read the five hotspots on main and judged all five still open. Five verifier agents then probed each one (capstone-verify/), and the probes overturned four of my five calls: X2 can no longer happen, and the follow-up run (0a32ab9) had already fixed the request-id gap, the caller-chosen purse and the weak tonic test. Only X1 stands, and I accepted it as P3. With those fixes the suite catches all four planted economy bugs.

Two workflow changes follow from this: let the Claude reviewers execute checks, and add a Codex review lane.

Evidence: `~/dev/course-gap-runs-2026-10-05/capstone-codex/` (packet, Codex output, probes, `comparison.json`).

## Setup · Quota, spend and human time

The logs show one hard weekly-limit stop on Claude, about 42 hours of my in-chat time, and no Codex quota events. On 5 Oct the VPS Claude plan meter read 26% of that week's limit. Screenshots S32–S36 show activity statistics for both Claude accounts and Codex (sessions, tokens, models), not remaining quota.

| Measure, 18 Sep – 5 Oct | Value |
| --- | --- |
| Claude API-equivalent cost (last cost-state line per session, forks de-duplicated) | $6,049 over 947 sessions; Opus 5.5 is 76% |
| Claude cost by ISO week (session start date) | W38 $147 · W39 $2,090 · W40 $3,664 · W41 so far $147 |
| Claude weekly-limit hard stop (VPS account) | 25 Sep 18:19 → 26 Sep 08:00 UTC, 86 rejected requests, overage off |
| Claude Fable-limit events | 3 (22 Sep 08:28 and 15:18, 23 Sep 17:04 UTC) |
| Codex via Pi | Codex 94M tokens, $163 notional (covered by ChatGPT Pro), 0 quota errors; DeepSeek 82M tokens, $5.50 metered |
| Metered API spend | DeepSeek, $5.50 (the only one) |
| My in-chat time (typed messages, 10-minute gaps merged) | 41.8 h; 32–51 h with 5–15 minute gaps; busiest day 2 Oct at 8.7 h |
| Active time per approved run (58) | about 43 min if all in-chat time is charged to them (includes PRD writing, setup and learning; review outside the chat is missing, so an estimate, not a bound) |

Claude plan meter for the VPS account, read with `claude -p "/usage"` at 09:38 UTC on 5 Oct: current session 3% used, current week 26% used (resets 9 Oct 20:59 UTC), Fable week 0%. Of the last 7 days' usage, 72% was at more than 150k tokens of context and 60% came from subagent-heavy sessions.

What this adds to the report:

- The 25–26 Sep weekly-limit stop is the strongest evidence for the second Claude plan; 26 Sep is the one day with no typed activity from me; the stop blocked the VPS Claude account, not every machine and provider. It shows a capacity need, which fits p.5's reserve, not that Claude is strictly superior.
- The Codex and Mac plan meters were not read; S32–S36 show their activity, not their quota. Headless `pi -p` runs leave no session file, so the Codex total is a floor.
- The human-time figure misses reading and review between prompts more than 10 minutes apart, and counts idle time inside a span. Treat it as a rough range.

Evidence: `~/dev/course-gap-runs-2026-10-05/cleanup-quota-time/` (`claude_cost_summary.txt`, `pi_usage_since18_summary.txt`, `human_time_summary.txt` and the scripts).

## Day 5 · Cleanup inventory

Found on 5 Oct and acted on 5–6 Oct (p.17). The last column says what was done and what is still open.

| Area | Found at 08:14 UTC | Done / still open |
| --- | --- | --- |
| Timers | 5 active: panel watchdog (every 2 min), nightly pass (23:00), panel `/compact` (04:30), context audit (Mon 07:47), a cache cleaner. One disabled Vea unit still on disk | Done 6 Oct: nightly timer disabled, because a critical Vea mainnet deploy task sat in its queue on all 15 nights that reached selection, stopped only by a dirty checkout; it stays off until the queue refuses critical tasks. The disabled Vea unit and its script removed. The other four kept deliberately: the context audit for the weekly habit, the watchdog and /compact for the Telegram panel, and the cache cleaner |
| Processes over 24 h | 3 stale: an http.server running since 15 Sep, an orphaned poll loop, an idle Okiya session | Done 5 Oct: all 3 stopped |
| Worktrees | 272 registered across repos; 267 folders under `~/.local/state` using 49.1 GiB, 11 of them unregistered; disk 80% full | Done 6 Oct: 26 GB of finished-run worktrees removed with the built-in clean after their exports were confirmed. Still open: 9 unexported runs (about 5.6 GiB) to export first, and 122 more folders (13.5 GiB) awaiting a keep-or-remove decision per run |
| Permissions | No settings file grants bypass, but automatic workers launch with `--dangerously-skip-permissions` in code; the panel allows broad `systemctl`, `find` and `cat` | Done 6 Oct: panel rules narrowed. Still open: automatic workers still skip permission prompts |
| Spend | $5.50 metered API (DeepSeek); everything else is subscription | Decided 6 Oct: keep DeepSeek (p.5) |
| Credentials | Subscription logins and API keys, inventoried by file and name only (no values recorded) | Done 6 Oct: keys moved out of shell profiles into private files; subscription logins kept |

The full checklist with exact commands is in `~/dev/course-gap-runs-2026-10-05/cleanup-quota-time/RESULT.md`.
