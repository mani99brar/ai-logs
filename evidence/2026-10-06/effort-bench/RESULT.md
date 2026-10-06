# Day 4 effort comparison: claude-opus-5-5 at medium vs xhigh

## Course requirement being satisfied

PDF p.14, "Practice for day 4", heading "Measure whether it helped" (roadmap.txt line 863):

> "Within the 60-minute comparison, first compare the same capable model at two effort levels on a bounded task."
> "Treat routing and overengineering concerns as hypotheses: compare accepted quality, complexity, review time and usage. Do not assume maximum effort wins, or that lower effort harms audits."

PDF p.4, "Keep a small evidence log":

> "Log the starting commit, acceptance criteria, model/harness/effort, prompt/skills/workers, elapsed and intervention time, quota consumed, executed checks and rework."

## Setup (the same for both arms)

| Field | Value |
|---|---|
| Starting commit | `21db6f7` (`21db6f745e095f843a16bcef4c96e54fdd53995a`, "chore: add sample files") of `/home/agentops/dev/md-manager` |
| Working copy | `git clone --local` into the scratch folder, then `checkout -b bench-<arm> 21db6f7`. `git remote remove origin` was run before the agent started, so the arm could not push to the user's repo. |
| Prompt | `brief.txt`: the first user message of Pi session `/home/agentops/.pi/agent/sessions/--home-agentops-dev-md-manager-b--/2026-09-19T06-02-44-624Z_01a0b842-8e0f-75bf-952a-347c76fe4f04.jsonl` (JSONL line 5, `message.content[0].text`), copied byte for byte. 2050 bytes, sha256 `c4f3533fbae0d239afdcdb2a153751f3f8dc704b9f071ccbf5506bc483ab0ed6`. |
| Acceptance criteria | From the brief: all five `.md` fixtures listed, including the nested files and the empty file; the two `workflow.md` files can be told apart by source and relative path; `notes.txt` is excluded; loading, empty and error states are understandable; the app starts and the build passes; executed checks show the listing works and the fixtures are unchanged. |
| Harness | Claude Code 2.1.289, one non-interactive `claude -p` run per arm |
| Model | `claude-opus-5-5` |
| Effort | Arm 1 `--effort medium`, arm 2 `--effort xhigh`. **Checked in each session transcript:** every assistant message has `"effort":"medium"` (53 of 53) or `"effort":"xhigh"` (100 of 100), and `"model":"claude-opus-5-5"`. |
| Skills/workers | No skills. `subagent_stats.spawned = 0` in both arms. Both arms called the `advisor` tool twice, which is backed by `claude-fable-5-1` (see Confounds). |
| Permissions | `--permission-mode acceptEdits --allowedTools Bash Read Edit Write Glob Grep`. `permission_denials` was `[]` in both arms. |
| Auth | Subscription. No API key was set. `DISABLE_AUTOUPDATER=1`. |
| Dependencies | `npm ci --no-audit --no-fund` was run in each clone before the timer started, because the brief says the frontend already starts. It is not counted in the arm's time: 29.4 s for medium and 42.2 s for xhigh, both exit code 0. |
| Order | Run one after the other, medium then xhigh. Ports 3001 and 5173 were free before each arm. |
| Intervention time | 0 for both arms. The runs were non-interactive and nobody stepped in. |

Exact launch command (from `run_arm.sh`), run inside the clone:

```
env -u CLAUDECODE -u CLAUDE_EFFORT -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_SESSION_ID \
    -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_PID -u CLAUDE_CODE_SESSION_ATTENDED \
    -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_EXECPATH \
    -u HERDR_ENV -u HERDR_SOCKET_PATH -u HERDR_PANE_ID -u HERDR_TAB_ID -u HERDR_WORKSPACE_ID -u HERDR_BIN_PATH \
    DISABLE_AUTOUPDATER=1 \
    timeout -k 30 2400 claude -p "$(cat brief.txt)" --model claude-opus-5-5 --effort <level> \
      --output-format json --permission-mode acceptEdits \
      --allowedTools "Bash" "Read" "Edit" "Write" "Glob" "Grep" > <arm>-result.json
```

The `env -u` list clears environment variables inherited from the parent Claude Code session. Without it, `CLAUDE_EFFORT=xhigh` from the parent could have overridden the medium arm, the child could have run as a nested sub-session, and the herdr SessionStart hook in `~/.claude/hooks/herdr-agent-state.sh` would have reported to the parent's herdr pane. Only the variable names are listed here, not their values.

## Results

| Measure | opus55-medium | opus55-xhigh | xhigh / medium |
|---|---|---|---|
| Wall time, measured by the runner | 387.0 s | 838.9 s | 2.17x |
| `duration_ms` | 381,901 | 832,677 | 2.18x |
| `duration_api_ms` | 247,895 | 509,286 | 2.05x |
| `num_turns` | 26 | 45 | 1.73x |
| `is_error` / subtype / timeout exit | false / success / 0 | false / success / 0 | |
| `total_cost_usd` (list-price equivalent; `costBasis: "list"`) | 2.0338636 | 3.59232 | 1.77x |
| Opus 5.5 part of the cost | 0.8022 | 1.8412 | 2.30x |
| Fable 5.1 (advisor) part of the cost | 1.2317 (60.6%) | 1.7511 (48.7%) | 1.42x |
| Opus output tokens (of which thinking) | 15,841 (2,319) | 41,802 (17,842) | 2.64x (7.69x) |
| Opus cache read / cache create tokens | 700,513 / 44,356 | 1,770,785 / 86,029 | |
| Fable input / output tokens | 87,046 / 7,224 | 131,513 / 8,720 | |
| Tool calls in the transcript | Bash 12, Write 11, Edit 2, advisor 2 | Bash 20, Write 14, Edit 6, Read 3, Grep 1, advisor 2 | |
| Commit in the scratch clone | `15065cbdbb85c2f13ec84b74bfebd376accf8ad8` | `019b4a9053a11894aa30f69ba4b6239be42a5fd1` | |
| `git diff --stat 21db6f7..HEAD` | 19 files changed, 420 insertions(+), 393 deletions(-) | 25 files changed, 743 insertions(+), 430 deletions(-) | |
| Non-test app code (`server/`, `src/`, `shared/` .ts/.tsx, total lines) | 222 | 319 | 1.44x |
| Test lines added | 129 | 284 | 2.20x |
| Tests the agent wrote | 4 API (vitest) + 5 browser (Playwright) | 10 server (vitest) + 7 browser (Playwright) | |
| Session id | `411cea62-6bea-43ad-9691-57fd0b35dea1` | `22f9640d-819c-4c20-96ef-b3f728f34776` | |

Cost is the CLI's list-price figure. It is not a subscription charge, and how much of the plan quota each run used is not available from the CLI.

### My own checks after each arm (`check_arm.sh`, run after the commit, one arm at a time)

| Check | medium | xhigh |
|---|---|---|
| `npm run build` | exit 0 (13.9 s) | exit 0 (15.3 s) |
| `npm run lint` | exit 0 | exit 0 |
| `npm test` | exit 0: 1 file, 4/4 passed | exit 0: 2 files, 10/10 passed |
| `npm start`, then GET `127.0.0.1:3001/api/files` | HTTP 200, 5 items | HTTP 200, 5 items |
| GET `/` on 3001 | 200 | 200 |
| Items returned | pi `skills/review.md`, pi `workflow.md`, claude `empty.md`, claude `subagents/implementer.md`, claude `workflow.md` | same five, plus `sizeBytes` |
| `notes.txt` present | no | no |
| `npm run test:e2e` | exit 0, 5 passed | exit 0, 7 passed |
| Fixtures unchanged (`git diff 21db6f7 HEAD -- fixtures` and the working tree) | yes | yes |
| Processes left running in the clone, or new listening ports | none | none (see note) |

Both arms met every acceptance criterion in their own reports. My own checks covered:
- the listing and the `notes.txt` exclusion (API probe);
- the build;
- startup;
- the fixtures being unchanged.

The criterion that loading, empty and error states are understandable rests only on each arm's own Playwright suite. I re-ran those suites and they passed, but I did not write a separate UI check of my own. Neither arm needed rework. This run did not measure how long a human would take to review each result.

Each arm's final summary is saved word for word in `opus55-medium-final-result.md` and `opus55-xhigh-final-result.md`, and also appears as the `result` field of `<arm>-result.json`.

## Findings

1. **xhigh cost more and did not get a better pass rate.** On this bounded slice, xhigh took 2.17x the wall time, 1.73x the turns and 1.77x the total cost; counting only the Opus part, it cost 2.30x. It produced 7.69x the thinking tokens. Both arms passed every acceptance criterion and every check I ran.
2. **xhigh did more testing and also more work outside the scope.** xhigh wrote more tests: 10 server tests covering symbolic links, uppercase extensions and a missing folder, and 7 browser tests. It also checked its work with screenshots. Against the brief's "Keep the interface minimal" and "Implement listing only", it added things nobody asked for:
   - a Size column;
   - support for `.markdown` files;
   - a rewritten `README.md`;
   - deletion of `public/icons.svg`;
   - a `shared/api.ts` types module.

   It reported all of these as additions outside the scope. The result is 1.44x more app code and a 25-file diff, against 19 files for medium. This supports the p.14 overengineering hypothesis on this one sample, but it does not prove it.
3. **medium was smaller but still complete.** medium wrote a two-column table with loading, empty, error and retry states, and covered the acceptance criteria with 4 API tests and 5 browser tests. It noted its own limits: the dev proxy port is fixed at 3001, `public/icons.svg` was left unused, and the README is still the template.
4. **How each arm stopped its servers.** medium stopped its servers by killing whatever held ports 5173 and 3001 (`killport` via `ss`). That kills any process on those ports, not only its own. It caused no harm here, because only its own servers held those ports. xhigh tracked its servers' process groups and confirmed each command line matched its clone before killing.
5. **Files written outside the clone.** Both arms wrote logs outside their clone: medium wrote `/tmp/mdm-*.log`, and xhigh wrote `/tmp/claude-1000/{api-smoke.log,fixtures-*.sha256,mdm-logs/}`. All of them have timestamps inside the arm's run window, and I moved them into `arm-side-files/<arm>/`. I scanned every tool input in both transcripts. Neither arm named `~/.claude`, `~/.pi` or `/home/agentops/dev`, and neither ran `git commit` or `git push`. The only home-folder path either arm used was `ls ~/.cache/ms-playwright`, which both ran to check the browser cache.

## Confounds and limits

- **One run per arm.** A single run is not enough to separate effort from run-to-run variation, so the ratios above are not effect sizes.
- **The advisor tool is part of both arms.** The user's `~/.claude/settings.json` sets `advisorModel: fable`, so each child session had the advisor tool, and both called it twice. That is 49–61% of the reported cost. I left the setting as it was so both arms had the same configuration. A comparison without the advisor would need a settings override; I did not edit the user's settings.
- **The user's settings default this model to xhigh.** `~/.claude/settings.json` has `modelSettings.claude-opus-5-5.effortLevel = xhigh`. The `--effort` flag overrode it, and the transcripts confirm that, as shown above.
- **Another workflow ran at the same time.** The attack-pass-003 workflow was running throughout, with Vite and node processes under `/home/agentops/.local/state/md-manager-workflows/attack-pass/attack-pass-003/...`. It opened 127.0.0.1:44299 and 46131 during the xhigh arm. Those are its ports, not the arm's, and I left them alone. The extra machine load may have slowed both arms by different amounts.
- **Where the transcripts are.** Running `claude` from the scratch folder writes its transcript to `~/.claude/projects/-tmp-claude-1000--home-agentops-dev-ade0e1ee-cfaf-469b-985e-ae9aaff165a8-scratchpad-gaps-bench-opus55-{medium,xhigh}/` and creates temp folders `/tmp/claude-1000/-tmp-claude-1000--...-opus55-{medium,xhigh}`. Each project folder also has an empty `memory/` subfolder; neither child wrote a memory file. The CLI does all of this itself, so it cannot be avoided without moving the credentials, which I did not do.
- **No push, no source changes.** Nothing was pushed. The source repo `/home/agentops/dev/md-manager` has no `bench-*` branches and shows the same untracked entries as before. I only read it.

## Commands run (in order)

1. Extracted the brief: Python took `json.loads(line 5)['message']['content'][0]['text']` and wrote it to `brief.txt`.
2. `run_arm.sh opus55-medium medium` (clone, checkout, remove origin, npm ci, timed claude run, scan for leftover processes, `git add -A && git commit`, diff stat), from 08:29:35Z to 08:36:36Z.
3. Checked the medium transcript's effort and model fields: medium 53/53.
4. `run_arm.sh opus55-xhigh xhigh`, from 08:36:59Z to 08:51:49Z. Its transcript: xhigh 100/100.
5. `check_arm.sh opus55-medium`, then `check_arm.sh opus55-xhigh`: build, lint, test, production start plus API probe, e2e, fixture check.

## Files in this folder

- `brief.txt`, `run_arm.sh`, `check_arm.sh`
- `opus55-{medium,xhigh}-result.json` (raw CLI JSON), `-final-result.md` (the `result` text, word for word), `-timing.json`, `-stderr.log` (empty), `-npm-ci.log`, `-ports-{before,after}.txt`
- `runner-{medium,xhigh}.log`, `check-opus55-{medium,xhigh}.out`, plus the per-step logs `check-<arm>-*.log` and `check-<arm>-api.txt`
- `opus55-medium/` and `opus55-xhigh/`: the scratch clones on branches `bench-opus55-medium` and `bench-opus55-xhigh`, committed locally, no remote
- `arm-side-files/`: logs the arms wrote outside their clones, moved here
