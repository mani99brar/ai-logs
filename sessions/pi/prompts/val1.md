---
description: One vea (TypeScript) task — Claude Code (vea-ts-engineer) writes the code, val1-tester reviews the diff
argument-hint: "\"<task>\""
---
You are orchestrating a single vea task: **Claude Code writes, `val1-tester`
reviews.** You (the parent) hold authority and write no code.

Task: `$ARGUMENTS`

If the task is empty, ask the user for it instead of guessing.

Run everything from the repo root:
`/home/agentops/dev/vea_validators/vea`

## 0. Preflight

```bash
git rev-parse HEAD     # baseline
git status --short
```

If the working tree is **already dirty**, stop and ask the user — the review
step must isolate *this* task's changes, so existing changes must be committed
or stashed first. Do not proceed on a dirty tree.

## 1. Write — val1-writer (Claude Code, visible in the agents panel)

Launch the `val1-writer` subagent — a Claude Code run through pi's external-CLI
runner, so it appears as a tracked agent in the fleet/status panel (Ctrl+Alt+F)
with a live progress tab. External-CLI runners are background-only, so launch it
async and let pi wake you:

```text
subagent({ agent: "val1-writer", async: true, task: "$ARGUMENTS" })
```

Pass the raw task text; `val1-writer`'s own system prompt carries the fixed
write rules (use vea-ts-engineer, no commit, no `.env*`, offline yarn build +
jest + tsc only, no live chain, report format).

Then yield — do **not** `bg_wait` or poll. When val1-writer completes, pi wakes
you; continue.

On completion, check the run result (did it error?) and that files actually
changed (`git status --short`). If val1-writer failed or produced no diff, tell
the user and stop — do not review nothing.

Note: val1-writer's output is stream-json. The clean final report is the
`result` field of the last `{"type":"result", ...}` event. Use `git status
--short` / `git diff --stat` as the authoritative check that a change exists.

## 2. Review — val1-tester (read-only)

Launch the `val1-tester` subagent with `async:false` — you need its verdict
before reporting. Give it this task text:

"Review the uncommitted changes in /home/agentops/dev/vea_validators/vea
for the task: \"$ARGUMENTS\". The changes were produced by the `val1-writer`
agent (Claude Code running the 'vea-ts-engineer' subagent) and are NOT
committed. Review `git diff` (working tree vs HEAD) following your verification
workflow: `yarn workspace @kleros/vea-contracts build` + diff-scoped jest and
`tsc --noEmit` for the touched package (offline only, no live chain), the
TypeScript/ethers code-review posture, protocol invariants, the cross-chain
block-integrity pass, and the reference-hygiene check. Return a verdict of
PASS / NEEDS-CHANGES / FAIL plus findings (P0/P1/P2 with file:line)."

## 3. Report and arbitrate

Report to the user, concisely:

- The val1-tester **verdict** and top findings (P0/P1 first).
- What Claude changed (`git diff --stat`) and which commands passed/failed.
- **Do not commit.** Wait for the user: if PASS they may commit; if
  NEEDS-CHANGES/FAIL, offer to loop the findings back to Claude for a fix.

If the verdict is FAIL or NEEDS-CHANGES, offer the fix loop: re-run Claude with
the val1-tester findings appended to the prompt, then re-run val1-tester. Do not
start that loop without the user's go-ahead.

## Safety

- Only Claude Code (via `val1-writer`) mutates code. `val1-tester` and you are
  read-only here.
- Never widen `val1-writer`'s tool/args; the agent's fixed args already enforce
  `--permission-mode acceptEdits`, the `--allowed-tools` list, and no
  `--dangerously-skip-permissions`. Do not edit them without a reason.
- No live chain, ever: `yarn start` / `yarn start-relayer` and any
  claim/challenge/saveSnapshot/relay against a real network are forbidden in
  this flow.
