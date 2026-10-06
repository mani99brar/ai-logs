# Day 5 routine exercise: weekly context audit

Course reference: PDF p.17, "Practice for day 5 / Routine exercise": *"Define trigger, input version,
permissions, output path, validation, owner and failure behavior. Run twice on identical input, then
once with a changed fixture inside the block. The second identical run must not duplicate effects.
Missing or invalid output must be visible."*

Routine under test: `/home/agentops/dev/agent-workflow/runner/context-audit.sh`
(sha256 `96fbe0fa37e023ae8f5bca66b94c52c813f45cd5d92cca62b4adfb746a7e4bf2`), triggered by the systemd user
timer `context-audit.timer`.
Scratch: `/tmp/claude-1000/-home-agentops-dev/ade0e1ee-cfaf-469b-985e-ae9aaff165a8/scratchpad/gaps/routine`
(written as `$S` below).

Nothing under /home/agentops/dev, ~/.claude, ~/.pi, ~/.local/state or systemd was modified. The real
run was not started by me. No model was called in the sandbox, and no notification left the machine.

---------------------------------------------------------------------------------------------------

## 1. Today's real run (timer, 2026-10-05)

How it was observed: `$S/poll.sh` ran in the background and is read-only. Every 30 s it ran
`systemctl --user show context-audit.service` and tailed the audit log, then it stopped when the end
marker appeared (`$S/poll.log`). After the run, `$S/tools/real_summary.sh` read the log, the journal,
the outputs and claude-result.json (`$S/real-run.txt`). I did not start the run.

- **It ran.** systemd started it at 07:47:00 UTC (`ExecMainStartTimestamp`) and it finished at
  07:57:23 UTC: `Result=success`, `ExecMainStatus=0`.
  Journal: "Finished context-audit.service ... Consumed 37.837s CPU time, 996.8M memory peak".
- **rc=0.** Log lines: `metrics rc=0` (07:47:08), `claude rc=0`, `=== context audit end 2026-10-05T07:57:23+00:00 rc=0 ===`.
- **Cost and duration.** Log line: `cost_usd=5.876 turns=85 duration_s=611 is_error=False`.
  claude-result.json: `total_cost_usd` 5.8759688, `duration_ms` 610,732, `duration_api_ms` 588,780,
  `subtype` success, `terminal_reason` completed. modelUsage keys are `claude-opus-5-5` and
  `claude-fable-5-1`; on 1 Oct it was only `claude-fable-5-1`. The script passes no `--model`, so the account default applies. The CLI version I checked at 07:42 (2.1.289) predates the 07:52 reinstall noted below, and the running process was the pre-reinstall binary.
  There were 5 Bash permission denials (8 on 1 Oct). Wall time was 10 min 23 s: 8 s of metrics, then
  the model.
- **Outputs.** report.md 15,429 B, summary.txt 168 B (under the skill's 180-char limit),
  claude-result.json 7,456 B. `latest -> 2026-10-05`. `state/context-audit/last-metrics.json` now
  has date 2026-10-05 and 73,147 tokens, so the 1 Oct snapshot survives only in `runs/context-audit/2026-10-01/`.
- **Notification attempted: yes, by the audit log.** The run ended through the success branch
  (`end ... rc=0` with report.md present), which calls `runner/notify.sh`, and the log has no
  `notify: telegram failed` line (notify.sh writes that to stderr on a curl error, and stderr goes into
  the log). Cross-check: `logs/notifications.log` went from 15 to 16 lines, and the new line is
  `2026-10-05T07:57:22+00:00  Context audit`. Delivery to the Telegram chat itself cannot be seen
  locally, because curl output is discarded.
- Incidental: the claude-code npm package on the host was reinstalled between 07:51:58 and 07:52:03 UTC
  (mtime of `.../@anthropic-ai/claude-code/bin/claude.exe`), while this run's `claude -p` (PID 3242890)
  was in progress. The run survived and returned rc=0. One of my sandbox Bash calls caught a transient
  "claude native binary not installed" message in that window. The sandbox itself only ever called the
  stub, by absolute path: 1 logged call in `psb-final`. Who triggered the reinstall was not
  determined. The unit does not set `DISABLE_AUTOUPDATER`.

### 5 Oct vs 1 Oct baseline

| | 1 Oct (baseline) | 5 Oct (today) | change |
|---|---|---|---|
| rc | 0 | 0 | |
| cost | $4.404 | **$5.876** | +$1.47 (+33%) |
| turns | 64 | 85 | +21 |
| model time | 399 s | 611 s | +212 s |
| wall (start→end marker) | 15:23:28→15:30:12 (6 min 44 s) | 07:47:00→07:57:23 (10 min 23 s) | |
| standing context, yours (unique_tokens_unmanaged) | **39,572** | **73,147** | **+33,575 (+85%)** |
| incl. managed plugins | 100,052 | 133,268 | +33,216 |
| files scanned / unique | 122 / 78 | 162 / 120 | |
| memory | 12,105 (27 files) | 36,103 (63 files) | +23,998 (72% of the growth) |
| instructions | 8,562 (5) | 13,155 (9) | +4,593 |
| prompts | 905 (5) | 3,152 (7) | +2,247 |
| settings | 348 (3) | 1,557 (5) | +1,209 |
| skills (unmanaged part) | 6,039 | 7,567 | +1,528 |
| highest session baseline | 9,184 (vea-validator3) | 8,705 (vea-validator3) | −479. All of it is managed skill descriptions (2,756→2,277); the instructions chain is unchanged at 6,279 |

**Were the baseline's six recommended actions applied? No, none of them.** I checked this read-only by
comparing per-file sha in the 1 Oct and 5 Oct metrics.json:
1. `vea_validators/AGENTS.md`: 4,372 tokens, sha a6e6acaa on both dates; file mtime 2026-09-16.
2. `agent-workflow/.pi/skills/agent-workflow/SKILL.md`: sha 5436d055 on both. L126 still says `commit -m "task(<project>/<id>): <title>"`.
3. `veashi-deployer.md`: sha b1389c84 on both, `requiredDVNCount: 1` still present, and `veashi-contracts/docs/mainnet-routes.md` does not exist.
4. `vea-ts-engineer.md` (12f000a5) and `vea-validator-engineer.md` (1f4b3ff1): unchanged.
5. The md-manager memory logs are unchanged (f3d2b47a, b94747c8, b9ed8972), and the two orphans
   (`workflow-run-review-is-read-only.md`, `workflow-commands-in-new-herdr-tab.md`) are still not in MEMORY.md.
6. Both synced bundle dirs (`1db6c9ed…`, `2ec3ab27…`) are still present.

Today's model-written report reaches the same verdict ("None of last week's six actions were done").
It closes #6 as a non-issue. Its summary line: "Context audit: 73.1k tokens (+33.6k, memory x3). Last
week's 6 actions not done. Top: trim vea_validators AGENTS.md (~3k/session x3); collapse run-log
memories (~12k)." It also corrects the 1 Oct report's "agents (yours) 6,672" to 11,833 (6,672 was the
managed figure).

Exposure created by the non-idempotency: `last-metrics.json` is now the 5 Oct snapshot. Any re-run
today, whether manual or a retry, would send a second Telegram message, spend roughly another $5.9,
and overwrite today's report with a "+0 vs 2026-10-05" delta. Section 2(a) reproduces exactly that in
the sandbox.

---------------------------------------------------------------------------------------------------

## 2. Sandbox contract tests

### Sandbox construction (`$S/tools/mk_sandbox.sh <dir> [script]`)
- Copies `runner/context_metrics.py`, `runner/context-audit.sh`, `.claude/skills/context-audit/SKILL.md`
  and `state/context-audit/last-metrics.json` (the real 1 Oct snapshot, 88,099 B, sha256 prefix `afb642a3f55e`).
- `runner/notify.sh` is replaced by `$S/tools/notify-stub.sh`, which appends `date, title, msg, report`
  to `<sandbox>/state/notify-stub.log`. It makes no network call.
- `bin/claude` is replaced by `$S/tools/claude-stub.py`. It makes no model or network call. It logs
  every call to `<sandbox>/state/claude-stub-calls.log`. With `STUB_MODE=ok` it writes report.md and
  summary.txt deterministically from metrics.json and prints a result JSON. The other modes are
  `noreport`, `badjson`, `emptyjson`, `emptyjson_report` and `iserror`.
- The copy is edited in four lines (`$S/sandbox-copy.diff`):
  1. `ROOT=` now points at the sandbox.
  2. The script's own `export PATH=` now puts `$ROOT/bin` first. The real script prepends the nvm bin
     dir, so a stub placed first on PATH from outside would have been bypassed.
  3. `claude -p` is now `"$ROOT/bin/claude" -p`, so the stub is called by absolute path.
  4. `${CONTEXT_AUDIT_METRICS_ARGS:-}` is added to the metrics call so that `--root <sandbox>/fixture`
     pins the input. This is the CLI's own `--root` flag.
  The builder fails if the copy still contains a bare `claude -p` or does not point ROOT at the sandbox.
- Fixture (frozen input): `fixture/proj/CLAUDE.md` (synthetic), `fixture/proj/.claude/agents/executor.md`
  (copy of `~/.claude/agents/executor.md`) and `fixture/proj/.claude/skills/context-audit/SKILL.md`.
- Evidence after every run comes from `$S/tools/snap.sh`: script exit status, sha and mtime of every
  output, notify and claude call counts, `latest` link, and log block count.
- `DISABLE_AUTOUPDATER=1` was exported for every run, even though no real claude is ever reached.

### (a) Two runs on identical input, same date (original script)
Commands: `CONTEXT_AUDIT_METRICS_ARGS="--root $S/sandbox/fixture" STUB_MODE=ok $S/sandbox/runner/context-audit.sh`, run twice.
Wall time was 0.39 s and 0.31 s. Cost $0 (stub).

| effect | run 1 | run 2 | duplicated? |
|---|---|---|---|
| script exit | 0 | 0 | |
| model (claude) calls, cumulative | 1 | 2 | **yes**: a second paid call in real life ($4.40–$5.88 at observed rates) |
| notifications sent, cumulative | 1 | 2 | **yes**: a second Telegram message |
| metrics.json / metrics.md | sha 5020a0072bf6 / a2681320d6bf | sha ee318119171c / 6ba98f4c2f97 | overwritten, **different content** |
| report.md | sha dec62df99f4e | sha e3aec5417de3 | overwritten, different content |
| summary.txt | "2152 tokens (-37420 vs 2026-10-01)" | "2152 tokens (0 vs 2026-10-05)" | overwritten, different |
| state/context-audit/last-metrics.json | 1 Oct baseline replaced by run-1 metrics (date 2026-10-05) | replaced again by run-2 metrics | **yes**: the 1 Oct baseline is destroyed after run 1 |
| metrics.md "Change since last snapshot" | Previous 2026-10-01, -37,420 tokens | **Previous 2026-10-05, +0 tokens** | run 2 diffs against run 1, not the real baseline |
| claude-result.json | sha 663a7b176331, mtime 07:45:54.008 | sha 663a7b176331, mtime 07:45:56.559 | overwritten. Same bytes only because the stub is deterministic; a real run would replace the first run's cost record. |
| runs/context-audit/latest | -> 2026-10-05 | -> 2026-10-05 (re-linked) | harmless |
| logs/context-audit-2026-10-05.log | 1 start/end block (5 lines) | 2 blocks (10 lines) | appended |

The scanned input was byte-identical. The (path, sha, tokens) list in the two reports diffs empty.
**Verdict: run 2 duplicates effects.** It repeats the model call and the notification. It also changes
its own input: run 1 copies its metrics over `last-metrics.json`, so run 2's week-over-week delta
collapses to "+0 vs today", and the real comparison against 1 Oct is lost.

### (b) Changed fixture (original script, same sandbox)
Change: a 3-line paragraph was appended to `fixture/proj/CLAUDE.md`, and a new agent
`fixture/proj/.claude/agents/fixture-reviewer.md` was added. Wall time 0.36 s.
Result: exit 0. metrics.md says "Previous snapshot: 2026-10-05. Net change **+91 tokens**". It lists the
new file and shows `| +62 | +100% | 124 | .../fixture/proj/CLAUDE.md |`. The stub report changed to
`unique_tokens_unmanaged=2243 files=4 ... total_delta=91 new=1 changed=1` (it was 2152 / 3 / 0).
Notification 3 was "STUB audit: 2243 tokens (91 vs 2026-10-05)". The output followed the input
change. The baseline of the delta is still run 2's snapshot, not 1 Oct.

### (c) Missing or invalid output (original script)
Each case except the stale-report case ran in a fresh sandbox (`$S/sb-<case>`), with no earlier output for the date.

| case | stub behaviour | script exit | notification | last-metrics / latest advanced? | visible? |
|---|---|---|---|---|---|
| fresh-noreport | valid JSON, no report | **1** | **"Context audit FAILED: No report written for 2026-10-05 (claude rc=0)"** | no / no | yes |
| fresh-emptyjson | empty stdout, exit 1, no report | **1** | **FAILED (claude rc=1)** | no / no | yes |
| fresh-badjson | report written, stdout "this is {not json" | 0 | "Context audit" (success) | yes / yes | **no**: the cost line silently disappears from the log |
| fresh-emptyjson-report | report written, empty claude-result.json | 0 | success | yes / yes | **no** |
| fresh-iserror | report written, `is_error:true`, exit 1 | 1 | **success** notification | yes / yes | mixed: Telegram says OK, journal says failed |
| **stale-noreport** (sandbox from a/b, after a successful run the same day) | valid JSON, **no report** | **0** | **success, carrying the previous run's summary** ("2243 tokens (91 vs ...)") | yes (last-metrics overwritten) | **no: the failure is masked by the stale report.md (same sha 5bb8fcd49f9f, mtime 07:46:16)** |
| corrupt-prev (`{not json` in last-metrics.json) | stub never called | 1 | **none** | no | **only in the journal and log (traceback), no notification, no end marker**. It repeats every week until someone fixes the file. |
| empty-prev (0-byte last-metrics.json) | stub never called | 1 | **none** | no | same as corrupt-prev |
| lock held (flock on state/context-audit.lock) | not called | 0 | none | no | log line "another context audit is running; exiting" only (correct for concurrency) |

Summary: missing output is visible only on a date with no earlier report. Invalid output (bad or empty
JSON, `is_error`) is never treated as a failure. A metrics failure is never notified. Consequence: `fresh-iserror` advanced both `last-metrics.json` and `latest` on a run that the CLI itself reported as an error.

### Proposed fix (not applied): `$S/patch/context-audit-idempotency.patch`
Unified diff against the real `runner/context-audit.sh`. `patch --dry-run` applies cleanly to a copy of
the original. Changes:
1. **One completed audit per date.** After a successful notification the script writes `$OUT/.done`.
   A later run on the same date logs "already completed ...; no-op" and exits 0, unless `--force`.
2. **Frozen baseline.** On the first run of a date, `last-metrics.json` is copied to
   `$OUT/prev-metrics.json`. Every run that day diffs against that copy.
3. **No stale outputs.** `report.md`, `summary.txt`, `claude-result.json` and `.done` are deleted before
   the model call.
4. **Stricter validation.** Success needs claude rc=0, a claude-result.json that parses with
   `is_error` false, and a non-empty report.md. Anything else sends a FAILED notification with the
   reason and exits 1.
5. **Metrics failure is notified.** It sends "Context audit FAILED: metrics step failed" and writes the end marker.

Tested in fresh sandboxes built from the patched script (`$S/patched-tests.snap`, `$S/patched-retry.snap`):
- run 1 ok, then run 2 identical: run 2 makes **0 extra model calls and 0 extra notifications**.
  report.md keeps sha eda19247a4ba and mtime 07:48:27.222. The log shows the no-op line.
- A changed fixture without `--force` is a no-op. With `--force` it reruns and the delta is still
  against 2026-10-01 (-37,317), not against itself.
- `--force` with no report written gives FAILED and exit 1 (the stale-mask case is fixed). The next run
  without `--force` retries, succeeds, and produces a byte-identical report (sha eda19247a4ba). A run
  after that is a no-op.
- fresh noreport, badjson, emptyjson, emptyjson_report and iserror all give a FAILED notification and
  exit 1, and none of them advances last-metrics or latest.
- corrupt prev gives a "metrics step failed" notification and exit 1.
- `--metrics-only` exits 0 with no model call and no notification. The no-op branch now writes an end
  marker too (`=== context audit end ... rc=0 (no-op) ===`), checked in `$S/psb-final`.

Design choices the operator should accept knowingly:
- The idempotency key is the **date**, not an input hash. A same-day input change needs `--force`.
  Keying on a hash of the scanned file list (path+sha from metrics.json) is a possible follow-up.
- The stricter validation treats `is_error:true` (for example, budget exceeded after a full report was
  written) or claude rc≠0 as FAILED, even when report.md exists. In that case `last-metrics.json` and
  `latest` do not advance. Today's script would have sent a success notification.

---------------------------------------------------------------------------------------------------

## 3. Routine contract (from the real files)

| field | contract as implemented | gap |
|---|---|---|
| Trigger | `context-audit.timer`: `OnCalendar=Mon *-*-* 07:47:00` (host is UTC), `Persistent=true` (catch-up after downtime), `AccuracySec=5min`. It starts `context-audit.service` (`Type=oneshot`, `ExecStart=.../runner/context-audit.sh`). Manual runs use the same script. | Nothing stops a second run on the same date: a manual run, a catch-up or a retry repeats every effect. |
| Input version | The live tree is walked at run time (`DEFAULT_ROOTS = /home/agentops/dev, ~/.claude`, with exclusions) plus `--prev state/context-audit/last-metrics.json`. SKILL.md, the claude CLI (2.1.289 today) and the model (user default unless `CONTEXT_AUDIT_MODEL`; 1 Oct used `claude-fable-5-1`) are all whatever is on disk. | Nothing is pinned. No git SHA or input hash is recorded; metrics.json only has per-file sha16 and the date. The `--prev` baseline changes with every successful run, including a same-day re-run. |
| Permissions | `claude -p --permission-mode acceptEdits --add-dir /home/agentops/dev /home/agentops/.claude --allowedTools Read Glob Grep Write Bash(python3 runner/context_metrics.py:*) Bash(cat/ls/wc/git log/git diff/git status:*) --max-budget-usd ${CONTEXT_AUDIT_BUDGET_USD:-8}`. systemd: user unit, `Nice=10`, `TimeoutStartSec=1h`, `KillMode=mixed`. Subscription auth of user agentops. notify.sh reads `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` from `state/notify.env`, or from `~/.claude/channels/telegram/.env` and `access.json`. `NTFY_TOPIC` is optional. | `Write` plus `acceptEdits` over all of ~/dev and ~/.claude: "read-only everywhere else" is enforced only by the prompt. `DISABLE_AUTOUPDATER` is not set in the unit. |
| Output path | `runs/context-audit/<date>/{metrics.json, metrics.md, claude-result.json, report.md, summary.txt}`, `state/context-audit/last-metrics.json` (overwritten on success), `runs/context-audit/latest` symlink, `logs/context-audit-<date>.log` (append), `logs/notifications.log` (append, by notify.sh), `state/context-audit.lock`. | The per-date directory is overwritten in place, and the 1 Oct baseline lives only in `last-metrics.json`. |
| Validation | Only `[ -s "$OUT/report.md" ]`. | claude rc, `is_error`, JSON validity, report freshness, the report's shape against the SKILL template and summary.txt (which has a fallback) are all unchecked. |
| Owner | User `agentops` (operator) through the systemd user unit. The code is in `agent-workflow/runner/`, the judgement is in `agent-workflow/.claude/skills/context-audit/SKILL.md`, and the reader gets it by Telegram. | The owner is not written down anywhere in the unit or the script. |
| Failure behaviour | No report gives a "Context audit FAILED" notification and exit 1 (journal shows a failed unit). A metrics error exits with its rc and **no notification**. A held lock exits 0 with a log line only. An `is_error` result with a report gives a **success** notification and exit 1. Invalid JSON with a report counts as success. notify.sh always exits 0; a Telegram failure prints "notify: telegram failed" to stderr, which ends up in the log. A 1 h timeout kill means no end marker and no notification (read from the code, not tested). | See (c) and the patch. |

## 4. Schedule disposition (p.17: "Disable any live schedule at the end unless you deliberately choose to retain it")
The live `context-audit.timer` is **retained** on purpose. It is the operator's production weekly
routine, and this exercise's hard rules forbid stopping timers or services. The sandbox has no
schedule. It was run manually through the CLI.

## 5. Commands run, timings and costs
- Real run: observed only, never invoked. It cost $5.876 (scheduled spend, not added by this exercise).
- Sandbox: 31 invocations of the copied script (12 original, 19 patched), each 0.3–0.4 s wall. Model cost **$0**: the stub
  replaced claude, and the notify stub replaced Telegram/ntfy/notify-send.
- Files: `$S/tools/{mk_sandbox.sh, claude-stub.py, notify-stub.sh, snap.sh, real_summary.sh, fixture-CLAUDE.md}`,
  `$S/poll.sh`, `$S/poll.log`, `$S/sandbox-copy.diff`, `$S/a-run{1,2}.snap`, `$S/b-run3.snap`,
  `$S/c-fresh.snap`, `$S/c-stale.snap`, `$S/c-lock.snap`, `$S/patched-tests.snap`,
  `$S/patched-retry.snap`, `$S/patch/context-audit-idempotency.patch`, `$S/patch/context-audit.sh`,
  `$S/real-run.txt`, and sandboxes `$S/sandbox`, `$S/sb-*` and `$S/psb-*`.
- Real script sha256 is unchanged after the exercise: 96fbe0fa37e023ae… (checked against `$S/patch/context-audit.sh.orig`).
