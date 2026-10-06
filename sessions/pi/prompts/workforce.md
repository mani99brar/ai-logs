---
description: Decide the workforce and run plan → research → execute → test
argument-hint: "\"<goal>\" [plan=N] [research=N] [test=N] [exec=N]"
---
You are orchestrating the **workforce workflow** (see `/home/agentops/.pi/agent/workforce/README.md` for the full spec). Pi plans/researches/tests; Claude executes. Pi holds authority; Claude is the only mutator.

The user's arguments: `$ARGUMENTS`

## 0. Parse the spec

- First argument = the goal (may be quoted).
- Remaining tokens are `plan=N`, `research=N`, `test=N`, `exec=N`.
- Defaults: `plan=1 research=1 test=1 exec=1`. `N=0` skips a role.
- If the goal is missing or unparseable, ask the user for it instead of guessing.

Verify you are inside Herdr and Claude is live before the execute phase:
```bash
test "${HERDR_ENV:-}" = 1 && herdr agent list
```
If `claude` is not in the agent list, tell the user and stop before dispatching execution.

Create a run directory for artifacts:
```bash
mkdir -p ".pi/workforce/$(date +%Y%m%d-%H%M%S)"
```
Use that as `$RUN` for output paths below.

## 1. Plan (Pi: planner)

Launch the `planner` subagent once with the goal. It writes `plan.md` at the
repo root. Use `async:false` (you need the plan before continuing).

## 2. Research (Pi: researcher × research)

If `research>0`, launch that many `researcher` subagents in parallel via one
`workflowScript` with `runs.all([...])`. Give each a **distinct research
angle** derived from the goal and plan.md "Open questions" — never clone
identical prompts. Bind each to a distinct output file:
`$RUN/research-<n>.md`.

## 3. Execute (Claude: exec)

Compose one executor prompt from `plan.md` plus the research briefs, then
dispatch to the live `claude` agent:

```bash
herdr agent prompt claude "$(cat plan.md)" --wait --timeout 600000
herdr agent wait claude --until done --timeout 600000
```

Rules:
- `exec=1` is the default and runs the single Claude agent directly.
- `exec>1` requires separate git worktrees (one writer per cwd). If worktrees
  are not already set up, tell the user and run the executors **serially** on
  one worktree each, or ask before creating worktrees.
- If `herdr agent get claude` reports `blocked`, surface the Claude approval
  prompt to the user and do not resend blindly.
- Instruct Claude in the prompt to write back `results.md` (what changed, how
  it was verified, open risks) so the handoff is a file, not chat memory.

## 4. Test (Pi: tester × test)

If `test>0`, launch that many `tester` subagents in parallel via one
`workflowScript` with `runs.all([...])`. Give each a **distinct verification
seam** (e.g. unit tests / typecheck / lint / build / integration) from
plan.md's "Verification" section. Bind each to `$RUN/test-report-<n>.md`.

## 5. Synthesize and arbitrate

Read `plan.md`, `results.md`, and all research/test reports. Report to the user:
- Verdict per acceptance criterion (pass/fail/unverified)
- What Claude changed and how it was verified
- Open risks and the recommended next step
- Any decision only the user can make

Hold final acceptance yourself. Do not mark the work accepted on Claude's
word alone — require the test evidence you collected.

## Safety

- One writer per cwd/worktree: only Claude mutates code. Pi workers
  (planner/researcher/tester) write only their own report files.
- Do not pass a hard `toolBudget` to mutation-capable workers.
- If a subagent launch or `herdr` call fails, stop and report the exact
  failure rather than silently switching to a different execution mode.
