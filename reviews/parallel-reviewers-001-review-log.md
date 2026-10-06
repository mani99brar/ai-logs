# Review log: workflow run `parallel-reviewers-001`

Rolling code review of the live automatic run launched 2026-09-22 22:55 UTC with
`.venv/bin/python -m workflow launch parallel-reviewers --live --automatic --worker-timeout-seconds 5400`.
A reviewer pass runs roughly every 7 minutes and appends a dated entry below. This file lives outside the repository on purpose.

## Run facts

| Item | Value |
| --- | --- |
| Run directory | `~/.local/state/md-manager-workflows/parallel-reviewers/parallel-reviewers-001` |
| Feature branch (source checkout) | `feature/parallel-reviewers/parallel-reviewers-001` pinned at `80a9217` ("feat: pi schedule") |
| Policy sha256 | `ec855434…99aa6db` |
| Lanes | `ui` (session `0bd568e0`, launch token `b615f1f0…`), `adapter` (session `c6d0b404`, launch token `c9894550…`) |
| Spec | `docs/PRD_PARALLEL_REVIEWERS.md` slice B, umbrella `PRD_CONFIGURABLE_WORKFLOW.md` |
| Controller | automatic checkpoint controller PID 1305671, `controller.lock` and `automatic-supervisor.lock` held |
| Worker timeout | 5400 s per lane |

### Ownership boundaries being checked on every pass

- `ui` lane may edit only `src/projects/` and `tests/project-workflows/`. Required checks: build, browser (`viewer-two-reviewers` scenario); unit gates in both phases.
- `adapter` lane may edit only `workflow/`, `contracts/`, `server/`, `features/project-workflows/`. Required checks: workflow unit suite, contract tests, unit regression, build.
- Neither lane may touch `features/parallel-reviewers/`, package manifests, root Playwright config, `docs/`, `src/App.*`, `src/index.css`, or commit/push.
- Cross-lane contract: the adapter publishes projects contract 1.4.0 and export 1.4.0 (review section gains `reviewers`, each finding gains `reviewer`); the UI builds fixtures against the PRD's description of that shape. Any deviation must be recorded in the adapter's completion summary.

### What each pass checks

1. `events.jsonl`, completion files, `verification/` results.
2. Worker transcript activity (files read, edited, commands run, last stated intent).
3. `git status` and `git diff` in each lane worktree, reviewed against the PRD and the ownership list.
4. Findings recorded with severity: P0 blocks acceptance, P1 must be fixed before merge, P2 should fix, P3 note.

---

## Pass 1: 2026-09-22 22:58 UTC (T+3 min)

**State.** Both native sessions launched at 22:55:09 and are in `interactive` state awaiting a completion signal. No completion files, no `verification/` directory yet. Both worktrees are clean at `80a9217`: zero edits so far.

**ui worker.** Has read the PRD, `ReviewDetail.tsx` region of the viewer, the whole project-workflows Playwright suite (`fixtures.ts`, `seed.ts`, `review.spec.ts`, `harness.ts`, `mock.ts`, config), the RUNBOOK scenario-marker rules, and the review-related parts of `server/projects.ts` and `workflow/export_state.py`. Last stated intent: finishing context reading before editing.

**adapter worker.** Has read every controller module it owns (`automatic.py`, `sessions.py`, `interactive.py`, `launch.py`, `export_state.py`, `pipeline.py`) and all their test files, the workflow and projects contracts with examples and tests, `server/projects.ts`, the CHEATSHEET, RUNBOOK review sections and the feature README. Last stated intent: finish surveying then implement across controller, contracts and server.

**Observations.**

- P3, ui lane: the worker ran `git -C ../worktree-adapter status` and `git diff` against the adapter's worktree to see whether the 1.4.0 contract had landed yet. It is read-only and the adapter tree was still clean, so nothing leaked, but the prompt says to build fixtures from the PRD description and stay within the worktree. Watch for the UI lane copying adapter shapes verbatim later, since that would hide a contract mismatch the candidate phase is meant to surface.
- No code to review yet. Next pass should see the first edits; the adapter lane has the larger surface (six controller modules plus two contract families) and is the critical path for the UI lane's worker-phase build.

## Pass 2: 2026-09-22 23:07 UTC (T+12 min)

**State: the run is blocked and both workers are stopped. No code was produced by either lane.**

Timeline since pass 1 (from `events.jsonl`, the adapter transcript and the stop receipts):

| Time (UTC) | What happened |
| --- | --- |
| 22:57:58 | The adapter worker's assistant turn ended with `stop_reason: refusal`. The harness logged "safeguards stopped the response above, continuing once with that noted" and injected a user message saying the content was withheld and unfinished tool calls did not run. The withheld block was a thinking block; the worker's last completed action was a read-only `grep` over `server/projects.test.ts` and the UI fixtures. Nothing was edited. |
| 22:57:58 to 23:00 | No further assistant output in the adapter transcript. The session sat in the native `blocked` state. |
| 23:00:10 | Controller event 6: "Worker adapter blocked; inspect quota or native error. No billing/provider fallback." |
| 23:00:14 | Freeze event 7: both native workers stopped before snapshot capture. `ui.stop.json` and `adapter.stop.json` record `stopped: true`. |
| 23:07 | Controller PID 1305671 is gone. `controller.lock` and `automatic-supervisor.lock` remain on disk. Report shows `next: [handoff]` with the worker_handoff interrupt still pending. |

**Mechanism.** `wait_handoffs` in `workflow/automatic.py` (line 123) polls `claude agents --json` every two seconds and raises as soon as any lane's native state is `blocked`. Claude Code marks a background session blocked when its turn ends needing attention, which is what a classifier refusal produces. The run treats that as terminal with no relaunch, by design ("no automatic relaunch", "no billing/provider fallback").

**ui worker at the moment it was stopped.** It had finished reading, confirmed the policy setup step is `npm ci`, and had just launched `npm ci` in the background (completed with exit 0, 307 entries in `node_modules`) while intending to start `ReviewDetail.tsx`. Zero edits; its worktree is clean at `80a9217`. It was collateral of the adapter block.

**Code reviewed this pass:** none. Both worktrees have an empty `git diff` against `80a9217`.

**Findings.**

- P1, run: the adapter lane never got past reading, so slice B has no implementation from this run. The run needs a fresh launch or a retry by the operator. From the earlier live-run notes, a retry of stopped lanes on the same snapshots is `workflow retry <run>` followed by `workflow automatic <run> --live`, after moving any `verification/` aside (none exists here) and pruning stale worktrees. Because no worker produced anything, a clean relaunch is equally valid. Not done by this reviewer: the loop is read-only.
- P2, controller design (pre-existing code, not this run's change): `wait_handoffs` has no distinction between a native session that is blocked because it needs a human (a refusal the harness auto-continues once, a permission prompt, a question) and one that has failed. A single sighting of `blocked` two minutes after a recoverable refusal ends the whole run and kills the healthy lane. A grace period, or a check that the session is still `blocked` after the harness's automatic continue, would have kept the ui lane alive. Worth a follow-up PRD note; out of scope for slice B.
- P2, controller: the refusal happened while the worker was only reading files and planning. Nothing in the adapter prompt or the repository content caused it in an identifiable way; the withheld block was reasoning, not a tool call. Treat as a transient model-side event, not a prompt defect. If it recurs on the same prompt at the same point, that changes the assessment.
- P3, hygiene: the pinned source checkout (`~/dev/md-manager`, branch `feature/parallel-reviewers/parallel-reviewers-001`) carries an uncommitted `M .gitignore` from before launch. The run does not read it, but the live-run notes say the pinned checkout must stay clean until integration; the operator should commit or stash it before the retry.
- P3, run directory: `controller.lock` and `automatic-supervisor.lock` are left behind by the dead controller. `workflow status` will be refused while they exist; read `events.jsonl` and `report.html` instead, or expect the retry command to reconcile them.

**Next pass** will check whether the operator retried or relaunched (new events after sequence 7, new session ids in `terminals.json`, or a new run directory `parallel-reviewers-002`). Until then there is nothing to review.

## Pass 3: 2026-09-22 23:17 UTC (T+22 min)

**State: the operator relaunched both lanes at 23:11 inside the same run. Both new sessions are alive and still reading. No edits yet.**

| Item | Attempt 1 (stopped 23:00) | Attempt 2 (running) |
| --- | --- | --- |
| ui session | `0bd568e0` | `a8bc7a91`, launch requested 23:11:10, native state `working` |
| adapter session | `c6d0b404` | `11b209df`, launch requested 23:11:04, native state `working` |
| controller | PID 1305671 (gone) | PID 1316976, `workflow automatic-step`, up since 23:11:24 |
| evidence | archived under `relaunched/<lane>/1/` (receipt, launch log, prompt, stop receipt) | live files in the run root |

Events 8 to 14 record "Relaunching <lane> after a halted session (attempt 2); previous evidence kept under relaunched/<lane>/1". The worker deadline of 5400 s is measured from each new receipt's `launch_requested_at`, so attempt 2 expires at about 00:41 UTC.

**Correction to pass 2.** The P2 note said the controller offers no relaunch. That is true of the automatic loop, but the operator-driven path does relaunch a halted lane as a numbered attempt and archives the old evidence, which is what happened here. The design concern stands in a narrower form: the automatic loop still ends the run on the first sighting of a native `blocked` state and stops the healthy lane, so an operator has to notice and relaunch by hand.

**Also cleared since pass 2.** The pinned checkout `~/dev/md-manager` is now clean at `80a9217`; the stray `.gitignore` modification noted as P3 is gone. The attempt-1 stop receipts moved into the archive, so the run root no longer looks frozen.

**ui worker (attempt 2).** Re-reading the same material as attempt 1: `seed.ts`, the RUNBOOK marker rules, `RunView.tsx`, `NodeDetail.tsx`, `ReviewDetail.tsx`, the projects spec, `lanes.spec.ts`, and the review status vocabulary in `workflow/automatic.py` (superseded, accepted_at, launched_at, timed_out, rejected). It again ran `git status` and `git diff --stat` against `../worktree-adapter` (still clean, so nothing to copy). Three commands paged through a large tool result the harness had persisted under its own session directory; that is normal harness behaviour, not an escape from the worktree. Last stated intent: read the viewer, fixtures and browser suite before changing anything. No `npm ci` yet in this attempt; `node_modules` from attempt 1 (307 entries) is still present in the worktree, so the build and browser checks can run.

**adapter worker (attempt 2).** Has read every owned module plus `sessions.py`, `verification.py`, `checks.py`, `projectRoutes.ts`, `server/projects.test.ts`, both contract families with README and export files, both feature folders and the CHEATSHEET. It confirmed the venv interpreter path used by the policy's workflow-unit check. Last stated intent: still reading before changing anything. No refusal or harness notice in this transcript so far.

**Code reviewed this pass:** none. Both worktrees have an empty `git diff` against `80a9217`.

**Findings.** No new findings. The attempt-1 P1 (no implementation) is now being addressed by attempt 2 and is downgraded to "watch". Next pass should see the first edits from at least the adapter lane, whose reading is further along.

## Pass 4: 2026-09-22 23:26 UTC (T+31 min)

**State: first code from both lanes. The ui lane has a complete draft and has run its checks; the adapter lane is mid-rewrite of the controller (three modules edited, six deliverables still untouched). No completion files, no `verification/`.**

### Ownership check

Both lanes are inside their boundaries. ui touched only `src/projects/` and `tests/project-workflows/`; adapter touched only `workflow/` and `features/project-workflows/`. Nothing under `docs/`, manifests, `src/App.*` or `features/parallel-reviewers/`.

### ui lane (session a8bc7a91): 386 insertions, 38 deletions, 2 new files

| File | Change |
| --- | --- |
| `src/projects/reviewers.ts` (new) | Pure helpers: `severityCounts`, `blockedByWording`, a status-wording table keyed on `accepted / blocked / rejected / timed_out / superseded` |
| `src/projects/ReviewDetail.tsx` | Reviewer strip above the findings (id, own verdict, status wording, severity counts, launched/accepted times), a Reviewer column, a reviewer filter that composes with the group-by toggle, the combined verdict kept as headline, a "Blocked by …" line naming the blocking and superseded reviewers, per-reviewer session ids in the facts list |
| `tests/project-workflows/fixtures.ts` | New workflow `reviewers-flow` with three runs: two-reviewer approved (five findings, one raised by both reviewers), two-reviewer blocked (`coverage` blocked, `general` superseded), legacy 1.3.0 single reviewer. `RawReviewer` type, `projectReview` fills a one-entry `reviewers` list named `review` for sections without one. Contract version constant bumped to 1.4.0. Existing runs untouched |
| `tests/project-workflows/seed.ts` | Writes the three runs as real run directories; plan pins `reviewers: [{reviewer_id, prompt}]`; blocked run has a failed review task and a `blocked` event |
| `tests/project-workflows/reviewers.spec.ts` (new) | `[scenario:viewer-two-reviewers]`: run list, strip order and verdicts, five rows with two duplicates kept, filter by reviewer in both grouping modes, blocked-by wording, legacy one-entry strip, three screenshot attachments |
| `tests/project-workflows/review.spec.ts` | Existing column-header assertion gains "Reviewer" |

**Checks the worker ran** (from its transcript, not re-run by this reviewer):

| Check | Result | Assessment |
| --- | --- | --- |
| `npm run build` | 20 TS errors, all "`reviewers` does not exist on `ReviewResult`" and the implicit-any fallout | Expected: the base contract is 1.3.0; gated at the candidate |
| `npm run test:unit` | 130 pass | Gates in worker phase; fine |
| eslint on changed files | clean | |
| tsc on the test files (ignoring tsconfig) | clean | |
| worker-phase Playwright | Fails at fixture load: zod rejects `contract_version: "1.4.0"` and the `reviewer` key on findings | Expected for the same reason; the worker did not weaken the fixtures to pass |

**Findings, ui lane.**

- P1 (cross-lane, watch): the UI has committed to a per-reviewer `status` vocabulary of `accepted | blocked | rejected | timed_out | superseded` and asserts `data-status="accepted"` on approved reviewers in the browser test. The adapter's controller (see below) never writes `timed_out` or `rejected` and overwrites `accepted` with `succeeded` on unanimous approval. The PRD lists "status" without an enumeration, so neither lane is wrong yet, but the candidate phase runs the browser test against the real server; if `contracts/projects` 1.4.0 exports the controller's raw statuses the scenario fails. The adapter's completion summary must state the enumeration it chose and export_state must map to it.
- P2 (cross-lane): the fixture's fill for a legacy section (`status` derived from the verdict, `launched_at: null`, `accepted_at` = `reviewed_at`, `transport` from the section) is the UI's guess at what `server/projects.ts` will do. The legacy assertions in the scenario depend on that exact fill in candidate mode.
- P2 (cross-lane): the fixture documents the section's `reviewer_session_id` as "the first declared reviewer's session". The adapter's `combined_review` writes the top-level `reviewer` field as every session id joined with commas. One of the two has to give in export_state.
- P3: `blockedByWording` has a branch for "approved with an unresolved P0/P1", but the controller marks such a reviewer `blocked` in `_decide`, so the viewer will say "blocked the candidate" for a reviewer whose own verdict reads Approved. Not covered by any fixture. Cosmetic until the status vocabulary is settled.
- P3: the "All" filter button and the per-reviewer buttons share `data-testid="filter-reviewer"`, distinguished by `data-reviewer`. Fine, but `filter-reviewer` count assertions in the legacy case (`toHaveCount(2)`) encode that design.
- Good: existing runs and scenarios untouched; the seeded `plan.reviewers` shape `{reviewer_id, prompt}` matches the adapter's strict validation exactly (any extra key would be rejected); duplicate findings stay two rows; no legacy branch in the component.

### adapter lane (session 11b209df): 522 insertions, 217 deletions, 3 new files, in progress

| File | Change |
| --- | --- |
| `workflow/sessions.py` | `DEFAULT_REVIEWER = "review"`, `validate_reviewer_id` (lane rules, reserved ids, not a lane of the run), `review_node` (`review` or `review-<id>`), `plan_reviewers` (strict `{reviewer_id, prompt}`, non-empty, distinct), `reviewer_ids`, `review_nodes`, `reviewer_of_node` |
| `workflow/prompts/review.md` (new) | The built-in brief, extracted verbatim from the old `review_prompt` |
| `features/project-workflows/reviewers/general.md`, `coverage.md` (new) | Example briefs; `general.md` is byte-identical to the built-in |
| `workflow/automatic.py` | `review_brief`/`review_prompt(runtime, patch, reviewer)`, per-reviewer completion protocol with an independence paragraph, `ReviewStatus` (combined file plus `automatic-review-<id>.json`), `read_review_completion(reviewer_id)`, `wait_reviews` over every receipt with per-reviewer deadlines, `rebind_reviewers`, `check_independence` (worker UUIDs and other reviewers), `combined_review`/`_decide` over the set, `_record_partial`, `stop_reviewers`, print mode per reviewer |
| `workflow/interactive.py` | `pane_label`, `launch_name` for `review-<id>`, `run_reviewer(reviewer_id, …)` with a per-reviewer `Edit(//<its completion file>)` allow rule, `attach-one --node review-<id>`, reviewer panes in declared order each split right of the previous |

Not yet touched: `pipeline.py` (the `launch_reviewer`, `stop_reviewer`, `reconcile_reviewer` wrappers that `automatic.py` now calls with a reviewer id, `check_review`, manual `review --reviewer`, `approve`), `launch.py` (feature 2.1.0), `export_state.py` 1.4.0, both contract families, `server/projects.ts`, every test, every doc. The module is therefore inconsistent at this instant and would not import cleanly against the old wrappers; that is normal mid-edit.

**Findings, adapter lane.**

- P1: `ReviewStatus` stores the default reviewer's own status in the combined file (`reviewer_status_path` returns `automatic-review.json` for id `review`) and `save` writes `{**per_reviewer, **combined}` so the combined `status` key overwrites the per-reviewer one. After `load`, `statuses["review"]["status"]` is the combined status, not the reviewer's. Consequences: the default reviewer's `accepted` is lost on disk the moment `wait_reviews` saves (combined is `running`), `supersede_running` after a reload sees `running` and would mark the reviewer that actually delivered the verdict as `superseded`, and export_state cannot recover a per-reviewer status for the default-reviewer case at all. A nested `reviewers` map inside the combined file, or a distinct key for the reviewer-level status, avoids the collision.
- P1: `_decide` sets every reviewer's status to `succeeded` on unanimous approval, replacing `accepted`. Deadline expiry and a rejected file both record `status: blocked` with an `error` string. So the on-disk vocabulary is `pending / launching / running / accepted / blocked / superseded / succeeded / needs_reconciliation`, which is not what the UI built against (see the ui P1). Whichever lane is right, the export mapping has to be explicit.
- P2: `combined_review` writes top-level `reviewer` as a comma-joined list of session ids. `runtime.validate_review` and the existing `check_review` treat that field as one identity; the UI expects the first reviewer's session. Needs a decision before `export_state.py` 1.4.0.
- P2: print mode waits for reviewers sequentially in declared order (`process.wait` per reviewer), so "the first block decides" holds only in declared order: a later reviewer's early block waits for every earlier one to finish or time out. Acceptable for a headless fallback but it is a deviation from section 4 and should be stated in the completion summary.
- P2: on the block path, `wait_reviews` returns early and `_accept_native` runs `check_independence` before `_decide`. If a superseded reviewer's session row has vanished from `claude agents --json` by then, the run's recorded error becomes "identity changed or is not independent" rather than "reviewer X blocked". Rows for finished sessions normally persist, so this is an edge case; worth a test.
- P3: `review_brief` collapses all whitespace with `" ".join(text.split())`, flattening a multi-paragraph custom brief to one line. Harmless for the prompt, but a brief that relies on lists or headings loses them.
- P3: the completion-protocol example already says `"version": "1.2.0"` while `contracts/workflow/reviewCompletion.schema.json` is still at its old version in this worktree. Consistent once the contract lands; a pending item, not a defect.
- P3: `plan_reviewers` rejects an item with any key beyond `reviewer_id` and `prompt`. Deliberate strictness; the UI seed matches it, but any future field (for example the lane scoping in PRD section 7) will need a version bump.
- Good: per-reviewer completion file is the only write each reviewer may make (`Edit(//<file>)` per reviewer); independence now covers reviewer-to-reviewer UUIDs; each deadline counts from its own receipt; the interrupted-launch path leaves the launched reviewers running, records `needs_reconciliation`, and launches nothing, exactly as section 4 asks; `_record_partial` keeps A's accepted verdict when B times out (one-times-out scenario).

### Cross-lane summary

Three things must line up before the candidate phase, all decided by the adapter and consumed by the UI: the per-reviewer `status` enumeration, the legacy fill in `server/projects.ts`, and what the section's `reviewer_session_id` means. The UI worker built its fixtures from the PRD as instructed and did not copy anything from the adapter tree (it looked, but the tree was clean at the time).

## Pass 5: 2026-09-22 23:37 UTC (T+42 min)

**State: the ui lane has finished and written its completion file (23:34). The adapter lane has landed the contracts, server adapter, export and pipeline changes and is now fixing its own test suite. The controller was interrupted at 23:33:35 and resumed nine seconds later as PID 1337122 with both workers untouched.**

### ui lane: completed

`ui.completion.json` reports status `completed`, summarises the deliverables accurately, lists checks honestly (build failed on the 1.3.0 types, unit 130/130, worker-phase browser suite failed at config load, candidate-phase not executed) and records eight open assumptions. Since pass 4 the worker re-read the adapter's in-progress diff (read-only) and rewrote `reviewers.ts` around a permissive `statusWording` plus `blockingReason`/`outcomeWording`, and changed its fixtures to follow what it saw in the adapter's controller.

### adapter lane: contract landed, tests in progress

| File | Change since pass 4 |
| --- | --- |
| `contracts/projects/v1.ts`, `reviewResult.schema.json`, `examples.ts`, `contract.test.ts` | `reviewerEntrySchema` (`reviewer_id`, `transport`, nullable `session_id`, nullable `verdict`, `findings`, nullable `launched_at`/`accepted_at`, `status`), `REVIEWER_STATUSES = accepted / blocked / superseded / pending`, `reviewer` required on every finding, review result at 1.4.0, run inputs left at 1.3.0. Cross-field rules: distinct ids and sessions, run-wide transport, unanimous approval, per-reviewer findings must equal the combined list filtered by reviewer |
| `contracts/workflow/feature.schema.json` 2.1.0, `reviewCompletion.schema.json` 1.2.0, tests | `reviewers` with a reserved-id-excluding pattern; `node_id` `^review(-[a-z0-9-]{1,32})?$`; 1.0.0 and 1.1.0 files still accepted |
| `server/projects.ts`, `server/projects.test.ts` | Accepts export 1.4.0; `projectReviewers` serves the recorded list or fills one entry named `review` (`launched_at: null`, `accepted_at` = `reviewed_at`, status from the verdict); new two-reviewer and one-blocks route tests; the "unknown version" sample moved from 1.4.0 to 1.5.0 |
| `workflow/export_state.py` 1.4.0 | `reviewer_entries` maps the controller's status words through `REVIEWER_STATUS = {succeeded: accepted, accepted: accepted, blocked: blocked, superseded: superseded}`, else derives from the verdict, else `pending`; `launched_at` from each reviewer's receipt; findings tagged `review` when untagged |
| `workflow/pipeline.py` | `--reviewer id=path` at prepare, `check_reviewers` (declared order, distinct identities, unanimity), `check_review(..., reviewers=)`, `combine_imported_reviews`, manual `review --reviewer <id> --review-file` with per-reviewer `review-<id>.imported.json` and a wait message until every reviewer is imported, `approve` refused at the review gate and re-validating `review.json` at integration approval, reviewer-aware `launch_reviewer`/`reconcile_reviewer`/`stop_reviewer` |
| `workflow/launch.py` | Feature 2.1.0 with `reviewers` validated against lane ids, brief files must exist and be non-empty, `--reviewer` flags handed to prepare, dry-run prints the reviewer list |
| `workflow/test_interactive.py`, `test_pipeline.py` | Updated for the new signatures |

The adapter's own background run of the workflow unit suite (started before the pipeline and test edits) shows 15 failures and 5 errors out of 84, all in the reviewer tests of `test_automatic`, `test_pipeline`, `test_lanes` and `test_export`; that is the old tests against the new signatures and file names, and the worker is working through them. Contract tests pass; the server suite passes after the version-sample fix.

### Findings

- **P0 (cross-lane, ui side, now verifiable): the ui fixtures use a reviewer `status` the contract rejects.** `tests/project-workflows/fixtures.ts` line 783 gives both approved reviewers `status: 'succeeded'`, and the legacy fill at line 954 derives `'succeeded'` from an approved verdict. The adapter's `REVIEWER_STATUSES` is `accepted | blocked | superseded | pending`; export_state maps the controller's `succeeded` to `accepted` and the server's section schema enforces the same enum. Consequences at the candidate: the mock projection calls `validateReviewResult` at module import, so every project-workflows spec fails to load in worker phase; in candidate phase the seeded 1.4.0 export carries `status: 'succeeded'`, which the server's zod section schema rejects, so the reviews route answers RUN_STORAGE_INVALID and the scenario fails. The ui worker followed the adapter's in-progress controller vocabulary rather than the PRD or the contract; the earlier pass 1 note about copying from the adapter tree is exactly this failure mode. Fix is two string literals (`'succeeded'` to `'accepted'`), but the ui worker has ended its turn and may not edit further, so the operator must decide: a follow-up run, or accept the candidate-phase failure and fix on the integrated branch.
- **P0 (cross-lane, ui side): the ui fixtures project run inputs at contract 1.4.0.** `fixtures.ts` line 979 (`projectInputs`) uses `CONTRACT_VERSION = '1.4.0'`, while the adapter left `runInputsSchema` at `version130` and `server/projects.ts` serves inputs at 1.3.0 (line 576). `validateRunInputs` runs at import, so this alone breaks config load for the whole browser suite in both phases, independent of the status fix. The ui completion file lists this as open assumption 2, so the worker knew it was a coin flip. One-line fix (`'1.3.0'` for inputs).
- P1 (adapter, still open from pass 4): the default reviewer's per-reviewer status collides with the combined status in `automatic-review.json`. export_state now papers over it by mapping the combined `succeeded`/`blocked` to a reviewer status, which is correct for the single-reviewer case by coincidence (one reviewer, one outcome). It remains wrong on resume paths that call `ReviewStatus.load` and then `supersede_running`.
- P2 (adapter): `combined_review` still writes the top-level `reviewer` as a comma-joined session list. The adapter has now made that the contract (`reviewer.session_id` doc comment, server test asserts the joined string), and the ui fixtures follow it, so the two lanes agree. It is a wart: the field is documented elsewhere as "the Claude session UUID", and anything that treats it as one id (the review node's `session_id` in the snapshot, `resume`, transcripts) needs the first entry. The server test shows the snapshot review node still validates for a two-reviewer run, so nothing breaks today.
- P2 (adapter): `check_reviewers` requires each entry to have exactly `reviewer_id, session_id, verdict, accepted_at`. `combined_review` writes exactly those. Fine, but `_record_partial` is the only writer for the timeout path, and it goes through `combined_review` too, so consistent.
- P2 (adapter): print mode sequential wait, unchanged from pass 4.
- P3 (adapter): `REVIEWER_STATUSES` has `pending` but no `timed_out`/`rejected`; a deadline and a rejected file both become `blocked` with `verdict: null`. The contract test named `timedOut` documents this. The viewer's `blockingReason` handles it with a combined wording. Acceptable, should be stated in the RUNBOOK.
- P3 (ui): the browser scenario asserts `reviewer-status` text `completion file accepted` for approved reviewers, which `statusWording` produces for both `accepted` and `succeeded`, so once the fixture status is fixed the wording assertions hold.
- Good (adapter): the manual-import path matches the PRD (`approve` refused until every declared reviewer is imported; a file carrying a `reviewers` list is refused as not-one-reviewer's); the feature schema's reviewer-id pattern excludes every reserved id and prefix; contract tests cover shared sessions, unknown reviewer on a finding, per-reviewer findings diverging from the union, and old contract versions.

### What happens next if nothing changes

The adapter will finish its tests and write its completion file; the controller will freeze, verify each lane in isolation (ui build and browser expected to fail there and be deferred), then build the combined candidate, where the ui browser check will fail at config load for both P0 reasons above. The run would then stop at candidate verification with no review launched. Both fixes are on the ui side and total three characters of intent; the operator may prefer to let the run reach that point so the failure is recorded as evidence, then patch on the feature branch.

## Pass 6: 2026-09-22 23:48 UTC (T+53 min)

**State: no handoff yet. The ui lane is finished and idle. The adapter lane (22 files, 1783 insertions) is on documentation and tests; `automatic.py` and `interactive.py` are unchanged since pass 5. Controller PID 1337122 is waiting for the adapter's completion file.**

### adapter lane since pass 5

| Area | Change |
| --- | --- |
| `contracts/projects/README.md`, `contracts/workflow/README.md`, `workflow/CHEATSHEET.md` | 1.4.0 section describing `reviewers`, the per-finding `reviewer` tag, the unanimity rule, the legacy fill and the comma-joined `reviewer.session_id`; feature 2.1.0 and completion 1.2.0 documented; CHEATSHEET gains `--reviewer id=brief` at prepare, `review --reviewer <id>` per import, `attach-one --node review-<id>`, the new run-directory files (`review-<id>.*`, `<node>.imported.json`, `automatic-review-<id>.json`) and the reviewer-session naming. All statements checked against the code; none are wrong |
| `workflow/test_export.py` | Legacy section asserts the one-entry `review` fill; new `ReviewerExportTests` builds a two-reviewer record with per-reviewer status files and receipts, checks entry order, times, status mapping, the superseded/no-status-file case, the exported version and that a stranger reviewer id is refused at `ExportRuntime` |
| `workflow/test_lanes.py` | `DeclaredReviewers`: feature 2.1.0 validation through `launch_commands` (lane-id, reserved, duplicate, missing/empty brief, empty list, reviewers on 2.0.0 all refused before any Git action; the step-by-step `prepare` refuses `ui`, `review`, `review-x`), manual import requiring every reviewer with the exact refusal messages, the default reviewer's single-file flow, and an automatic run with two declared reviewers over the shared worktree (two receipts, per-reviewer prompts and node ids, distinct sessions). `FindingLanes` is re-run as a subclass for a declared reviewer's own completion file |
| `workflow/test_pipeline.py`, `test_interactive.py` | Adjusted for the new signatures (not re-read this pass) |
| `workflow/test_automatic.py` | Untouched on disk (mtime 22:55). The worker's rewrite script failed with a `SyntaxError` at 23:40 and a second attempt at 23:44 has not written the file yet |

Second suite run (test_pipeline, test_export, test_lanes; 42 tests, 64 s): 3 failures. One (`sessions.starts` order in the manual-import test) is already fixed in the diff with `sorted(...)`. The export test's two-reviewer case and `test_check_review_accepts_finding_links_and_blocked_verdicts_only_when_asked` were still failing at 23:45 and the worker is iterating.

### Findings

- P1 (adapter, coverage gap so far): none of the PRD section 6 controller scenarios (`two-approve` end to end through `_accept_native`, `one-blocks` with the superseded status and stop, `p1-anywhere`, `one-times-out` retaining A's verdict, `wrong-node` rejection, `shared-identity`, `interrupted-launch` resume) exist yet; they belong in `test_automatic.py`, which is the one file not yet rewritten. The `test_lanes` automatic run covers the happy path with fake sessions only. Until that file lands, the native multi-reviewer path in `automatic.py` (the largest change in the run) has no test.
- P2 (adapter, test design): the export test models the `p1-anywhere` shape as `verdict: approved, status: blocked` and asserts it round-trips. That is the on-disk truth the controller produces, so the test is right, but it fixes the contract to a combination the viewer has to explain ("approved with an unresolved P0/P1 finding"), which the ui's `blockingReason` does. Worth a line in the RUNBOOK.
- P2 (adapter, docs pending): `workflow/RUNBOOK.md` review section and the `features/project-workflows/README.md` note are PRD deliverables not yet touched.
- P3 (adapter, test hygiene): `DeclaredReviewers.test_feature_reviewers_are_validated_and_pinned_into_the_plan` mutates the committed feature file in place several times and relies on later cases restoring it; the final `write_text("  \n")` on `coverage.md` is never restored. Harmless because each test gets a fresh temporary repository, but the test is long enough to be fragile.
- Unchanged from pass 5: the two ui-side P0 fixture mismatches (`status: 'succeeded'`, inputs at 1.4.0) still stand and will surface at the combined candidate. The adapter's own `REVIEWER_STATUSES` and the 1.3.0 inputs schema are the settled contract; the ui lane is the side that has to move.
- Unchanged from pass 4: the P1 status collision for the default reviewer in `ReviewStatus`, the P2 joined `reviewer` string (now documented as intended), and the P2 sequential print-mode wait.

## Pass 7: 2026-09-22 23:57 UTC (T+62 min)

**State: no handoff yet. The adapter lane has rewritten `test_automatic.py` (75 KB), the RUNBOOK review section, `workflow/README.md` and the feature README, and is waiting on a full workflow-suite run that started at 23:50 (66 tests in at 23:57, at least one F and one E already visible). Controller code unchanged since pass 5. The ui lane is idle and complete.**

### adapter lane since pass 6

| Area | Change |
| --- | --- |
| `workflow/test_automatic.py` | Every reviewer test class is now a mixin instantiated twice, with the single built-in reviewer and with `general`/`coverage`, for both transports (`AutomaticGraphTests` / `AutomaticTwoReviewerGraphTests`, `PrintReviewerGraphTests` / `PrintTwoReviewerGraphTests`, `NativeReviewerGraphTests` / `NativeTwoReviewerGraphTests`, `ReviewCompletionTests` / `TwoReviewerCompletionTests`). Unit tests cover per-reviewer prompts and completion protocol (own node id, token and file; independence paragraph only with several reviewers), the brief-plus-fixed-blocks composition, per-reviewer rejection cases including the other reviewer's token and node, and `wait_reviews` deadlines, attention events, first-block early return and a missing session. New `ParallelReviewerScenarios` implements PRD section 6 offline: `two-approve`, `one-blocks` (general held at `working`, coverage blocks, general superseded and stopped, export shows both statuses), `p1-anywhere` (B's raw approval kept, B's status `blocked`), `one-times-out` (A's verdict retained in `review.json`), `wrong-node`, `shared-identity`, `interrupted-launch` (resume rebinds general, refuses to launch coverage, run at `needs_reconciliation`). The default-reviewer test asserts slice A's file names and the one-entry list |
| `workflow/RUNBOOK.md` | Review-step section rewritten for several reviewers: briefs, per-reviewer sessions and panes, completion protocol with the 1.2.0 node id, unanimous verdict with the status vocabulary (`succeeded`, `accepted`, `blocked`, `superseded`), per-reviewer deadlines, stop of every reviewer, interruption and reconciliation semantics, print fallback; manual import per reviewer; recovery section names the per-reviewer files; test-suite paragraph names the new classes |
| `workflow/README.md`, `features/project-workflows/README.md` | Summary paragraphs updated; feature README documents the example briefs and the 1.4.0 export section |

### Findings

- Resolved from pass 6 (P1): the PRD section 6 controller scenarios now exist and, from the diff, assert the right things: the statuses of both reviewers, the stop calls in declared order, the retained verdict on timeout, the rejected foreign node id, the shared-UUID refusal, and that nothing is relaunched on resume. Whether they pass is not yet known; the suite is mid-run.
- P2 (adapter, docs vs code): the RUNBOOK's Verdict bullet says the first block "decides at once, without waiting for the other reviewers", and the Print-fallback bullet says the jobs start in parallel. Both are true of native transport, but in print mode `_review_print` waits for the jobs in declared order, so a later reviewer's block waits for earlier ones to finish or time out. The doc should say so, or the code should poll the set. Same root as the pass 4 P2.
- P2 (adapter, downgraded from the pass 4 P1): the default reviewer's per-reviewer status shares `automatic-review.json` with the combined status. The single-reviewer tests show the merged file behaves exactly like slice A's receipt (status `succeeded`/`blocked`, `decision` inside), so nothing regresses today. The leak is that after `ReviewStatus.load`, `statuses["review"]` is the whole combined dict (it carries `reviewers`, `review`, `patch_sha256`), so any future reviewer-level field for the default reviewer collides with a combined one. Worth a short comment or a nested key in a follow-up, not a blocker.
- P3 (adapter, stale line): `workflow/README.md` still lists `export_state.py` as "the versioned run-state.json export (1.3.0)" one paragraph after saying the export is 1.4.0.
- P3 (adapter, test fixtures): the scenarios rely on new `FakeSessions` knobs in `test_pipeline.py` (`reviewer_states`, `reviewer_verdicts`, `reviewer_mutate`, `reviewer_writes_file` as a set, `reviewer_session_id` as a map, `native_id(node)`). Not reviewed line by line this pass; the interface reads coherent from its use.
- Unchanged: the two ui-side P0 fixture mismatches (`status: 'succeeded'` in the seeded 1.4.0 sections and the legacy fill; run inputs projected at 1.4.0). Nothing on the adapter side changes that outcome. The RUNBOOK's status vocabulary now states plainly that the controller's own files say `succeeded` while the export and contract say `accepted`, which is exactly the distinction the ui worker missed.

## Pass 8: 2026-09-23 00:06 UTC (T+71 min)

**State: no handoff yet, but the adapter is on its final verification. Its first full workflow-suite run (195 tests, 540 s) ended at 23:59 with one failure and one error, both in the new PRD scenarios; it fixed the controller at 23:59 and started the final full run at 00:01 (47 of 195 in at 00:06). Contract tests, the 130-test unit regression, the production build and the server adapter suite all pass on its side. The ui lane is idle and complete. Controller PID 1337122 is still waiting.**

### The two scenario failures and the fix

| Test | Failure | Cause | Fix (in `_decide` and `_record_partial`) |
| --- | --- | --- | --- |
| `test_one_blocks_while_the_other_is_still_working` | error text was "blocked the candidate (general, coverage)"; expected "(coverage)" | `_decide` treated the undecided, superseded reviewer as a blocker in the message | blockers are now only decided reviewers whose decision blocks; undecided reviewers are listed separately and named only when there is no blocker |
| `test_one_times_out` | `KeyError: 'decision'` on general's status file | accepted decisions are held in memory (`state.decisions`) and were only written to the status files by `_decide`; the deadline path bypassed it | `_record_partial` now calls `record_decisions()` and saves before writing the partial `review.json` |

The current shape: `wait_reviews` marks a reviewer `accepted` on disk and keeps its decision in memory; `_decide` persists every decision on the combined path; `_record_partial` persists them when a wait-time failure (deadline, rejected file, missing session) ends the run; post-wait failures (identity, worktree or evidence change) deliberately record no decision, which the `assert_refused_after_wait` tests pin down. A controller interrupted mid-wait loses the in-memory decisions, but on resume the accepted reviewer's file is still there and idle, so it is re-read and re-validated against the same bindings; idempotent, no relaunch. I found no hole in that.

### Findings

- No new findings on the adapter side. The `_decide` change is correct and narrows the error message to the actual cause; `undecided` without a blocker cannot happen through `wait_reviews`, so that branch is defensive only.
- Pending: the final suite result. At pass 7 the RUNBOOK claimed the scenarios pass; that claim is now backed by the worker's re-run of the two tests ("The PRD scenarios pass", 00:01) and will be backed by the full run within minutes.
- Unchanged: the two ui-side P0 fixture mismatches. Once the adapter writes `adapter.completion.json`, the controller will freeze both lanes, verify each in isolation (ui's build and browser checks expected to fail there and be deferred to the candidate), build the combined candidate, and the ui browser check will fail at config load. The next pass should catch the freeze and the first verification packets.

## Pass 9: 2026-09-23 00:15 UTC (T+80 min)

**State: handoff done. The adapter wrote its completion file after its final full suite passed (195 tests OK, 537 s), the controller stopped both workers and captured immutable snapshots at 00:11:15, the ui lane's isolated verification finished at 00:11:53, and the adapter's isolated verification (attempt 1) is running.**

### Snapshots

| Lane | Snapshot commit | Changed files |
| --- | --- | --- |
| ui | `35b83dd` | `src/projects/ReviewDetail.tsx`, `src/projects/reviewers.ts`, `tests/project-workflows/{fixtures,review.spec,reviewers.spec,seed}.ts` (6 files) |
| adapter | `72c92ed` | 26 files under `contracts/`, `server/`, `workflow/`, `features/project-workflows/` |

Both changed-file lists are inside the lanes' owned paths; the freeze raised no ownership violation.

### adapter completion file

Status `completed`. The summary is accurate against everything reviewed in passes 4 to 8 and reports checks honestly: workflow unit 195 OK, contracts 18 pass, unit regression 130 pass, build exit 0, server adapter 35 pass; not executed: the section 8 live smoke, the live panes scenario, `viewer-two-reviewers` and any Playwright suite. Nine open assumptions, of which the ones that matter for the candidate:

- Only `reviewResult` moves to 1.4.0; `runInputs` stays at 1.3.0. The adapter adds: "The UI fixture still projects reviewResult as 1.3.0 without reviewers and must be updated by the UI worker." That sentence describes the base fixture in the adapter's own worktree, not the ui lane's; the ui lane did update the fixture, but to the wrong inputs version and status words (the pass 5 P0s). So both lanes independently identified the seam and still missed each other on it.
- Per-reviewer status vocabulary in the controller files is `pending, launching, running, accepted, blocked, superseded, succeeded, needs_reconciliation`, mapped by the export to `accepted / blocked / superseded / pending`. Stated plainly, which is what the ui side lacked.
- `review.json` is written on a deadline or rejected file only when at least one verdict was already accepted; identity, worktree or evidence refusals never record a partial review.
- `features/parallel-reviewers/` was not touched (outside ownership), and that feature declares no reviewers, so this run's own review will use the single built-in reviewer. In other words the run cannot exercise its own feature live; that is the PRD's section 8 smoke test, which stays with the operator.

### ui isolated verification (worker phase, attempt 1)

| Check | Exit | Gate treatment |
| --- | --- | --- |
| `frontend-build` | 2 (15 TS errors, all `reviewers`/`reviewer` missing from the 1.3.0 types) | deferred to the candidate gate |
| `frontend-unit-regression` | 0 (130 passed) | gating, passed |
| `project-workflows-browser` | 1 (ZodError at config load: `contract_version` expected 1.3.0, unrecognized key `reviewer`) | deferred to the candidate gate |

Gate `passed` with `deferred_checks: [frontend-build, project-workflows-browser]`, exactly as the ui task said to expect. The trusted verifier's results match the worker's own report line for line, which is a good sign for the worker's honesty.

### Findings

- No new code findings; nothing changed in either worktree since pass 8 apart from the adapter's completion file.
- Prediction for the candidate phase, unchanged since pass 5: the combined candidate will contain the 1.4.0 contract, so the ui build should now pass, but the browser suite will fail at config load twice over (`validateRunInputs` at 1.4.0 against the 1.3.0 schema; `validateReviewResult` on `status: 'succeeded'`). If the harness somehow loads, the seeded exports carry `status: 'succeeded'` in their review sections, which the server's zod section schema rejects, so the reviews route answers RUN_STORAGE_INVALID for all three `reviewers-flow` runs. The candidate gate will fail on `project-workflows-browser`, the run will not launch a reviewer, and the branch will not be verified.
- Worth noting for the operator: the fix is confined to `tests/project-workflows/fixtures.ts` in the ui snapshot: line 979 `contract_version: CONTRACT_VERSION` in `projectInputs` must be `'1.3.0'`; the two `status: 'succeeded'` literals (the approved two-reviewer section near line 783 and the legacy fill near line 954) must be `'accepted'`. `reviewers.ts` already treats `accepted` and `succeeded` as the same wording, so the browser assertions hold once the fixture agrees with the contract.

## Pass 10: 2026-09-23 00:24 UTC (T+89 min). Run outcome: blocked at the combined candidate

**State: terminal. The adapter's isolated verification passed at 00:20:45. The combined candidate `9001bf9` was built and the ui candidate check blocked on attempts 1, 2 and 3 (00:21:17, 00:21:51, 00:22:23), each a fresh `automatic-step` controller, each identical. The attempt limit is exhausted, the graph is stopped at `candidate` with the error "Combined candidate failed ui checks; see verification/candidate/ui/3/packet.json", no reviewer was launched, and no controller process is alive. Per the RUNBOOK, a run stopped this way is retained but not resumable; changed code means a new run.**

### adapter isolated verification (worker phase, attempt 1)

| Check | Result |
| --- | --- |
| workflow-unit (`python -m unittest discover -s workflow -t .`) | 195 passed, 0 failed, 9 min |
| shared-contract (`npm run test:contracts`) | 18 passed |
| backend-regression (`npm run test:unit`) | 130 passed |
| backend-build (`npm run build`) | exit 0, deferred to the candidate gate by policy |

Gate passed, no capture errors. The trusted verifier's numbers match the worker's completion file exactly.

### ui candidate verification (candidate phase, attempts 1 to 3, all identical)

| Check | Result | Cause |
| --- | --- | --- |
| frontend-build | exit 2, two errors | `src/projects/reviewers.ts` lines 48 and 49: `reviewer.status === 'timed_out'` and `=== 'rejected'` compare the contract's `'pending' | 'accepted' | 'blocked' | 'superseded'` type with literals outside it (TS2367, no overlap). New finding, not predicted: the permissive `STATUS_WORDING` table is typed `Record<string, string>` and compiles, but `blockingReason` compares the typed `status` field directly |
| frontend-unit-regression | 130 passed | |
| project-workflows-browser | exit 1 at config load | `validateReviewResult` in `fixtures.ts` line 956 throws `ZodError: reviewers[0].status` expected one of accepted, blocked, superseded, pending; the fixture gives `'succeeded'`. This is the pass 5 P0. The second pass 5 P0 (`projectInputs` at 1.4.0) is masked because the review projection runs first and throws; it would fail next |

The candidate adapter check never ran: the candidate node fails on the first blocked lane. Nothing about the adapter's code caused the block.

### Consolidated findings for the operator, ranked

1. **P0, ui, blocks the run:** `tests/project-workflows/fixtures.ts` uses reviewer `status: 'succeeded'` (approved two-reviewer section near line 783, legacy fill near line 954). The contract enumerates `accepted | blocked | superseded | pending`; export_state maps the controller's `succeeded` to `accepted`. Change both to `'accepted'`.
2. **P0, ui, blocks the run:** `tests/project-workflows/fixtures.ts` line 979 projects run inputs with `CONTRACT_VERSION` (1.4.0); the adapter kept `runInputs` at 1.3.0 in `contracts/projects/v1.ts` and `server/projects.ts`. Use `'1.3.0'` there.
3. **P0, ui, blocks the run:** `src/projects/reviewers.ts` lines 48 and 49 compare `status` with `'timed_out'` and `'rejected'`, which the contract type excludes. Delete those two branches (the `'blocked'` branch already carries the "deadline expired or file rejected" wording) or widen the parameter to `string`.
4. **P2, adapter, design:** print-mode reviewers are waited on in declared order, so "the first block decides at once" holds only for native transport; the RUNBOOK states it unconditionally. Poll the set or document the difference.
5. **P2, adapter, design:** the default reviewer's per-reviewer status shares `automatic-review.json` with the combined status and the combined key wins on save; harmless today, a collision for any future reviewer-level field.
6. **P2, adapter, contract:** the top-level `reviewer` in `review.json` and `reviewer.session_id` in the served result are a comma-joined list of session ids when there are several reviewers. Documented and tested, but a string typed as "the Claude session UUID" now sometimes is not one.
7. **P2, controller (pre-existing):** `wait_handoffs` ends the run on the first native `blocked` sighting with no grace period, which killed the healthy ui lane in attempt 1 after a transient classifier refusal in the adapter lane. The operator recovered by relaunching both lanes.
8. **P3, adapter:** `workflow/README.md` still calls `export_state.py` the 1.3.0 export in its module list.
9. **P3, adapter:** `review_brief` collapses whitespace, flattening multi-paragraph custom briefs.
10. **P3, process:** the ui worker read the adapter's in-progress worktree to "align field names" and took the controller's on-disk vocabulary (`succeeded`) instead of the contract the adapter was about to publish. The task text told it to build from the PRD; the peek produced finding 1. The adapter's own completion assumptions flag the exact seam ("The UI fixture … must be updated by the UI worker"), so both lanes saw it and neither could act across the boundary.

### What was delivered and verified

- Adapter lane, snapshot `72c92ed`: contracts 1.4.0 / 2.1.0 / 1.2.0, controller multi-reviewer path with per-reviewer status files and deadlines, interactive panes per reviewer, manual import per reviewer, export 1.4.0, server adapter with the legacy fill, every existing reviewer test doubled for two reviewers, all seven PRD section 6 offline scenarios, docs. Verified in isolation by the trusted verifier: 195 / 18 / 130 tests and a clean build.
- ui lane, snapshot `35b83dd`: reviewer strip, Reviewer column, filter composing with group-by, blocked-by line, three fixture runs and a full `viewer-two-reviewers` scenario. Unit regression verified; build and browser blocked by findings 1 to 3, which are three small edits in two files.
- Not exercised by this run: the PRD section 8 live smoke (two reviewers over a real bundle, panes, `--reviewer-transport print`), because `features/parallel-reviewers/feature.json` declares no reviewers and the run never reached its review node.

### Suggested next step

Apply findings 1 to 3 on top of the ui snapshot (or on the integrated branch after a manual merge of both snapshots), run `npm run build` and the project-workflows Playwright suite in candidate mode, then either start `parallel-reviewers-002` for a clean verified branch or integrate by hand and run the section 8 smoke test. This log ends here; the reviewer loop stops with the run.

