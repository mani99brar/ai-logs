---
description: Run vea-validator2 tasks from ~/.pi/agent/val2-tasks.md in parallel — one isolated git worktree per task; val2-writer writes (visible in the agents panel), val2-tester reviews
argument-hint: "[--all | --ids 01,03 | --dry-run]"
---
You are the **val2-batch** orchestrator for
`/home/agentops/dev/vea_validators/vea-validator2`. You hold all authority and
you **write no code**. Your job: read the task list, partition it, give each
task its own isolated worktree, run every task's write step as a visible
`val2-writer` agent in parallel, then review with `val2-tester`, then integrate
the lanes that PASS. Never run two writers in one checkout.

## 0. Parse args and preflight

Args: `$ARGUMENTS`.
- `--all` (default): every task in `~/.pi/agent/val2-tasks.md` with `status: todo`.
- `--ids 01,03`: only those task ids (comma list).
- `--dry-run`: print the plan (partition + worktrees + lane table) and stop.
- No args at all: ask the user whether `--all` or specific ids.

Preflight — all must pass, else STOP and report:

```bash
cd /home/agentops/dev/vea_validators/vea-validator2
claude --version
git status --short            # MUST be empty
git worktree list             # MUST show only the main checkout
```

- If `git status --short` is non-empty, the tree has in-flight or uncommitted
  work; worktrees branch from HEAD and would omit it. Stop and ask the user to
  commit or stash first. Do not proceed.
- Record `git rev-parse --short HEAD` as the batch base.

## 1. Read and partition the task list

Read `/home/agentops/.pi/agent/val2-tasks.md`. Each task block is `## [id] title` with `seam:`, `deps:`,
`status:`, and a `description:` body.

Select tasks: `status: todo` (for `--all`) or the `--ids` set.

Build a dependency graph:
- an edge `A → B` if B's `deps:` names A, OR B's `seam` overlaps A's `seam`.
- tasks with **no edge between them** may run in the **same parallel batch**.
- tasks with an edge go in **different sequential groups** (A integrates before
  B starts).

`--dry-run` prints the groups and stops.

## 2. Create worktrees + copy Claude context

One worktree per selected task, branched from the batch base:

```bash
cd /home/agentops/dev/vea_validators/vea-validator2
git worktree add -b lane/<id> ../vea-validator2-lane-<id> master
# val2-writer runs claude inside the worktree; it needs the project subagent
# and CLAUDE.md, which are gitignored and therefore absent from the worktree:
cp -r .claude ../vea-validator2-lane-<id>/
cp CLAUDE.md ../vea-validator2-lane-<id>/
```

Both `.claude/` and `CLAUDE.md` are gitignored, so they do not pollute the
diff. **Do NOT copy `.env.local`** (devnet tests are out of scope for parallel
lanes). Record the lane table:

```
<id> | lane/<id> | /home/agentops/dev/vea_validators/vea-validator2-lane-<id> | seam | deps
```

## 3. Launch the two-stage fanout (ONE async workflowScript)

Stage 1 = one `val2-writer` (write) per task, in parallel. Stage 2 = one
`val2-tester` (review) per task whose write succeeded. Do **not** set
`worktree:true` — the manual worktrees are the isolation. Give every child an
explicit `cwd`:

```js
const tasks = [
  { key: "<id1>", cwd: "/home/agentops/dev/vea_validators/vea-validator2-lane-<id1>", title: "<title1>", desc: "<description1>" },
  { key: "<id2>", cwd: "/home/agentops/dev/vea_validators/vea-validator2-lane-<id2>", title: "<title2>", desc: "<description2>" }
];

const writes = await runs.all(tasks.map((t) => ({
  key: t.key + "-write",
  agent: "val2-writer",
  cwd: t.cwd,
  task: t.desc
})));

const toReview = tasks.filter((_t, i) => writes[i].ok);
const reviews = await runs.all(toReview.map((t) => ({
  key: t.key + "-review",
  agent: "val2-tester",
  cwd: t.cwd,
  task: [
    "Review the uncommitted changes in " + t.cwd + " for the task: \"" + t.title + "\".",
    "The changes were produced by the val2-writer agent (Claude Code, vea-validator-engineer) and are NOT committed.",
    "Review `git diff` (working tree vs HEAD) following your verification workflow: build, unit tests only (do not source .env.local), Rust code-review posture, protocol invariants, clean-room check.",
    "Treat fmt/clippy failures that already exist at HEAD as pre-existing. Return PASS / NEEDS-CHANGES / FAIL plus findings (P0/P1/P2 with file:line)."
  ].join("\n")
})));

return tasks.map((t, i) => {
  const w = writes[i];
  const rj = toReview.indexOf(t);
  const r = rj >= 0 ? reviews[rj] : undefined;
  return { id: t.key, writeOk: w.ok, writeRunId: w.runId, reviewOutput: r ? r.output : null };
});
```

Notes:
- Build each `desc` as a plain JS string with `\n` newlines (join multi-line
  text with `\n`; do not embed raw template literals with quotes/newlines).
- Launch the whole thing with `subagent({ workflowScript, async: true })`.
- If there are dependent groups, run group 1 (stage1+stage2), integrate its PASS
  lanes (step 5), then run group 2 — never both groups at once.
- Yield after launching. Do **not** `bg_wait({all:true})`; pi wakes you on
  completion.

## 4. Report verdicts

When the workflow completes, print a table:

```
id | write ok | verdict | changed files | top findings (P0/P1)
```

Verdict comes from each lane's `reviewOutput` (PASS / NEEDS-CHANGES / FAIL);
`writeOk: false` lanes are reported as FAILED-WRITE (no review ran).

## 5. Integrate PASS lanes (you, in the main tree)

For each PASS lane in deterministic id order, commit in the worktree and
cherry-pick into the main working tree **without committing**:

```bash
git -C ../vea-validator2-lane-<id> add -A
git -C ../vea-validator2-lane-<id> commit -m "lane(<id>): <title>"
sha=$(git -C ../vea-validator2-lane-<id> rev-parse --short HEAD)
cd /home/agentops/dev/vea_validators/vea-validator2
git cherry-pick --no-commit "$sha"
```

- `--no-commit` keeps the "never commit master" invariant: changes land in the
  main working tree, uncommitted, for the user to review/commit.
- If a cherry-pick **conflicts**: `git cherry-pick --abort`, stop that lane, and
  report — the partition missed a shared seam. Do not force a resolution.

After all PASS lanes are integrated:

```bash
cd /home/agentops/dev/vea_validators/vea-validator2
cargo build
git status --short
git diff --stat
```

Report the combined diff. Offer (do not auto-run) a final fresh `val2-tester`
pass over the combined diff before the user commits.

## 6. Cleanup and report

- Fully-integrated PASS lanes: `git worktree remove ../vea-validator2-lane-<id> --force && git branch -D lane/<id>`.
- **KEEP** worktrees for NEEDS-CHANGES / FAIL / FAILED-WRITE lanes.
- Final report: verdict table, what was integrated (commits + diff stat), what
  remains uncommitted in master, what worktrees remain, and next actions.
- **Do not commit master.** Offer, and await the user's go-ahead for fix loops
  and a final combined review.

## Safety

- One writer per worktree; the main repo is touched only by **you** during
  integration, never by lane children.
- `val2-writer` enforces `--permission-mode acceptEdits` and the fixed
  `--allowed-tools` list. Never widen them; never `--dangerously-skip-permissions`.
- Clean-room breach = P0 = that lane stops; escalate to the user.
- **Concurrency cap:** if Claude Code rejects concurrent headless sessions,
  reduce to a smaller batch (e.g. 4 lanes) and re-run the remainder.
- Shared devnet: lanes must NOT run devnet integration tests. Run those later
  on the integrated tree.
- Deposits are real value even on testnet; treat every verdict as safety-critical.
