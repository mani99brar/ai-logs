# Workforce workflow (Pi orchestrates, Claude executes)

A repeatable agent workflow where **Pi plans, researches, and tests**, and
**Claude (and its subagents) execute**. Pi is the supervisor and holds
authority; Claude is the single mutator.

## Roles

| Role | Agent | Mutates code? | Output |
|------|-------|---------------|--------|
| plan | `planner` (Pi subagent) | no | `plan.md` |
| research | `researcher` (Pi subagent) | no | research brief |
| execute | `claude` (Herdr agent, `w4:p9`) | **yes** | git diff + `results.md` |
| test | `tester` (Pi subagent) | no | `test-report.md` |
| review (optional) | `reviewer` (Pi subagent) | no | review |

Claude subagents are configured in Claude's own world (`.claude/agents/*.md`).
The `/workforce` command passes the plan + research through the prompt; for
deterministic Claude subagents, pre-author those files instead of re-specifying
roles inline each run.

## The loop

```
plan (planner → plan.md)
  → research (N researchers, parallel, distinct angles)
    → execute (dispatch plan+research to Claude via herdr agent prompt)
      → test (N testers, parallel, distinct seams)
        → parent arbitrates + reports verdict
```

## Handoff contract

The two agent systems share **no memory**; everything crosses the boundary as
files:

- `plan.md` — Pi writes, Claude reads. Authoritative intent.
- research briefs — Pi writes, Claude reads (folded into the dispatch prompt).
- `results.md` — Claude writes back (what changed, how verified, open risks).
- `test-report-*.md` — Pi testers write after execution.

## Workforce spec grammar

```
/workforce "<goal>" [plan=N] [research=N] [test=N] [exec=N]
```

- `plan`, `research`, `test` are **Pi** worker counts; `exec` is **Claude**
  executor count.
- Defaults: `plan=1 research=1 test=1 exec=1`. Use `N=0` to skip a role.
- Example: `/workforce "Fix the flaky login test" plan=1 research=2 test=2 exec=1`

## Limits (read before raising N)

- **Pi workers** are bounded by `globalConcurrencyLimit` and
  `maxSubagentSpawnsPerRun` in settings, plus model cost. Parallel workers need
  **distinct seams** — never clone the same prompt with only an index swapped.
- **Claude executors are the hard constraint.** Parallel mutation requires N
  separate worktrees (one writer per cwd). Without worktrees, `exec>1` must run
  **serially**. The default is one Claude executor.
- Claude can enter a `blocked` (approval) state; the parent must surface that
  to the user rather than blindly resend.

## Artifacts

Per-run artifacts land under `.pi/workforce/<run-id>/` (research and test
reports). `plan.md` lives at the repo root so executors can find it.
