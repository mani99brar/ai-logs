# Lane repair after freeze: recommended design

Judged 2026-09-23 against `workflow/` at 7c5e37e and the run directory of workflow-guardrails-001 (read only). The LangGraph behaviour was re-probed on copies of that run's `pipeline.sqlite` with the pinned langgraph 1.2.11. The run directory was not touched.

## Recommendation

- **The command.** Add one operator command, `python -m workflow repair "$RUN" <lane>[,<lane>] --commit <sha> --reason "<text>"`. It turns an operator-made fix commit into a NEW lane snapshot, after the lane was frozen and blocked at `verify_<lane>` or at the combined candidate, and before any review bundle exists.
- **How the fix enters the graph.** `repair` forks the same LangGraph thread at the freeze-boundary checkpoint (`update_state(fork.config, {"snapshots": ...}, as_node="handoff")`). It launches nothing and runs no checks.
- **How the run continues.** `automatic --live` (or `retry` for a manual run) re-verifies through the unchanged graph:
  - the repaired lane gets a fresh worker-phase attempt;
  - unchanged lanes are rechecked;
  - a new candidate generation is checked for every lane, and only then does review happen.
- **Operator help.** A small `--workspace` helper creates a detached worktree at the right base (the failing candidate, or the lane snapshot) with a brief of the blocking reasons. That removes the foot-gun that broke 001's hand finish: committing on the pinned source branch.
- **The worker relaunch comes later.** The relaunch the issue list asks for (a new worker session seeded with the reasons and the task) is phase 2, as `repair --session --live`. It reuses the same apply path, and it lands only after fix/autoupdate, so that a transient CLI error cannot stop a repair session.

## Scores

Each criterion is scored 1–5, where 5 is best. For "size and risk", 5 means small and low risk.

| Design | Safety vs invariants | Crash recovery | Operator simplicity | Size and risk | Would have saved 001 | Total |
| --- | --- | --- | --- | --- | --- | --- |
| operator-amend (`amend --commit`) | 5 | 5 | 4 | 5 | 5 | **24** |
| risk-first (`repair` + new thread) | 5 | 4 | 3 | 3 | 5 | 20 |
| worker-relaunch (`relaunch` session) | 4 | 4 | 4 | 2 | 4 | 18 |

- **operator-amend:**
  - its core claims are correct and it is the smallest;
  - its journal and deterministic snapshot commit make every step idempotent;
  - the operator has to create their own worktree, and the design has no guard against committing on the pinned checkout (it can only refuse afterwards).
- **risk-first:**
  - it has the best operator ergonomics (a controller-made worktree at the failing revision);
  - its defensive assertions are good: the bundle's packet and snapshot commits must match, and the new candidate tree must equal the repaired tree;
  - its thread-per-generation premise is partly wrong (see the claims below);
  - it forces an "active thread" resolver into `graph_config`, `export_run` and `drive`;
  - its minimal version also needs an export 1.6.0 bump plus a server change;
  - its ref namespace `refs/workflow/<h>/repair-<n>/<lane>` collides with a legal lane id `repair-1`.
- **worker-relaunch:**
  - it has the most thorough analysis: 312a96d's defects, the combined-worktree need, and reviewer independence via `prior_session_ids`;
  - it is the only one that delivers the session the issue list asked for;
  - its minimal version already needs a new launch authority after freeze (receipts, a wait, a stop, a capture, a drive hook);
  - at about 450 production lines it is roughly twice the size of an operator commit path;
  - in session mode it spends a model session on what was a one-line fix;
  - its ref `<lane>-repair-<k>` can collide with a lane literally named `ui-repair-1`.

### Claims checked

1. **Verified: updating the head checkpoint is wrong.** On a copy of 001's database, `update_state(<thread config>, ..., as_node="handoff")` gave `next == (verify_controller, verify_ui, candidate)`. The candidate ran in the same superstep as the verifies, with the NEW snapshots and the OLD packets (`worker/ui/1`). In the real `Pipeline.candidate` it would then reuse `candidate.json` (1ab6b95) and could write a bundle for the unfixed candidate.
2. **Verified: forking at the freeze boundary is right.** Forking from `1f1b78a9-7767-6157-8002-fd9d42c806c9` (step 2, `next == verify fan-out`) with its own `checkpoint_id` gave:
   - `next == (verify_controller, verify_ui)`, `packets == {}`, no errors;
   - the candidate then ran once, after both verifies;
   - a second fork found the first fork (source `update`) as the newest fan-out checkpoint and worked the same way;
   - the fork head has metadata `source: update`, and its parent is `1f1b78a9…`.

   Pending writes are not carried into a fork when the config carries a `checkpoint_id`.
3. **Verified, but not a reason to prefer it: seeding an empty new thread also works.** The result was `next == verify fan-out`, and the old thread was unchanged. Risk-first's reason for rejecting the same-thread fork does not hold, though:
   - "a fork brings the hazard back" is true only for the failed head, not for the freeze boundary;
   - "nothing marks which branch is live" is false: `get_state(thread)` returns the newest checkpoint, which is the fork, and the journal records the checkpoint ids.
4. **Verified: `candidate()` reuses `candidate.json` whenever it exists** (`pipeline.py`). So a repair needs generation paths.
5. **Verified: `verify_revision` raises "Existing verification belongs to a different revision/policy"** for an existing packet at a different commit (`checks.py`). So the amended lane's worker counter, and every lane's candidate counter, must move past their existing attempt directories.
6. **Verified: `Pipeline.attempt` and `retry_check` enforce `1 ≤ value ≤ max_verification_attempts`** (3 in 001's policy). `advance_failed_checks` compares attempt k-1 with k without looking at the revision. So after one repair, 001 would get exactly one `candidate:ui` attempt (3), and a second repair would be impossible without per-revision floors.
7. **Verified: the ui lane cannot build alone.** `verification/worker/ui/1/check-0.log` has 19 `error TS` lines about the contract fields that the controller lane adds, and the Playwright check died while loading its config. The fixed browser test can therefore only be verified on the combined tree. That makes the failing candidate the right base for a candidate-phase fix, and 7c5e37e's parent is exactly 1ab6b95.
8. **Verified: `InteractiveSessions.run` refuses a dirty worktree** ("Worktree changed since preparation"). Its launch-name check matches any inventory row with that name, whether or not it has a pid.
9. **Verified: the defects in 312a96d.**
   - It refuses any lane with a completion file, including `status: blocked`.
   - It reuses the lane's launch name, token and worktree.
   - It moves `stop.json` before launching, so a crash there leaves "No confirmed stop" forever.
   - `wait_handoffs`' recovery branch (`any stop.json`) reads a missing handoff for a sibling that was stopped mid-work.
10. **Verified: the identical-failure guard emits no event** (`drive` lets the RuntimeError escape). 001's timeline ends at "controller running" (sequence 32).
11. **Verified: the viewer needs no change for version 1.**
    - `values` is `z.record(z.string(), z.unknown())`.
    - `latestPacket` picks the highest attempt.
    - `EVENT_STATUS` maps `paused`.
    - Unknown event nodes become plain log lines.
    - The export's `verification/*/*/*/packet.json` glob keeps working as long as attempts keep counting up in place.
12. **Caveat that none of the designers raised: `freeze` and `retry` on an automatic plan run the review node in-process** (`review_candidate` launches the reviewers), without `--live` and without a supervisor. Risk-first's pre-freeze advice ("use `freeze --handoff`") therefore runs the whole automatic tail in that one CLI process. `repair` must never invoke the graph, and it must print `automatic --live` as the only continuation for automatic plans.

## Command surface

```
PY=~/dev/md-manager/.venv/bin/python

$PY -m workflow repair "$RUN" <lane>[,<lane>...] --workspace
$PY -m workflow repair "$RUN" <lane>[,<lane>...] --commit <sha> --reason "<text>" [--dry-run]
$PY -m workflow status "$RUN"              # adds "repairs": [{n, status, lanes, commit}]
$PY -m workflow automatic "$RUN" --live    # automatic plans: the only continuation
$PY -m workflow retry "$RUN"               # manual plans: continues to the review interrupt
```

- **Module.** A new `workflow/repair.py` with `repair_main(argv)` and its own argparse, dispatched from `workflow/__main__.py` like `resume` and `answer`.
- **`<lane>[,<lane>]`.** A positional, comma-separated subset of `plan.workers` (parsed like `--workers`), in the same form as the issue's `relaunch <run> <lane>`. Two or more lanes are allowed only when the base is the combined candidate.
- **`--workspace`** is a helper with no graph or journal state, and it does not block other commands. It:
  - takes both locks, then runs every state refusal below;
  - creates `$RUN/repair-workspace-<m>/` (m is the next free integer) with `git worktree add --detach`, at the base:
    - after a candidate block, the current generation's candidate commit;
    - after a worker-phase block, the named lane's effective snapshot commit;
  - writes `$RUN/repair-workspace-<m>.brief.md` containing:
    - the blocked step and attempt;
    - every gate reason, verbatim;
    - absolute paths of the failing `packet.json`, `check-<i>.log` and `browser-report-<i>.json`;
    - the named lanes' `owned_paths` and their check argv;
    - the RUNBOOK rules for browser evidence (one title per scenario id, exactly one `screenshot:<id>` PNG attachment);
    - the rule "commit here, never on the source branch";
  - prints the exact `repair ... --commit $(git -C <ws> rev-parse HEAD) --reason ...` line.

  Committing in a detached worktree is ordinary git. Nothing in the source checkout changes.
- **`--commit <sha>`** (required to apply) is the operator's fix commit, in the target repository's object store.
- **`--reason`** (required, non-empty) goes into the journal, the timeline, the snapshot summary and the reviewer prompt.
- **`--dry-run`** runs every validation and prints what would happen: the new snapshot per lane, the fix files, the attempt targets and floors, and the fork checkpoint. It writes nothing.
- **No `--live`.** `repair` launches no session and runs no check.
- **Exit codes:**
  - 0: applied (or the workspace is ready). It prints, per lane, the previous snapshot → the new snapshot, the fix files and the attempts that will run, and then the continuation command.
  - 1: `Blocked: <reason>`, with nothing written. Or it names a `recorded` repair and says to rerun the identical command to complete it.
- **Phase 2, not version 1:** `repair "$RUN" <lane> --session --live [--note "<text>"] [--timeout-seconds N]`. This is the worker relaunch. See Deferred.

### workflow-guardrails-001 with this design (at 20:27, source still at 30f465c)

```
$PY -m workflow repair "$RUN" ui --workspace
#  -> $RUN/repair-workspace-1 detached at 1ab6b95 (candidate.json .commit); the brief lists the 3 gate reasons of candidate/ui/2
#  edit tests/project-workflows/guardrails.spec.ts (the second attachment becomes the only screenshot:inert-markdown)
git -C "$RUN/repair-workspace-1" commit -am "ui: exactly one screenshot:inert-markdown"
$PY -m workflow repair "$RUN" ui --commit $(git -C "$RUN/repair-workspace-1" rev-parse HEAD) \
    --reason "verifier requires exactly one screenshot:inert-markdown attachment"
#  -> ui snapshot N = tree(89468eb) + that file, parent 30f465c; worker:ui 1->2, candidate:controller 1->2, candidate:ui 2->3
#  -> fork from 1f1b78a9 (next = verify_controller, verify_ui)
$PY -m workflow automatic "$RUN" --live
#  -> verify_ui attempt 2 at N (unit gates; build and browser deferred), verify_controller attempt 2 rechecked
#  -> candidate-1 (tree == the workspace commit's tree), candidate/controller/2 and candidate/ui/3 run every check
#  -> print reviewers review candidate-1; the feature branch fast-forwards to it
```

**The strict minimum that would have saved 001** is `repair --commit` alone: one lane, a candidate or lane-snapshot base, the journal, the fork, attempt targets, generation paths and the same-revision guard. That is about 260 production lines and 9 tests. The hand finish happened instead because the only place to commit was the pinned checkout.

**It cannot rescue 001 now.** The feature branch sits at 7c5e37e, so `HEAD != base_commit` and `repair` correctly refuses.

## State transitions

### Accepted states (all must hold)

1. **Locks.** `automatic-supervisor.lock`, then `controller.lock`, both taken non-blocking (`run_lock`) and held for the whole command. No supervisor or step process can be running.
2. **The plan.** `plan.json` has `workers` (legacy two-lane plans are refused), `pipeline.sqlite` has state, `snapshots.json` exists, and no interrupt is pending.
3. **A blocked step.** Exactly one of these:
   - **A: candidate block.** `state.next == ("candidate",)`, the candidate task has an error, and at least one lane's candidate packet at its current attempt has gate `blocked`.
   - **B: worker-phase block.** `state.next` is the verify fan-out, some `verify_<x>` task has an error, and `verification/worker/<x>/<attempt>/packet.json` is `blocked`.

   It does not matter whether the identical-failure guard, the attempt cap or a first failure stopped the run; the operator decides.
4. **No review has started.** There is no `review-bundle.json`, `review.json` or `integration-intent.json`, and no `integrated_commit`.
5. **The source is pinned.** The source checkout is on `plan.source_branch`, `HEAD == plan.base_commit` and `git status --porcelain` is empty. These are `integrate()`'s own checks, done early.
6. **The journal is clean.** No `repairs.json` entry has status `recorded`, and fewer than `MAX_REPAIRS = 3` are applied.

### The journal: `$RUN/repairs.json`

```json
{"version": "1.0.0", "repairs": [{
  "n": 1, "status": "recorded|applied", "mode": "commit", "reason": "...",
  "recorded_at": "...", "applied_at": "...",
  "blocked": {"step": "candidate", "packets": [{"path": "verification/candidate/ui/2/packet.json", "sha256": "...", "attempt": 2,
              "output_commit": "1ab6b95...", "reasons": ["..."]}]},
  "source_commit": "<C>", "base_kind": "candidate|snapshot", "base_commit": "<K or E>", "expected_candidate_tree": "<tree(C) | null>",
  "lanes": {"ui": {"previous_commit": "89468eb...", "commit": "<N>", "changed_files": ["..."], "fix_files": ["tests/project-workflows/guardrails.spec.ts"]}},
  "attempt_targets": {"worker:ui": 2, "candidate:controller": 2, "candidate:ui": 3},
  "attempt_floors":  {"worker:ui": 2, "candidate:controller": 2, "candidate:ui": 3},
  "fork_from": "1f1b78a9-...", "head_before": "1f1b78bd-...", "head_after": "<fork id>"
}]}
```

### Apply steps (in order, each idempotent)

| Step | Action |
| --- | --- |
| S0 | Validate. Read only: the state, the commit and ownership rules (next section), and the fork point. |
| S1 | Append the entry with status `recorded`. It holds the arguments, `blocked`, `attempt_targets`, `attempt_floors`, `fork_from`, `head_before` and `recorded_at`. Written with `save_json` (temp file, rename, fsync). |
| S2 | Per lane: build the tree T, then `N = commit-tree T -p base_commit` with `commit_env()` plus `GIT_AUTHOR_DATE = GIT_COMMITTER_DATE = recorded_at`, so N is deterministic. Then `update-ref refs/workflow-repair/<h16>/<n>/<lane> N` and `refs/workflow-repair/<h16>/<n>/source C`, so C is kept as evidence. |
| S3 | Save `lanes.<lane>.{commit, changed_files, fix_files}` into the entry. Write `$RUN/repair-<n>.diff` (`git diff --binary E N`, per lane, concatenated). |
| S4 | Set `attempts.json[key] = max(current, target)` for each target (never lowered). |
| S5 | Fork: `graph.update_state(fork.config, {"snapshots": effective}, as_node="handoff")`. |
| S6 | Append the events (see Export and timeline), set the entry `applied` with `applied_at` and `head_after`, then run `report()` and the export. |

### The fork (LangGraph)

- **Fork point.** `fork` is the newest entry of `graph.get_state_history(config)` whose `set(next) == {verify_<lane> for every lane}`. That is the handoff output checkpoint, or the previous repair's fork.
- **Consistency check.** Assert `fork.values["snapshots"]` equals the previous generation's effective snapshots (`snapshots.json` overlaid by applied repairs). Otherwise refuse with "contradictory run state".
- **The call.** Pass `fork.config`, which carries a `checkpoint_id`, and never the bare thread config. Pending writes are not applied to a fork. On the head they would keep the failed `candidate` trigger alive (claim 1).
- **Check after the call.** `get_state(config).next` must equal the verify fan-out, with no task errors. If not, stop with "contradictory run state".
- **Same thread.** Everything stays on the thread `thread_id = run_id`, so `graph_config`, `export_run` and `carry_legacy_lanes` are unchanged.
- **History.** The failed branch stays in `get_state_history` as evidence.
- **The handoff body does not run.** Neither the interrupt, nor `freeze()`, nor `stop_workers` runs; only its edges fire.

### What changes and what never changes

- **New:** `repairs.json`, `repair-<n>.diff`, `repair-workspace-<m>/` and `.brief.md` (helper only), the `refs/workflow-repair/...` refs, and one new checkpoint.
- **Created later by the graph:**
  - `verification/worker/<lane>/<k>/` for each repaired lane;
  - `candidate-<g>.json` and `candidate-<g>/`, where g is the number of applied repairs;
  - `verification/candidate/<every lane>/<k>/`;
  - then the review files, for the first time.
- **Updated:** `attempts.json` (raised only) and `events.jsonl` (appended); `run-state.json` and `report.html` are regenerated.
- **Never written, moved or deleted:**
  - `plan.json` (its digest is bound into every receipt) and `policy.json`;
  - `snapshots.json`, which stays the generation-0 record;
  - every `<lane>.*` session file;
  - `candidate.json`, `candidate/`, every existing packet and artifact, and `refs/workflow/<h16>/<lane>`;
  - `worktree-<lane>/` and the source checkout.

### Continuation

`repair` never invokes the graph. `drive()` then sees values, no `launch_` step, no errors and a non-empty `next`, and calls `invoke(None)`. Manual `retry` does the same up to the review interrupt.

## Snapshot and verification

### Base and fix

For each named lane L, let E_L be its effective snapshot commit, and let K be the current generation's candidate commit (from `candidate.json` or `candidate-<g>.json`).

- **Base "candidate"** (state A only): K is an ancestor of C (`merge-base --is-ancestor`).
  - The fix paths are `diff --no-renames --name-only K C`.
  - Every fix path must be owned by one of the named lanes. A path owned by an unnamed lane is refused, naming the path and its owner.
  - `expected_candidate_tree` is `tree(C)`.
- **Base "snapshot"** (state A or B): exactly one lane is named, and E_L is an ancestor of C. The fix paths are `diff E_L C`. `expected_candidate_tree` is null.
  - A lane-snapshot base with several lanes is refused. Overlaying a path taken from base content would silently discard another lane's changes to it.

### The tree per lane

Use a private `GIT_INDEX_FILE` (`$RUN/repair-<n>-<lane>.index`, deleted first if left behind):

1. `read-tree E_L`.
2. For L's fix paths, feed `update-index --index-info` from `ls-tree C`, or `--force-remove` for paths deleted in C.
3. `write-tree` gives T.

### Checks on T (freeze's rules, reused)

- Every path in `diff-tree -r --no-renames base_commit T` passes `safe_path`, is owned by L, and is not owned by any excluded lane (message "ownership violation … excluded lane").
- No fix path has mode 120000 (symlink) or 160000 (gitlink).
- `T != tree(E_L)`, so a no-op repair cannot be used as a disguised retry.
- `changed_files` is `diff-tree base N`, derived by the controller and never taken from the operator.

### The snapshot record (in the forked state; `snapshots.json` untouched)

- `{commit: N, changed_files, session_id: <the worker's own>, summary, open_assumptions, repair: {...}}`.
- `summary` is the worker summary plus `"\n\nOperator repair <n>: <reason> (files …; source C on <base_kind> <base8>)"`.
- `repair` is `{n, mode: "commit", base_kind, base_commit, previous_commit, source_commit, fix_files, reason, recorded_at}`.
- `session_id` stays the worker's in version 1, so reviewer independence is unchanged. Provenance is carried by `repair`, the summary line, the journal, the timeline and the reviewer prompt. A phase 2 session repair sets `session_id` to the repair session and adds `prior_session_ids`.

### Re-verification (after continuation, by the unchanged graph)

- **The repaired lane** runs `verify_<lane>` at its new attempt, in a fresh worktree at N. Changed files are captured, every check runs, ownership is re-enforced by `evaluate_worker`, and build and browser checks stay deferred as the policy says.
- **Unchanged lanes** keep the same attempt and commit. `verify_revision` returns `recheck_packet` of the existing packet (hashes and gate re-evaluated). Nothing reruns, and the rewrite is byte-identical.
- **`candidate()` builds generation g:**
  - `g = count(applied repairs)`; g = 0 keeps `candidate.json` and `candidate/`, and g ≥ 1 uses `candidate-<g>.json` and `candidate-<g>/`. The partial-worktree refusal is unchanged.
  - Two new assertions:
    - (a) every worker packet's `expected.output_commit == state.snapshots[lane].commit` (the bundle-coherence guard against the head-update hazard);
    - (b) when the latest repair has `expected_candidate_tree`, `tree(candidate) == expected_candidate_tree` ("candidate differs from the repaired tree; inspect").
  - Every lane's candidate checks run at the raised attempts. The bundle is written only if all of them pass.
- **Reviewers** see only the passing candidate. `review_prompt` adds one fixed line: "Lane(s) <l> were repaired by the operator before review (repair <n>: <reason>); the operator's change is <RUN>/repair-<n>.diff; the rest of review.diff is the workers' work." `bundle.snapshots` carries the `repair` object.

### Attempts and the guard

- **Targets.** For the worker phase of each repaired lane, and for the candidate phase of every lane whose candidate attempt directory exists: `target = max(counter, highest existing attempt directory + 1)`. In 001: `worker:ui 2`, `candidate:controller 2`, `candidate:ui 3`. No gaps are left, and nothing is moved: packets hold absolute paths, and verification worktrees are registered with git.
- **Floors.** Each target is also its floor. `Pipeline.attempt` checks `floor ≤ value ≤ floor + max − 1`. `retry_check` and `advance_failed_checks` use the same bound, with the floor taken from the latest `repairs.json` entry for that key, else 1. The limit of 3 becomes "per lane, phase and repaired revision"; `MAX_REPAIRS` bounds the total.
- **The identical-failure guard** compares attempts k−1 and k only when both packets have the same `expected.output_commit` (a missing `expected` counts as the same, for the existing test shape). A repaired revision's first failure gets the normal single retry. When the guard fires, `drive` now appends a `controller blocked` event before exiting.

## Refusals

Every refusal exits 1 with `Blocked: …` and writes nothing: no journal, no refs, no attempts, no checkpoint and no event.

**States:**
- The run was never started, or a `launch_` step is pending or failed: "use reconcile".
- Waiting at `worker_handoff` (no snapshots yet): "a lane blocked before freeze; see RUNBOOK. Pre-freeze repair is not supported in v1."
- A pending review or approval interrupt, `review-bundle.json`, `review.json` or `integration-intent.json` exists, or the run is integrated: "reviewers have seen a candidate; code changes need a new run".
- A failed step other than `candidate` or `verify_*`, or a failed step with no `blocked` packet at its current attempt (an infrastructure error, a cherry-pick conflict, a partial candidate): "not a check verdict; inspect, then retry".
- An attempt directory without a packet: "interrupted check; use retry --phase … --node …".
- A lock is held: "Another controller owns this run".
- A `recorded` repair exists: "rerun: repair <exact recorded args>". Different arguments are refused.
- `MAX_REPAIRS` (3) are already applied: "start a revised run".
- The source checkout is off `source_branch`, not at `base_commit`, or dirty. The message names which, and says to commit in the workspace instead. This is exactly what 001's hand finish did.
- No freeze-boundary checkpoint, or its snapshots contradict `snapshots.json` plus the applied repairs: "contradictory run state".
- A legacy plan without `workers`.

**Arguments:**
- An unknown or repeated lane, or a malformed lane list.
- An empty `--reason`.
- `--commit` together with `--workspace`, or neither of them.

**Commit:**
- It does not resolve to a commit in `plan.repository`.
- It descends from neither K nor E_L.
- Its candidate base is stale (not the current generation's).
- Several lanes are named with a lane-snapshot base.
- A fix path is owned by an unnamed lane (the message names the path and its owner), owned by no lane, or owned by an excluded lane.
- A symlink or gitlink entry, or a path that fails `safe_path`.
- A tree identical to the effective snapshot.

**Added to other commands:**
- `drive()` (so `automatic --live` and `automatic-step`) and `retry` refuse while a repair is `recorded`: "Repair n is recorded but not applied; rerun repair".
- `start`, `freeze`, `review`, `approve` and `reconcile` are already refused in these states by their own checks.

## Crash recovery

| Crash after | What is left | Recovery |
| --- | --- | --- |
| S0 | Nothing | Rerun. |
| S1, S2, S3 or S4 | The entry is `recorded`. Maybe the objects, refs, diff and raised counters. | `drive` and `retry` refuse, so the old failing branch can never resume with raised counters. The identical rerun repeats S2–S4 with the same N (pinned dates) and the same refs (`update-ref` to the same value), leaves the counters unchanged (`max`), then forks. Different arguments are refused. |
| S5 (fork written) | The entry is `recorded` and the head is a fork. | The rerun sees the head's parent `== fork_from`, `source == update`, `snapshots == effective`, `next ==` the fan-out and no errors. It skips the fork, writes the events and marks the entry `applied`: exactly one fork. Any other head: "checkpoint moved; inspect". |
| S6 (partly) | Events maybe written, status maybe not. | Same as above. Duplicate timeline lines are harmless. |
| After `applied` | Normal graph checkpoints. | Existing rules: an interrupted attempt directory needs `retry --phase … --node …` (within the per-revision budget); a partial `candidate-<g>/` blocks for inspection; a crash after the bundle is normal review recovery. |
| `--workspace` at any point | Maybe a worktree or a brief. | Stateless. A rerun takes the next m. Leftovers are listed by `status`, and cleanup is an operator decision. |

`repair` never calls `claude`, `inventory` or `stop`, so no session state needs reconciling at any crash point. Abandoning a `recorded` entry is not offered in version 1: the only exit is completing it, because any other state would leave the counters and refs inconsistent with the graph.

## Export and timeline

**Timeline (`events.jsonl`) at S6.** No schema change:
- per repaired lane, `{node: "verify_<lane>", status: "paused", message: "Repair n by the operator: snapshot <N8> = <E8> + <C8> on <base_kind> <base8> (<fix files>). Reason: <reason>. Answers <step> attempt <k>: <gate reasons>. Continue with automatic --live"}`;
- `{node: "candidate", status: "paused", message: "Repair n supersedes combined revision <K8>; candidate-<g> is built after the lanes re-verify"}`;
- `{node: "controller", status: "running", message: "Repair n applied: checkpoint forked from <fork8> (after handoff); attempts worker:ui 2, candidate:controller 2, candidate:ui 3"}`;
- the guard's new `controller blocked` event when two same-revision attempts fail identically.

**How the viewer shows it (no server change).**
- `verify_<lane>` and `candidate` show `paused` until the run continues. After the fork there are no task errors and `values.packets == {}`, so the events decide.
- The verify events' `Attempt k` then advance the node, and `latestPacket` (highest attempt) shows the repaired evidence.
- `values.snapshots.<lane>` carries N, the summary line and the `repair` object.
- `verification_packets` lists old and new packets alike.
- Export stays byte-stable when nothing changed.

**Other outputs.**
- `report.html` gets a "Repairs" section: the journal, each `repair-<n>.diff` and the fork ids.
- `status` prints `repairs` and any open workspaces.
- RUNBOOK:
  - a "Blocked after freeze: repair a lane" recovery procedure;
  - the "Changed code/policy: create a new run" line becomes "before review: `repair`; after review started, or a policy change: a new run";
  - a command-reference row;
  - file-table rows for `repairs.json`, `repair-<n>.diff`, `repair-workspace-<m>/` and `candidate-<g>[.json]`;
  - the per-revision attempt wording.

**Phase 2 (with the session repair).**
- Export 1.6.0 adds `repairs` (the journal without absolute paths, plus the session receipt, completion and questions).
- `server/projects.ts` adds `1.6.0` to `EXPORT_VERSIONS` with an optional `repairs` schema, in the same change.
- `contracts/projects` run inputs gain `repairs`.
- The viewer gets an "operator repair" / "repair session" badge on `verify_<lane>` and the candidate, with the reason and the diff link.

## Tests

The new `workflow/test_repair.py` uses the offline fixture from `test_pipeline` (real git worktrees, real checks, FakeSessions, headless Chromium).

1. **`test_repair_candidate_screenshot_defect_end_to_end`** (the 001 regression). The ui spec attaches `screenshot:ready` twice. Then:
   - the worker phase passes, with the browser check deferred;
   - the candidate fails twice identically, and the guard stops the run and logs an event;
   - `--workspace` makes a worktree at `candidate.json`'s commit;
   - the fix is committed there, `repair ui --commit` runs, and the graph continues.

   Assert:
   - `worker/ui/2` is at N, and N's parent is base;
   - the adapter worker packet is byte-identical and there is no `worker/adapter/2`;
   - `candidate-1/` exists, and `candidate/adapter/2` and `candidate/ui/3` pass;
   - `bundle.snapshots.ui` has N, the `repair` object and the worker's `session_id`;
   - review then approval fast-forwards to a candidate whose tree equals `tree(C)`;
   - `sessions.starts` is unchanged;
   - `snapshots.json`, `candidate.json`, the old packets and `refs/workflow/<h>/ui` are byte-identical.
2. **`test_repair_forks_at_the_freeze_boundary`.** After the repair:
   - `next` is exactly the verify fan-out, `packets == {}`, there are no errors, the source is `update`, and the parent is the handoff checkpoint;
   - the failed checkpoint is still in history;
   - the candidate runs exactly once, after both verifies;
   - a second repair forks from the first fork.
3. **`test_fork_never_uses_the_bare_thread_config`.** Spy on `update_state`: the config always carries a `checkpoint_id`. Also a regression pin: a hypothetical head update makes `candidate()`'s coherence assertion refuse, because a worker packet's commit differs from the snapshot's.
4. **`test_worker_phase_block_is_repaired`.** The adapter's unit check fails deterministically at `verify_adapter`, and the guard stops the run. `repair adapter` from the lane-snapshot base gives a fresh worker attempt that passes. The ui packet is reused byte-identically, and the run reaches review.
5. **`test_lane_snapshot_base`.** A fix on the ui snapshot commit gives N with `tree(N) == tree(C)` and parent base, and `changed_files == diff-tree base N`.
6. **`test_one_fix_spanning_two_lanes`.** A candidate-based commit touching `ui.txt` and `backend.py`:
   - with `ui,adapter`, each lane gets its owned subset;
   - with `ui` only, it is refused, naming `backend.py` and its owner;
   - two lanes on a lane-snapshot base are refused.
7. **`test_refused_commits_change_nothing`** (subTests). Refused: an unknown sha, an unrelated commit, a stale candidate base, the same tree, an unowned path, an excluded lane's path, a symlink, a gitlink, an unknown or repeated lane, an empty reason. After each, `repairs.json` is absent, and `attempts.json`, the head checkpoint id and `events.jsonl` are unchanged.
8. **`test_refused_states`** (subTests). Refused: before start, at `worker_handoff`, after a failed `launch_` step, with a bundle, review or integration intent present, after integration, with either lock held, with the source moved, dirty or on another branch, with an interrupted attempt directory, with no blocked packet, after `MAX_REPAIRS`, and for a legacy plan.
9. **`test_crash_at_each_repair_step_is_completed_by_rerunning_it`.** Inject an exception after S1 to S5 in turn. While the entry is `recorded`, `drive()`, `retry` and a repair with different arguments are refused. The identical rerun completes with one fork, the same N and counters raised once.
10. **`test_identical_failure_guard_compares_only_the_same_revision`** (extends `test_automatic.test_identical_failures_are_not_retried`):
    - identical reasons at commit K (attempt 2) and commit K′ (attempt 3) are retried;
    - identical reasons at the same commit stop the run and append a `controller blocked` event.
11. **`test_attempt_budget_is_per_revision`.**
    - `attempt`, `retry_check` and `advance_failed_checks` accept attempts floor to floor+2 and refuse floor+3;
    - a worker-phase block raises no candidate counter that has no attempt directory.
12. **`test_candidate_generation_paths_and_tree_assertion`.**
    - g = 1 uses `candidate-1.json` and `candidate-1/`;
    - a partial `candidate-1/` is refused;
    - a tampered `expected_candidate_tree` is refused.
13. **`test_export_report_timeline_and_status_show_the_repair`.** Checks:
    - the paused events on `verify_<lane>` and `candidate`;
    - the controller event;
    - `values.snapshots.<lane>.repair`;
    - old and new packets listed;
    - the report's "Repairs" section;
    - `status.repairs`;
    - export byte-stable on a second run.

    Optionally, a `server/projects.test.ts` projection: `verify_ui` paused, then succeeded at the latest attempt.
14. **`test_repair_cli_launches_nothing` (subprocess).**
    - `--dry-run` leaves the run directory listing and hashes unchanged;
    - the FakeSessions launch count and inventory calls are unchanged;
    - the continuation printed is `automatic "$RUN" --live` for automatic plans and `retry "$RUN"` for manual ones;
    - the review prompt carries the repair line and the diff path.
15. **`test_workspace_helper`.**
    - it is detached at K after a candidate block and at E_L after a worker-phase block;
    - the brief carries the gate reasons, the log and report paths, the owned paths and the check argv;
    - no journal entry is written and no other command is blocked.

## Size

| File | Version 1 lines | What changes |
| --- | --- | --- |
| `workflow/repair.py` (new) | ~300 | argparse and dry-run ~40; locks, state and refusals ~60; workspace and brief ~35; base, fix, overlay, checks, deterministic commit and refs ~70; journal, targets and floors ~40; fork and its detection ~30; events, diff and output ~25 |
| `workflow/pipeline.py` | +50 | floors in `attempt`/`retry_check`; candidate generation paths; the two coherence assertions; the `retry` refusal while recorded; `status.repairs`; the report section |
| `workflow/automatic.py` | +20 | same-revision guard; floor-aware bound; guard event; `drive()` refusal; reviewer prompt line |
| `workflow/__main__.py` | +3 | dispatch |
| `workflow/RUNBOOK.md`, `workflow/README.md` | ~45 | procedure, command row, files table, per-revision attempt wording |
| `workflow/test_repair.py` (new), `workflow/test_automatic.py` | ~550 | 15 tests (one real-Chromium end-to-end, which adds about 30–60 s to the parallel suite) |

- **Version 1 total:** about 370 production lines, about 550 test lines and 15 tests, in 2 new files and 6 edited files. Roughly 1.5 focused days.
- **Strict minimum** (`--commit` only, one lane, no workspace, dry-run or report section): about 260 lines and 9 tests (1, 2, 4, 7, 8, 9, 10, 11, 12).
- **Phase 2** (the session repair, plus export 1.6.0 and the viewer): about +350 Python production lines, +250 lines across Python, `contracts/projects` and TypeScript, about +450 test lines and 12 tests.
- **Phase 3** (pre-freeze relaunch): about +150 lines and 5 tests.

## Deferred

1. **Phase 2: `repair <lane> --session --live`, the relaunch from the issue list.**
   - **Workspace and launch.** The workspace is created at the same base as `--workspace`, which is a combined candidate for candidate blocks, because the ui lane cannot build alone. Exactly one native session is launched in it, with the automatic worker's flags plus `DISABLE_AUTOUPDATER=1`, a new launch token, the launch name `workflow-<run>-repair-<n>`, and the receipt `repair-<n>.interactive.json` written before `claude --bg`.
   - **Prompt.** The fixed worker rules, the owned paths, the gate reasons verbatim, the evidence paths, the verifier rules (and `check-report` once fix/browser-rules lands), the original pinned task with `decisions_block`, and `completion_prompt` bound to `repair-<n>.completion.json` and the repair token.
   - **What `drive()` does.** It gains a hook that waits (with a deadline and questions), stops the session (the existing `stop_session` intent), and captures the workspace tree through a private index, restricted to the named lanes' owned paths. The capture becomes C and goes through the same S1–S6. `drive()` never launches.
   - **Also needed:** `sessions.RESERVED_NODE_PREFIXES += ("repair-",)`; `answer` and `attach-one` routing; `prior_session_ids` in `check_review` and `check_independence`; export 1.6.0 with the server change in the same PR.
   - **Prerequisite.** It lands after fix/autoupdate (exit 75 on a transient CLI error), so an outage cannot stop a repair session.
2. **Phase 3: a lane blocked before freeze.** This supersedes 312a96d, which should not be merged as it is.
   - It relaunches in a fresh worktree created from the halted lane's captured tree, under a new name and token, never in the dirty lane worktree.
   - The stop evidence stays in place; nothing is moved.
   - `wait_handoffs`' recovery branch requires every `handoff.json`, not merely any `stop.json`.
   - It is tied to the P1 fix "a transient error stops every worker": stop only the failing lane.
   - Until then, the RUNBOOK says that pre-freeze blocks on automatic runs need a new run. `freeze --handoff` on an automatic plan runs the whole automatic tail, reviewer launches included, inside that CLI process (claim 12). That is a separate issue to fix.
3. **Repair after review has started.** It stays "new run", because reviewers have seen the candidate.
4. **Replacing an applied repair that has not been continued yet.** Version 1 refuses it; use `--dry-run` before applying.
5. **Making `MAX_REPAIRS` a policy field, and cleanup** of `refs/workflow-repair/...`, the workspaces and the extra verification worktrees. Cleanup stays an operator decision.
6. **The prevention items from the same P1:** scenario rules in the task templates and `init`, and `check-report`. They make this failure class rare; `repair` is the escape hatch.

## Rejected alternatives

- **`update_state` on the failed head (bare thread config).** Proven on 001's database to schedule the failed `candidate` beside the verifies, with the new snapshots and the old packets, and `candidate()` would reuse the old `candidate.json`.
- **A new LangGraph thread per repair (risk-first).** It works mechanically, but every reader keys on `thread_id = run_id` (`graph_config`, `export_run`, `carry_legacy_lanes`), so each would need an active-thread resolver, and the run's history would be split across threads. The same-thread fork is equally safe once the fork point is the freeze boundary and the config carries the `checkpoint_id`.
- **A new sub-run.** It needs a new plan, worktrees, receipts and a registry entry, which is exactly "start a revised run".
- **Archive-and-reuse relaunch (312a96d).** The defects are listed in claim 9, and its test only used FakeSessions.
- **Relaunching in `worktree-<lane>`.** Refused by `run()` when dirty, and in 001 the ui lane cannot build or run Playwright there.
- **A post-freeze worker session in the minimal version (worker-relaunch).** It needs a new launch authority (receipt, wait, stop, capture) and a model session, for what was a two-insertion, one-deletion fix. It is kept as phase 2 on the same apply path.
- **Rewriting `snapshots.json` or `plan.json`, or moving old evidence.** That breaks receipt digests, `recheck_packet`'s absolute paths and git's worktree registry, and it destroys immutable evidence.
- **A global attempt cap lift, or automatic repair by the controller.** The limit becomes per revision, bounded by `MAX_REPAIRS`, and every repair is operator-initiated and journaled.
- **The ref namespaces `refs/workflow/<h>/repair-<n>/<lane>` or `<lane>-repair-<k>`.** Both collide with legal lane ids. Use the sibling `refs/workflow-repair/<h16>/<n>/<lane>`.
- **Committing the fix on the pinned source branch (001's hand finish).** It breaks integration's `HEAD == base_commit` check and puts the fix outside every gate.
