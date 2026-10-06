---
description: One vea-validator2 task — Claude Code (vea-validator-engineer) writes the code, val2-tester reviews the diff
argument-hint: "\"<task>\""
---
You are orchestrating a single vea-validator2 task: **Claude Code writes,
`val2-tester` reviews.** You (the parent) hold authority and write no code.

Task: `$ARGUMENTS`

If the task is empty, ask the user for it instead of guessing.

Run everything from the repo root:
`/home/agentops/dev/vea_validators/vea-validator2`

## 0. Preflight

```bash
git rev-parse HEAD     # baseline
git status --short
```

If the working tree is **already dirty**, stop and ask the user — the review
step must isolate *this* task's changes, so existing changes must be committed
or stashed first. Do not proceed on a dirty tree.

## 1. Write — val2-writer (Claude Code, visible in the agents panel)

Launch the `val2-writer` subagent — a Claude Code run through pi's
external-CLI runner, so it appears as a tracked agent in the fleet/status
panel (Ctrl+Alt+F) with a live progress tab. External-CLI runners are
background-only, so launch it async and let pi wake you:

```text
subagent({ agent: "val2-writer", async: true, task: "$ARGUMENTS" })
```

Pass the raw task text; `val2-writer`'s own system prompt carries the fixed
write rules (use vea-validator-engineer, no commit, no `.env*`, cargo build +
unit tests only, no fmt/clippy, clean-room, report format).

Then yield — do **not** `bg_wait` or poll. When val2-writer completes, pi
wakes you; continue to the next step.

On completion, check the run result (did it error?) and that files actually
changed (`git status --short`). If val2-writer failed or produced no diff,
tell the user and stop — do not review nothing.

Note: val2-writer's output is stream-json. The clean final report is the
`result` field of the last `{"type":"result", ...}` event — extract that for
the user-facing report. Use `git status --short` / `git diff --stat` as the
authoritative check that a change actually exists.

## 2. Review — val2-tester (read-only)

Launch the `val2-tester` subagent with `async:false` — you need its verdict
before reporting. Give it this task text:

"Review the uncommitted changes in /home/agentops/dev/vea_validators/vea-validator2
for the task: \"$ARGUMENTS\". The changes were produced by the `val2-writer`
agent (Claude Code running the 'vea-validator-engineer' subagent) and are NOT
committed. Review `git diff`
(working tree vs HEAD) following your verification workflow: build + diff-scoped
tests only (skip the full devnet integration suite unless the task itself is
about integration/finality behavior), Rust code-review posture, protocol
invariants, and the clean-room check. Treat fmt/clippy failures that already
exist at HEAD as
pre-existing and out of scope; only flag issues introduced by this diff. Return
a verdict of PASS / NEEDS-CHANGES / FAIL plus findings (P0/P1/P2 with file:line)."

## 3. Report and arbitrate

Report to the user, concisely:

- The val2-tester **verdict** and top findings (P0/P1 first).
- What Claude changed (`git diff --stat`) and which commands passed/failed.
- **Do not commit.** Wait for the user: if PASS they may commit; if
  NEEDS-CHANGES/FAIL, offer to loop the findings back to Claude for a fix.

If the verdict is FAIL or NEEDS-CHANGES, offer the fix loop: re-run Claude with
the val2-tester findings appended to the prompt, then re-run val2-tester. Do not
start that loop without the user's go-ahead.

## Safety

- Only Claude Code (via `val2-writer`) mutates code. `val2-tester` and you are
  read-only here.
- Never widen `val2-writer`'s tool/args; the agent's fixed args already enforce
  `--permission-mode acceptEdits`, the `--allowed-tools` list, and no
  `--dangerously-skip-permissions`. Do not edit them without a reason.
- Clean-room: if val2-tester reports a TS-CLI contamination finding, treat it
  as P0, do not loop, and stop for a human decision.
