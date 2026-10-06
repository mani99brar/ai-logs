# Day 3 · One tested skill: workflow-grill trigger test

Course: `roadmap.txt` page 12 ("===== end page 12 ====="), "Practice for day 3 / Create a skill from yesterday's actual work":

> As a small smoke test, try three prompts: one where it should activate, a similar one where it should not, and a
> boundary case with a missing input. Check the loaded context and resulting artifact. Fix an overbroad trigger or
> missing instruction. Three cases do not establish reliability; add representative cases as the skill becomes
> important. Do not merely ask the agent whether its own skill is good.

Date: 2026-10-05. Claude Code 2.1.289. Auth: subscription (`apiKeySource: "none"` in every init event). No API key used.

## Skill under test

- Source: `/home/agentops/dev/md-manager/workflow/skills/workflow-grill/SKILL.md` (committed at md-manager HEAD `8178efb`, sha256 prefix `87f3e8869cd77a2c`, identical in the scratch clones).
- Discovery: user-level symlink `~/.claude/skills/workflow-grill -> /home/agentops/dev/md-manager/workflow/skills/workflow-grill`. md-manager has no `.claude/skills` and no root `CLAUDE.md`. Every init event lists `workflow-grill` in `skills` and `slash_commands`, also in case 2.
- The trigger is the description: "Use when the user runs /workflow-grill <feature>, or asks to grill, interview or settle the decisions of a workflow feature before `python -m workflow launch`."
- Its contract: at most five questions, one per message, each with **Recommended** and **Consequence**. It writes `decisions.md` only after the answers (§3), and never writes code.

## Setup

- Scratch clones: one `git clone --local /home/agentops/dev/md-manager` per run, under `clones/<run-id>`. No worktrees. The real repo is untouched: `git status` still shows only its 3 pre-existing untracked docs entries.
- Runner scripts: `run_case.sh` (batch 1), `run_case_b2.sh` (batch 2), `run_case_b4.sh`/`run_case_b3.sh` (patched skill), `run_case_b5.sh` (regression probe).
- Each run is a fresh session:
  `claude -p "<prompt>" --output-format stream-json --verbose --max-turns N --permission-mode acceptEdits --no-session-persistence`
  - The runs use `env -u` to remove `CLAUDECODE`, the `CLAUDE_CODE_*` messaging and session variables, `CLAUDE_PID`, `CLAUDE_EFFORT` and all `HERDR_*`. The herdr SessionStart hook therefore exits as a no-op, and nothing reaches the parent session or herdr.
  - `DISABLE_AUTOUPDATER=1` is set. `--no-session-persistence` keeps transcripts out of `~/.claude/projects`.
  - `acceptEdits` was chosen so that "did it write files" is a real check, not an automatic deny.
- From batch 2 on, `--disallowedTools` removes PushNotification, SendMessage, RemoteTrigger, Cron*, ScheduleWakeup, Workflow, DesignSync, the worktree tools and every `mcp__claude_ai_Claude_Docs__*` tool. Batch 1 had them available. No stream contains a call to any of them, or to Write or Edit, except the one denied Write in b3 (below).
- `--max-turns`: 12 in batch 1, then 25, because §1 makes the skill read CLAUDE.md, feature.json, the PRD, the tasks and policy.json before Q1.
  - `num_turns` in the result event counts differently from the cap: b2-case1 reports 31 with a cap of 25 and still ended `success`/`end_turn`.
- Case 1 targets `viewer-ux-depth`: feature.json 2.2.0, `prd: docs/PRD_VIEWER_UX.md`, no `decisions.md`, so launch refuses it today.

Prompts (verbatim, files in `prompts/`):

| case | prompt |
|---|---|
| 1 (should activate) | Before I launch the viewer-ux-depth workflow feature, grill me on the decisions that still need settling so we can lock them down first. |
| 2 (similar, should not) | Grill me on the indexing decisions in this SQL query before I merge it: SELECT o.id, o.total, c.email FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'paid' AND o.created_at > now() - interval '30 days' ORDER BY o.total DESC LIMIT 50; |
| 3 (boundary, missing input) | Grill me on the open decisions for the workflow feature before I run python -m workflow launch. |

## Harness finding (batch 1): the Skill tool is denied in headless mode

In batch 1, every Skill call was refused before it ran (`system/permission_denied`, tool_result "Execute skill: workflow-grill", `non_execution_kind: "user-rejected"`). In `-p` there is nobody to approve the permission prompt, and `acceptEdits` does not cover Skill.
- The model then searched for the file, found `workflow/skills/workflow-grill/SKILL.md` in the clone and Read it ("The grill skill didn't load through the Skill tool, so I'm reading its instructions from the repo copy...").
- Activation intent is still visible: the model called Skill with `{"skill":"workflow-grill","args":"viewer-ux-depth"}`. The loaded context, however, came from a manual Read.
- Batch 2 adds `--allowedTools "Skill(workflow-grill)"`. That changes only whether a call executes, not whether the model chooses to call. The skill body then arrives as a user message starting `Base directory for this skill: /home/agentops/.claude/skills/workflow-grill`, ending `ARGUMENTS: viewer-ux-depth` in case 1 and with no ARGUMENTS line in case 3.
- This is not a SKILL.md defect. The skill is meant for interactive `/workflow-grill`, where the operator approves. A headless use would need the permission rule `Skill(workflow-grill)`; I did not add it to any settings file.

## Results per run (all numbers from the `result` events; cost is the CLI's `total_cost_usd` API-equivalent estimate, billed to the subscription)

| run | model | Skill called (args) | skill context | turns | result | cost USD | API ms | wall s | files written (git status) | Q-shape in final |
|---|---|---|---|---|---|---|---|---|---|---|
| case1 | opus-5-5 | yes (viewer-ux-depth), denied | Read of repo SKILL.md | 13 | error_max_turns | 0.7975 | 66448 | 70.3 | none | no question reached |
| case1b | opus-5-5 | yes (viewer-ux-depth), denied | Read of repo SKILL.md | 13 | error_max_turns | 0.6470 | 47544 | 51.9 | none | no question reached |
| case2 | opus-5-5 | no | none | 2 | success | 0.6147 | 71870 | 75.4 | none | n/a (8 SQL questions, 11 "?") |
| case3 | opus-5-5 | yes (no args), denied | Read of repo SKILL.md | 17 | success | 0.4193 | 47957 | 51.9 | none | asks which feature (3 listed) |
| b2-case1 | opus-5-5 | yes (viewer-ux-depth) | loaded from ~/.claude/skills | 31 | success | 2.4988 | 367909 | 372.1 | none | 1 "Question 1 of at most 5", Recommended, Consequence, 1 "?" |
| b2-case1b | opus-5-5 | yes (viewer-ux-depth) | loaded from ~/.claude/skills | 28 | success | 3.2577 | 382624 | 386.6 | none | 1 "Question 1 of at most 5", Recommended, Consequence, 1 "?" |
| b2-case2 | opus-5-5 | no | none | 3 | success | 0.6776 | 118346 | 122.4 | none | n/a (8 SQL questions, 17 "?") |
| b2-case3 | opus-5-5 | yes (no args) | loaded from ~/.claude/skills | 16 | success | 0.7611 | 72899 | 77.0 | none | asks which feature (3 listed) |

Batch 1 total $2.4785 (wall 07:44:01 to 07:45:18 UTC, 4 in parallel). Batch 2 total $7.1953 (4 in parallel, longest 386.6 s).

What the case 1 sessions read (batch 2), as the skill requires:
- the viewer-ux-depth `feature.json`, `README.md`, `depth-task.md` and `policy.json`
- the reviewer briefs (b2-case1)
- `docs/PRD_VIEWER_UX.md`, at offsets 484 and 728 in both runs, plus 902 or 1 and 1033
- code and specs: `src/projects/Assignment.tsx`, plus `ReviewSections.tsx`/`ReviewDetail.tsx` or the playwright specs

Both runs said "No CLAUDE.md, so no critical-paths question". So Q1 played back the scope limits, as §1 orders: B4/B5 out, no marks before review, facts leaving the Assignment tab. It was one question with Recommended, Consequence and Other options. Neither run used AskUserQuestion.

## Grades

| case | expected | observed | grade |
|---|---|---|---|
| 1 activate | skill fires, reads feature files, one question with default + consequence, writes nothing before answers | Skill called 4/4 (2/2 in each batch). With the skill allowed (batch 2), 2/2 asked exactly one "Question 1 of at most 5" with **Recommended** and **Consequence** and wrote nothing. Batch 1 runs hit the 12-turn cap before a question (harness confound, see above) | PASS (consistency 2/2 per batch; 4/4 trigger) |
| 2 do not activate | no Skill call, no SKILL.md read | 0/2 Skill calls, 0/2 SKILL.md reads, no files; answered as a SQL review | PASS (0/2 false activations) |
| 3 missing input | skill fires but does not invent a feature, asks which one, writes nothing | 2/2 activated, 2/2 asked which feature, 0/2 invented a name, 0 files. The skill has no rule for this case, so the model improvised: (a) both runs listed only the 3 dirs whose names contain "workflow" and left out `viewer-ux-depth`, the only 2.2.0 feature launch refuses today; (b) both read 7-9 files first (READMEs, an old decisions.md, `docs/HANDOFF_WORKFLOW_IMPROVEMENTS.md`), 16-17 turns, $0.42/$0.76; (c) b2 nudged "you probably mean `workflow-audit`" | PASS on the contract, missing instruction found |

Trigger verdict: not overbroad on this evidence. "grill" plus "decisions" plus "before I merge" did not fire it. No description change is proposed.

## Fix: missing instruction for an unnamed feature (proposed only, not applied)

Diff: `workflow-grill-missing-feature.diff`, against `workflow/skills/workflow-grill/SKILL.md` at `8178efb`. `git apply --check` passes. Full patched file: `proposed/SKILL.md`. Added bullet in §1:

> - No feature named (no argument, and the request names none): read nothing else yet. List every `<target>/features/*/feature.json` by directory name, with its version and whether the directory holds a non-empty `decisions.md`; mark each 2.2.0 or later feature without one as "launch refuses it until grilled". Do not narrow the list by matching words of the request against directory names. End with one question: which feature. You may recommend one and cite the file that suggests it, but do not read its PRD or tasks, ask an interview question or write anything until the operator names it. This question is not one of the five.

### Fix verification (patched copy loaded as a project skill in a scratch clone, `--setting-sources project,local`)

The stream's `Base directory for this skill:` line confirms the patched copy loaded: `clones/<run>/.claude/skills/workflow-grill`, with the patched text present.

| run | model | turns | cost USD | API ms | Read calls | lists all 8 features | flags viewer-ux-depth | one question | files written |
|---|---|---|---|---|---|---|---|---|---|
| b4-case3 | opus-5-5 (`--model opus`) | 7 | 0.1712 | 18664 | 0 | yes | yes, recommended | yes | none |
| b4-case3b | opus-5-5 (`--model opus`) | 5 | 0.1261 | 13024 | 0 | yes | yes, recommended | yes | none |
| b3-case3 | fable-5-1 (account default once user settings were dropped) | 8 | 0.6660 | 32169 | 0 | yes | yes | yes | Write of `.claude/grill_list.py` attempted, denied as a sensitive path |
| b3-case3b | fable-5-1 | 6 | 0.4512 | 52080 | 0 | yes | yes | yes | none |

On the same model (opus-5-5), the patch moved case 3 from 3 listed features to 8/8 (2/2 runs), from 7-9 Reads to 0, and from $0.42-$0.76 to $0.13-$0.17.
- b3 is a model confound: `--setting-sources project,local` dropped `model: opus` from `~/.claude/settings.json`, so it is kept separate.
- In b3-case3 the fable model tried to Write a helper script after Bash denied a heredoc. That breaks the new "write anything" rule; only the sensitive-path guard stopped it.
- Regression probe b5-case1: patched skill, case 1 prompt, `--max-turns 4`, opus. Skill called with `viewer-ux-depth`, then it read that feature's directory and `CLAUDE.md` and did not take the unnamed-feature path. Result error_max_turns at 5 turns, $0.1218, 10889 ms. Only the first steps were checked.

Patched-skill runs: opus b4 $0.2973 plus the b5 probe $0.1218, so $0.4190; fable b3 $1.1172 (kept separate). All 13 runs: $11.2099 (estimates).

## Caveats

- n is tiny: 2 runs per case, plus 2 patched runs per model. As the page says, three cases do not establish reliability.
- `--max-turns` was raised from the task's example of 4 to 12, then 25. Batch 1 case 1 hit 12 before a question, so a cap of 4 would have measured the cap, not the skill.
- Batch 1's loaded context came from a manual Read, not the Skill tool (headless permission denial). Batch 2 is the clean evidence for case 1 and case 3.
- No init event (13/13) offered `AskUserQuestion`, so every question came as plain text.
- Headless `-p` cannot test the later contract steps: one question per message across turns, the read-back, and writing `decisions.md` after answers. Every run stopped at the first question.
- The patched skill was verified only on case 3, plus a 4-turn case 1 probe. Case 2 was not rerun because the description is unchanged.
- Case 1 cost $2.50-$3.26 and about 6 minutes to reach Q1 (28-31 turns, much of it reading code and specs). That is within the skill's "read the code only as far as a question needs it", but expensive.
