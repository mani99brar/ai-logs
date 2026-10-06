# Five implementations of the MD Manager brief, scored the same way

Evaluated 2026-10-05, 09:05–09:16 UTC. Every number below comes from a command output or a transcript file that is named next to it.

## Course pages this satisfies (quoted from roadmap.txt)

- **PDF p.8, "Practice for day 1", "Setup and rediscovery":** "Run two short attempts in separate repository copies and fresh sessions, from the same commit with the same model and effort: your genuine previous prompting approach, and an outcome brief with relevant context and acceptance checks." Also: "Record interventions, accepted behavior, review time and usage. This experiment tests the whole prompt strategy on one task; it is not causal proof about every individual instruction."
- **PDF p.8, "Build and compare":** "For the second-provider comparison, use a separate repository copy and fresh session with the same starting commit and brief. [...] Changing model and harness confounds their effects, so label this a setup comparison. Record unique mistakes, shared misses and reviewer findings".
- **PDF p.14, "Measure whether it helped":** "Within the 60-minute comparison, first compare the same capable model at two effort levels on a bounded task. [...] compare accepted quality, complexity, review time and usage. Do not assume maximum effort wins".
- **PDF p.4, "Keep a small evidence log":** "Log the starting commit, acceptance criteria, model/harness/effort, prompt/skills/workers, elapsed and intervention time, quota consumed, executed checks and rework."

## The five implementations (all start from commit `21db6f7`)

| # | Name | Commit | Harness / model / effort | Prompt | Session evidence |
|---|---|---|---|---|---|
| 1 | attempt-a | `162d695` (branch `attempt-a`) | Pi, `openai-codex` `gpt-6-astra`, thinkingLevel `medium` | The user's old one-line prompt: "I am building an md manager webapp to manage all the agent md files including subagents, workflows and skills. Lets start with finding, listing the files with directories. ONly use files present in this repo . Keep the UI minimal and UX friendly" | `~/.pi/agent/sessions/--home-agentops-dev-md-manager-a--/2026-09-18T16-31-45-971Z_01a0b55c-….jsonl` |
| 2 | attempt-b | `4ab655e` (branch `attempt-b`) | Pi, `openai-codex` `gpt-6-astra`, thinkingLevel `medium` | Outcome brief (`../bench/brief.txt`, 2050 bytes) | `~/.pi/agent/sessions/--home-agentops-dev-md-manager-b--/2026-09-19T06-02-44-624Z_01a0b842-….jsonl` |
| 3 | attempt-c | `87d43a4` (branch `attempt-c`) | Claude Code 2.1.272 (interactive CLI), `claude-fable-5-1`, effort **`high`** (82 of 82 assistant rows) | Same brief | `~/.claude/projects/-home-agentops-dev-md-manager-c/06d06f6c-9acf-405f-a86a-2c47a857c2c1.jsonl` |
| 4 | opus55-medium | `15065cb` (scratch clone) | Claude Code 2.1.289 `-p`, `claude-opus-5-5`, effort `medium`, Fable 5.1 advisor | Same brief | `../bench/RESULT.md`, `../bench/opus55-medium-result.json` |
| 5 | opus55-xhigh | `019b4a9` (scratch clone) | Claude Code 2.1.289 `-p`, `claude-opus-5-5`, effort `xhigh`, Fable 5.1 advisor | Same brief | `../bench/RESULT.md`, `../bench/opus55-xhigh-result.json` |

`git merge-base HEAD 21db6f7` = `21db6f7` and exactly 1 commit since the base, for all five (in `eval-<name>.out`).

## Method

1. **Rubric fixed before the first run** (in `score.mjs`). The scorer is my own script, outside every implementation's write access. Each clone loads it with its own `@playwright/test` 1.63.0, and every implementation gets the same checks:
   - **Items 1–3** come from the rendered `tbody tr` rows after a normal page load.
     - *Strong match:* a row has a cell equal to the source-relative path, such as `skills/review.md`, and a cell equal to the source name (`Pi` or `Claude`).
     - *Weak match:* a row shows the base name, and its directory text contains `fixtures/<source>/…`.
     - Item 2 passes only on two strong matches in different rows. Two weak matches score *partial*.
   - **Item 4** uses `page.route('**/api/files')` to put the page into each state:
     - *loading:* the request is held for 4 s;
     - *empty:* the API returns `200 {"files":[]}`;
     - *error:* the API returns 500, or the connection is refused.

     Separately, I start Vite with **no backend process at all**, so the dev proxy returns a real 502. A state counts only if the page actually requested the API and a visible message matched: `/loading/`, `/no (markdown )?files|no .*found/`, or `/could not|couldn.t|unable|failed|error/`. I record each error message's exact wording so a reader can judge for themselves whether it tells the user what to do next.
   - **Item 5:** `npm run build` exits 0, `npm run dev` serves `/` with 200, and the API answers 200 where the implementation has one. attempt-a has no API; the brief's Fastify requirement is scored in the Scope column instead. Where the project defines `npm start`, I also ran a production-style start.
   - **Item 6:** the implementation's own suites (`npm test`, `npm run test:e2e`), re-run today. I record how many tests each declares, and how many ran in the original session.
   - **Item 7:** sha256 of all 6 fixture files before and after everything, `git diff --quiet 21db6f7 HEAD -- fixtures`, and `git status --porcelain -- fixtures`.
2. **Per-clone runner, `eval_one.sh`.** I ran the clones one at a time, in order a, b, c, medium, xhigh. For each one the runner:
   - clones with `git clone --local --branch …` into `bench-eval/<name>` and runs `git remote remove origin`;
   - runs `npm ci`, then build, lint and the implementation's own tests;
   - starts the dev server, probes the API, and runs the scorer;
   - runs the Vite-only backend-down check;
   - runs a production start, or `vite preview` where there is no `start` script;
   - checks the fixtures;
   - scans for leftover processes.

   It checks that ports 3001, 5173 and 3100 are free before it starts anything. It stops servers by their own process group (`setsid`) and never by port, because the attack-pass-003 workflow was live on 44299 and 46131, and the main checkout on 3090 and 5190. After every clone, the ports were free and no processes were left over.
3. **Agent time and cost come from the original sessions.**
   - Pi: first task prompt to final reply. Cost is the sum of `usage.cost.total` over the task's assistant messages.
   - attempt-c: transcript timestamps.
   - Opus arms: `../bench/*-timing.json` and `*-result.json`.

## Comparison table

Key: P = pass, F = fail, ½ = partial.

| Impl | 1. five fixtures (nested + empty) | 2. two workflow.md by source + rel. path | 3. notes.txt excluded | 4. loading / empty / error states | 5. app starts + build | 6. executed behaviour checks | 7. fixtures unchanged | Score | Brief scope (listing only, Fastify) | Tests: declared, run in orig. session → re-run today | Build today | Diff vs 21db6f7 (all / excl. lockfile) | Agent time | Cost (list-price est.) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| attempt-a | **P**: all 5 rows present, plus 1 extra row `README.md` at `/ (root)` | **½**: told apart only by repo directory `fixtures/claude/` vs `fixtures/pi/`; no source field, and paths are not source-relative | **P** | **F**: 0 API requests, because the files are bundled at build time by `import.meta.glob`. No loading or error state exists. The only empty state is the filter result "No files found" | **P**: build exit 0 (10.3 s); `vite` dev 200; preview 200. No backend | **F**: 0 tests in the repo. The session ran build, lint and one ad-hoc SSR assertion (16:45:54) that it did not save | **P** | **4 P, 1 ½, 2 F** | **No**: adds Markdown preview and rendering, search, type and directory filters, sorting and copy-path. No Fastify; build-time discovery | 0; build, lint and 1 ad-hoc check → 0 | rc 0 | 4 files, +95/−410 (same without lockfile). App TSX is 96 lines but 11,781 non-whitespace characters | 7m02s (421.8 s) | $1.158 (Pi estimate); 362,534 tokens |
| attempt-b | **P** (5 rows; API returns the same 5) | **P**: `Pi workflow.md` / `Claude workflow.md` | **P** | **P**: "Loading Markdown files…" / "No Markdown files found in the Pi or Claude fixture folders." / "Unable to load Markdown files. Check that the API is running and both fixture folders are readable, then reload the page." (shown for 500, refused connection and real 502) | **P**: build 0 (7.8 s); dev API 200 and UI 200. No production `start` script | **P**: 2 `node:test` + 4 Playwright | **P** | **7/7** | Yes (also rewrote README) | 6; 2 ran (Playwright blocked: missing `libatk-1.0.so.0`) → **6/6 pass** | rc 0 | 13 files, +251/−468 (same) | 3m58s (237.8 s) | $0.845 (Pi estimate); 389,918 tokens |
| attempt-c | **P** | **P** | **P** | **P**, but weaker error text: "Loading files…" / "No Markdown files found." / "Could not load files: Server responded with 500" and "…502" / "Could not load files: Failed to fetch". No next step. The server has no 500 handler of its own | **P**: build 0 (9.4 s); dev 200/200; `npm start` serves dist + API (200/200) | **P**: 4 vitest discovery tests + 5 UI-state tests in happy-dom | **P** | **7/7** | Yes (deleted unused template assets, added happy-dom) | 9; 9 ran → **9/9** | rc 0 | 16 files, +479/−357; 15 files, +384/−357 without lockfile | 6m03s from the re-issued prompt (362.6 s); 6m53s from the first, interrupted prompt | $4.66 = **whole session** 06:07–06:23, including commit/push and 4 Q&A turns (see note) |
| opus55-medium | **P** | **P** | **P** | **P**: "Loading Markdown files…" / "No Markdown files found in the Pi or Claude folders." / "Could not load Markdown files: the server could not be reached. Is the backend running?" plus a **Try again** button | **P**: build 0 (8.0 s); dev 200/200; `npm start` 200/200 | **P**: 4 vitest API + 5 Playwright | **P** | **7/7** | Yes (deleted template assets) | 9; 9 ran → **9/9** | rc 0 | 19 files, +420/−393 (same) | 387.0 s | $2.034 (Opus $0.802 + Fable advisor $1.232) |
| opus55-xhigh | **P** (also `sizeBytes`) | **P** | **P** | **P**: "Loading Markdown files…" / "No Markdown files found in the Pi or Claude folders." / "Couldn’t load the file list. The server responded with HTTP 502. Check that the API server is running." plus a **Try again** button | **P**: build 0 (12.4 s); dev 200/200; `npm start` 200/200 | **P**: 10 vitest + 7 Playwright | **P** | **7/7** | Mostly. Extras outside the brief: Size column, `.markdown` extension, README rewrite, deleted `public/icons.svg`, `shared/api.ts` | 17; 17 ran → **17/17** | rc 0 | 25 files, +743/−430 (same) | 838.9 s | $3.592 (Opus $1.841 + Fable advisor $1.751) |

Lint (`npm run lint`) exited 0 for all five. The build times above are from today's machine, which was shared with the live attack-pass-003 workflow. They are not the agents' build times.

**Code size, non-test app TS/TSX** (`server/`, `src/`, `shared/`, without `main.tsx`):

| Impl | Lines | Non-whitespace chars |
|---|---|---|
| a | 96 | 11,781 |
| b | 106 | 3,034 |
| c | 157 | 3,253 |
| medium | 212 | 4,446 |
| xhigh | 309 | 6,856 |

**Test lines added:**

| a | b | c | medium | xhigh |
|---|---|---|---|---|
| 0 | 90 | 153 | 117 | 264 |

**Interventions during the build:**

| a | b | c | medium | xhigh |
|---|---|---|---|---|
| 0 | 0 | 1 | 0 | 0 |

The one intervention on attempt-c happened before any work started: the user interrupted the first prompt, ran `/model` twice (Opus 5, then Fable 5.1) and re-issued the brief.

**Note on attempt-c cost.** $4.66 is the session total from `gaps/ops/claude_cost_rows.json`: Fable $4.599, Sonnet 5 $0.061 and Haiku $0.001, covering 06:07:12–06:23:35. I did not re-derive it. The build-task window (06:07:12–06:14:05) holds:

| Measure | Build-task window | Session total | Share |
|---|---|---|---|
| Fable calls | 31 | 42 | 74% |
| Output tokens | 21,966 | 29,416 | 75% |
| Cache reads | 2,245,731 | 3,337,887 | 67% |
| Cache writes | 94,865 | 102,149 | 93% |

So the task alone cost less than $4.66, by an amount I did not pin down: my own re-pricing did not reproduce the $4.60 Fable total, so I report shares rather than a task-only dollar figure.

**Pi costs** are Pi's list-price estimates for gpt-6-astra tokens. The runs used the ChatGPT subscription (`openai-codex` provider). **Claude costs** are the CLI's list-price-equivalent figures (`costBasis: "list"`). Neither number is a subscription charge.

## Evidence files

All paths are under `/tmp/claude-1000/-home-agentops-dev/ade0e1ee-cfaf-469b-985e-ae9aaff165a8/scratchpad/gaps/bench-eval/`.

| What | Path |
|---|---|
| Runner transcript per implementation | `eval-<name>.out` |
| Rubric and scorer | `score.mjs`, `eval_one.sh` |
| Scorer output: rows, state texts, ARIA roles, API request counts | `shots/<name>-full.json`, `shots/<name>-backend-down.json`, `shots/<name>-prod-full.json` |
| Screenshots | `shots/<name>-{normal,loading,empty,http500,network-abort,backend-down}.png` |
| attempt-a filter-empty screenshot | `shots/attempt-a-filter-empty.png` |
| All four API arms × five states | `shots/contact-sheet.png` |
| Logs | `logs/<name>-{npm-ci,build,lint,test,test:e2e,dev,vite-only,start,preview}.log` |
| API bodies | `logs/<name>-api-direct.json`, `logs/<name>-api-proxy.json` |
| Fixture hashes before and after | `logs/<name>-fixtures-{before,after}.sha256` |
| Per-file diff stats | `logs/<name>-numstat.txt` |
| Clones (origin removed; never pushed) | `attempt-a/`, `attempt-b/`, `attempt-c/`, `opus55-medium/`, `opus55-xhigh/` |

## Findings

### (a) Day 1 rediscovery: attempt-a (old prompt) vs attempt-b (outcome brief)

Both runs used the same harness (Pi), model (gpt-6-astra), effort (thinkingLevel medium) and commit (21db6f7), in fresh sessions with 0 interventions.

**Acceptance results:**
- **The brief run met all 7 acceptance items.** Its 6 tests all pass when re-run today; 4 of them are Playwright tests it wrote but could not run on 19 Sep because `libatk-1.0.so.0` was missing.
- **The old-prompt run fully met 4 items:** the fixtures are listed, `notes.txt` is excluded, the app builds and starts, and the fixtures are unchanged.
- **It partly met 1 item.** The two `workflow.md` files can be told apart only by repo directory; there is no source label.
- **It failed 2 items:**
  - It has no loading or error state, because the files are bundled at build time.
  - It committed 0 tests.

**Scope and backend.** It also listed `README.md` from outside the fixture folders, built no Fastify backend, and added a Markdown preview with rendering, search, filters and sorting. The brief rules all of these out.

**Time and cost.** The brief run took 0.56× the time (237.8 s vs 421.8 s), 0.73× Pi's cost estimate ($0.845 vs $1.158) and 0.40× the output tokens (4,401 vs 11,002).

**Limits.** attempt-a was never given these acceptance criteria; that gap is exactly what the comparison measures. Its result is faithful to its own prompt ("only use files present in this repo", "UX friendly"). This is one run per arm on one task. As p.8 says, it tests the whole prompt strategy and is not causal proof about any single instruction.

### (b) Day 1 second provider: attempt-b (Pi + gpt-6-astra medium) vs attempt-c (Claude Code + Fable 5.1 high)

Both runs got the same brief and started from the same commit, in separate worktrees. **This is a setup comparison:** the model, harness, effort (medium vs high) and interactivity all changed together.

**Shared result.** Both met 7/7 items under the same scorer, and neither has any shared miss.

**Where they differ:**
- **Error message.** attempt-b's error text tells the user what to check and to reload. attempt-c shows only "Could not load files: Server responded with 502", and its server has no 500 handler of its own.
- **Tests.**
  - attempt-b wrote real-browser Playwright tests that could not run that day.
  - attempt-c tested the UI states in happy-dom, which did run (9/9). One of its tests leaves a temp folder behind: `/tmp/md-manager-7Jcino` was created by my re-run.
- **Production start.** attempt-c added one (`npm start` serves the build), and attempt-b did not.

**Time and cost.** attempt-c took 1.52× the time (362.6 s vs 237.8 s, from the re-issued prompt) and needed 1 intervention (the model switch). Its session total was $4.66, of which the task was 67–93% depending on the token class (the task-window shares above), against $0.845 estimated for attempt-b.

**Contamination check.** The two ran at the same time on one machine: b from 06:06:48 to 06:10:46, c from 06:08:02 to 06:14:05. At 06:10:36, attempt-c hit `EADDRINUSE 127.0.0.1:3001` and moved to API_PORT 3101/3102. Its tool inputs never reference the `md-manager-a` or `md-manager-b` worktrees, and its project folder has no memory file.

### (c) Day 4 effort: Opus 5.5 medium vs xhigh

Both arms used the same brief, commit, harness flags and advisor configuration, ran non-interactively, and had 0 interventions.

**Acceptance.** Both met 7/7 under the independent scorer, all of their own tests pass (9/9 and 17/17), and both have a retry button and next-step error text. On this bounded slice, **xhigh bought no acceptance difference.**

**What xhigh cost, relative to medium:**

| Measure | Ratio | medium | xhigh |
|---|---|---|---|
| Wall time | 2.17× | 387.0 s | 838.9 s |
| List-price cost | 1.77× | $2.034 | $3.592 |
| App code, lines | 1.46× | 212 | 309 |
| App code, non-whitespace chars | 1.54× | 4,446 | 6,856 |
| Tests | 1.89× | 9 | 17 |
| Files changed | 1.32× | 19 | 25 |

**What it added.** It added more defensive tests: symbolic links, uppercase extensions and a missing folder. It also added features that were not asked for: a Size column, `.markdown` support and a rewritten README. This supports the p.14 overengineering hypothesis for this one sample, but it is a single run per arm.

**Advisor share of cost.** The Fable advisor accounts for 61% of medium's cost and 49% of xhigh's.

## Confounds and limits

- There is **one run per arm**. The ratios above are observations, not effect sizes.
- **"Understandable" is judged by my regex rubric plus the recorded wording.** A reader may grade attempt-c's error message lower than I did. I scored it as a pass and noted that it gives no next step.
- **attempt-a is scored against a brief it never saw.** That is the purpose of the Day 1 comparison, but it means attempt-a's failures are failures to meet the outcome, not bugs in what it set out to build.
- **Pi effort setting.** In both Pi sessions, `thinking_level_change: medium` was logged while the model was still `claude-opus-4-8`, before the switch to `gpt-6-astra` (16:31:47 → 16:32:05 in a; 06:02:46 → 06:05:59 in b). The sequence is the same in both, so the two runs had the same effort by construction. Reasoning tokens were 449 (a) and 85 (b).
- **Dates.** attempt-a's build session ran on 18 Sep, 16:39–16:46 UTC. The commit is dated 19 Sep 06:00.
- **attempt-c ran at effort `high`, not medium**, and its session started with an interrupted Sonnet 5 call. 2 of its 82 assistant rows are `claude-sonnet-5`, both at 06:07:13–14, before the re-issued brief.
- **Review time.** I did not measure human review time. The scorer adds no human time; this evaluation took about 11 minutes of wall time for all five.
- **Files left in /tmp.** My re-runs of the implementations' own tests left these in `/tmp`. I recorded them and did not delete them:
  - `/tmp/md-manager-7Jcino`, from attempt-c's empty-folder test;
  - Vite/vitest temp folders `/tmp/ggBwDPlFF-omOJuhd1PhD`, `/tmp/b2RJ19EijzEZ1l3eza3e0` and `/tmp/31nU6WfKwl0qi10G6A-a0`. Their timestamps match the c, medium and xhigh test runs.
- **Nothing was modified in the user's repositories, sessions or services.**
  - `/home/agentops/dev/md-manager` is only read and cloned; its `attempt-a`, `attempt-b` and `attempt-c` refs are unchanged (`162d695`, `4ab655e`, `87d43a4`).
  - Nothing was pushed, and no process outside my own process groups was signalled.
  - No secrets were read or printed. One transcript tool result happened to contain a VS Code server command line, and it is not reproduced here.

## Commands run (in order)

1. **Orientation.** I read `roadmap.txt` pp. 4, 8 and 14, and extracted these with Python, without modifying anything:
   - prompts, models, thinking levels, timestamps and `usage` from the two Pi sessions;
   - model, effort, timestamps and `usage` from the attempt-c Claude transcript.
2. **Scorer and runner.** I wrote `score.mjs` and `eval_one.sh`, with the rubric fixed before any run.
3. **One run per implementation**, sequentially:
   - `./eval_one.sh attempt-a /home/agentops/dev/md-manager attempt-a 162d695` (09:05:38–09:07:07);
   - the same for attempt-b (09:07:18–09:08:29) and attempt-c (09:08:41–09:09:50);
   - `./eval_one.sh opus55-medium ../bench/opus55-medium bench-opus55-medium 15065cb` (09:09:56–09:11:23);
   - `./eval_one.sh opus55-xhigh ../bench/opus55-xhigh bench-opus55-xhigh 019b4a9` (09:11:28–09:13:18).
4. **attempt-a filter-empty check.** `node attempt-a-filter-empty.mjs` against its dev server. The result was 0 rows and "No files found Try a different name, directory, or file type. Clear all filters".
5. **Contact sheet.** `node montage.mjs`, which writes `shots/contact-sheet.png`.
