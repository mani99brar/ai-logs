# Review log: viewer-clarity-001

Read-only review of live run `viewer-clarity-001` (feature `viewer-clarity`, spec `docs/PRD_VIEWER_CLARITY.md`).
Run dir: `~/.local/state/md-manager-workflows/viewer-clarity/viewer-clarity-001`. Base `7dba2fd`. Lanes: `ui`, `adapter`. Reviewers: `general`, `coverage`.
Loop: cron job `003fffc3`, runs every 6 min. Severities: P0 blocks acceptance, P1 is a bug, P2 is a correctness or contract risk, P3 is quality or style.

---

## Pass 1 at 2026-09-23 ~07:50Z

**Run state:** both workers are `interactive` (they have not signalled completion). The automatic controller is running as PID 1605389. There is no review yet and no `*.completion.json`.

**ui lane:** no changes yet.

**adapter lane:** 7 files modified. All of them are inside owned paths (`contracts/`, `workflow/`), so there are no ownership violations. So far the work covers deliverable 2 (contract) and part of the cross-field check. Nothing has landed yet for deliverable 1 (capture in `workflow/checks.py`), 3 (`recheck_packet`), 4 (`server/projects.ts`), 5 (Python tests) or 6 (docs).

### Findings

- **P2: the widened artifact schema leaks into other contracts.** `artifactSchema` in `contracts/workflow/v1.ts:18` is reused by `contracts/projects/reviewResult.schema.json` (the `diff` field, about line 301) and by `contracts/workflow/event.schema.json`, and each of those files gained about 100 lines. As a result, a review result's `diff`, and any artifact carried by an event, can now be `kind: "file"` with a `path`. The PRD only asks for this on the worker result. It is additive, so existing data stays valid, but the projects contract family now accepts shapes nobody asked for. Also confirm that the projects README, and any Python hand-written mirror of reviewResult or event, document or mirror the change; `contract.test.ts` only exercises `workerResult`. **Suggested fix:** keep the base `artifactSchema` unchanged for reuse and add a `workerArtifactSchema` union used only by `workerResultSchema`, or record this as an open assumption.
- **P3: `ARTIFACT_KINDS` is exported but unused** (`contracts/workflow/v1.ts:22`). It also duplicates the enum literal inside the union, so the two lists can drift. Either derive the union's enum from it or drop it.
- **P3: the union shape makes errors harder to read.** `z.union` of two strict objects, with `path: z.never().optional()` on the non-file branch, produces poor error messages; a failure reports both branches. A discriminated union on `kind` (the non-file branch keyed by the enum) would give a single clear error. The generated JSON Schema uses `anyOf` plus `"path": {"not": {}}`, which is valid but opaque to readers.
- **P3: a duplicate-path error message is misleading.** In `workflow/verification.py:144-148` (`evaluate_worker`), the Python cross-field check mirrors the TS rule, which is good. But its single error, "Captured files must be distinct changed files", covers two separate failures (a duplicate, and a path that isn't among the changed files), which makes diagnosis harder. The TS side uses two messages. Minor.
- **Note: the cross-field rule has no TS↔Python parity test yet.** `contract.test.ts` checks that `handWritten('workerResult')` rejects the per-field cases. The cross-field cases (the uncaptured path not being a changed file, the duplicate) are asserted only against `validateWorkerResult`, which is correct because a JSON schema can't express them. There is no Python unit test for the `verification.py` rule yet; expect one under deliverable 5.
- **Note: `examples.ts` changes the shared example.** `examples.workerResult.changed_files` now has 3 entries, including `public/viewer.png`. Other tests that assume `changed_files.length === 1` or a specific first entry could break. Verify when the adapter runs `npm run test:contracts` and `test:unit`.

### Watch list for the next passes
- `workflow/checks.py`: capture must happen only in the worker phase, after the clean-at-snapshot check and **before** `run_lane_commands`. Check that caps are named constants (512 KiB and 8 MiB), that detection uses a UTF-8 decode and rejects NUL, that symlinks and non-regular files are handled (they should go to `missing` or not be followed), that the budget is applied in a deterministic order, and that the candidate phase captures nothing.
- `recheck_packet`: a hash mismatch on a `file` artifact must fail the packet.
- `server/projects.ts` artifact route: text content type, no path traversal through `path`.
- ui lane: fixtures must match PRD 4.1 exactly, and the lane must stay inside `src/projects/` and `tests/project-workflows/`.

---

## Pass 2 at 2026-09-23 ~07:55Z

**Run state:** there are no new events since `controller running`, and no `*.completion.json` yet. Both workers are still interactive.

**Ownership:** no violations. The adapter lane changed 18 files, all under `workflow/`, `contracts/`, `server/` and `features/project-workflows/`. The ui lane changed 3 files, all under `src/projects/`.

### adapter lane: new work
The capture (`workflow/checks.py`), the server pass-through (`server/projects.ts`), the docs and the new `workflow/test_checks.py` have all landed. Test names cover `capture-text-files`, caps and the text rule, budget order, a symlink not being followed, `capture-before-checks`, `tampered-file-artifact`, and distinct changed files.

**Verified correct:**
- Capture runs after the clean-at-snapshot assertion and before any check (`checks.py:~207`). It is worker phase only, and the candidate phase gets neither artifacts nor the `files_not_captured` key. This matches PRD 4.1.
- The caps are named constants: `FILE_CAPTURE_LIMIT` is 512 KiB and `PACKET_FILE_CAPTURE_LIMIT` is 8 MiB. Each file is read as at most limit + 1 bytes, so an oversized file is never fully loaded.
- Symlinks, symlinked parent directories (checked with `resolve(strict=True).is_relative_to(root)`), deleted files and directories all become `missing`.
- On the server, `path` and `files_not_captured` pass through unchanged because `projectWorkerResult` spreads each artifact (`server/projects.ts:1080`). A `file` artifact is served as `text/plain; charset=utf-8`, and the route already sets `nosniff` (`server/projectRoutes.ts:191`), so a captured `.html` or `.svg` can't run in the viewer.

**Findings:**
- **P2: packet-level artifact registration drops `path`.** `artifactRegistrationSchema` (`server/projects.ts:931`) is a non-strict `z.object`, so it silently strips `path` when registrations are parsed at `server/projects.ts:765-768`. The served result reads `raw.artifacts` and does keep `path`, but if anything later compares a registration to a result by value (the `EVIDENCE_MISMATCH` check at about line 1076), `path` is not part of the comparison. A tampered `path` in `packet.result`, with bytes unchanged, would still be served. `evaluate_worker` only checks that paths are distinct and belong to the changed files, so it can't catch two `file` artifacts whose paths were swapped. **Suggested fix:** add `path` to the registration schema and include it in the mismatch comparison, or have `recheck_packet` bind each file artifact's path to its bytes.
- **P3: the budget is first-fit, not stop-at-first-overflow** (`checks.py capture_changed_files`). Once one file overflows the 8 MiB budget, later smaller files are still captured. That's deterministic, and the test name says "spent in changed-file order", but PRD 4.1 should say which rule applies. Record it as an open assumption if the PRD is silent.
- **P3: `capture.add` stats the file again** after `capture_changed_files` has already checked it and read its bytes (`checks.py:83`). This is harmless, but the check is duplicated and has a small race window. Because `content` is passed in, the stored bytes and the digest stay consistent.
- **P3:** the Python error message in `verification.py:148` still covers two failures (carried over from pass 1).

### ui lane: new work (in progress)
- `status.ts`: adds `Executor`, `EXECUTOR_LABEL`, `executorCategory` and `executorOf`, for PRD 4.3.
- `findings.ts`: adds `findingsForFile` and `linesNamed`, which match a path verbatim for PRD section 2.
- `WorkflowGraph.tsx`: executor dashing, meta text and a legend.

**Findings:**
- **P2: the graph ignores print transport.** `WorkflowGraph.tsx` builds the accessible description with `EXECUTOR_LABEL[node.kind]`, while `executorOf(kind, transport)` (`status.ts:80`) is defined but used nowhere yet. A review node that ran over the print transport will be announced as "one agent session per reviewer" instead of "one print job per reviewer". `GraphNodeView` has no transport field to pass in. It may land later in this lane, so check again next pass.
- **P3: the class name `is-controller` also covers verifier nodes** (`WorkflowGraph.tsx`, the className array). `executor === 'agent' ? 'is-agent' : 'is-controller'` gives verification nodes the class `is-controller`, which is misleading for CSS and for tests. Use `is-${executor}` instead.
- **P3: the legend uses inline styles** (`style={{ listStyle, padding, margin }}`, and on each `li`), and the node dash is an inline attribute. The comment says this avoids a stylesheet rule, probably because CSS is outside the lane's ownership. That's understandable, but it bypasses the app's styling and theming conventions; leave a follow-up to move them to CSS.
- **P3: the meta-line fit is a character-count heuristic** (`META_FIT = 24`, `textLength` plus `spacingAndGlyphs`). Labels a little under the threshold that use wide glyphs can still overflow, and labels just over it get squashed. That's acceptable for SVG, but it's a guess.
- **P3: `linesNamed` quietly fixes reversed ranges.** `path:10-5` yields `[10,10]` through `Math.max`, which drops the `5` without saying so. Either document this or skip reversed ranges.
- **Note: `occurrencesOf` boundary rules look right.** They reject a path embedded inside a longer path, or with a longer extension (`docs/a.mdx`), and they allow a trailing `.`, `:N`, `,` and `)`. A case they can't handle is a path wrapped in quotes followed by a word character, but that's unlikely.
- **Missing so far:** there are no ui tests yet (`tests/project-workflows/` is untouched), and the viewer doesn't consume `findingsForFile` or `linesNamed` anywhere yet.

---

## Pass 3 at 2026-09-23 ~08:00Z

**Run state:** there are no new events and no `*.completion.json` yet. Both workers are still interactive.

**Ownership:** no violations. The ui lane now touches `src/projects/` (7 modified, 2 new) and `tests/project-workflows/` (`fixtures.ts`, `seed.ts`). The adapter file set hasn't changed since pass 2.

### adapter lane
- **Pass 2's P2 re-checked and downgraded to P3.** The server's `EVIDENCE_MISMATCH` check (`server/projects.ts:1075`) compares only `run_id`, `node_id` and `attempt`, not artifacts. `recheck_packet` (`workflow/checks.py:312`) goes through `evaluate_worker`, which binds `artifact_id` to its bytes by sha256 but does not bind the `path` to anything: `artifact_id` is `file-{n}-{digest12}` and carries no path. So a `packet.json` edited to swap two `file` artifacts' `path` values still passes the recheck. It's P3 rather than P2 because an attacker who can edit `packet.json` can already rewrite much more (the summary, open assumptions and so on). The PRD's `tampered-file-artifact` scenario only asks for a byte mismatch, which is covered. **Suggested fix, if wanted:** add the path to the artifact id, or record `{path: sha256}` in `evidence`, which is policy-hashed.

### ui lane: new files
`src/projects/files.ts` (pure helpers and the `useRunCapturedFiles` hook) and `src/projects/CreatedFiles.tsx` (the "Files created or changed" panel, with rendered Markdown or the source, findings per file, and a "Show lines" control). Splitting them this way is sensible: the pure helpers are kept out of the component files, which keeps react-refresh from complaining.

**Findings:**
- **P3: DOM ids from `fileAnchorId` can collide** (`files.ts`, `fileAnchorId`). The function replaces every character outside `[A-Za-z0-9_-]` with `_`, so `docs/a.md`, `docs_a.md` and `docs/a_md` all become `file-docs_a_md`. Two changed files like that on one node produce duplicate element ids: the file link scrolls to the wrong panel, and `aria-labelledby` (`${id}-title`) points at the wrong heading. **Suggested fix:** use an injective encoding (for example `encodeURIComponent` with `%` escaped) or an index-based id.
- **P3: `focusPath` is frozen at mount** (`CreatedFiles.tsx`, `const [focus] = useState(() => focusPath)`). A later file link to the same launch node, while `CreatedFiles` stays mounted, is ignored: the new `focusPath` prop never reaches `focus`, and the effect runs only once. File links come from the review node, so opening one normally switches nodes and remounts, which makes this minor. It will bite if the node detail is ever kept mounted across node switches (it has no `key` on node id; worth checking) or if a link is added on the same node. Confirm in a browser test: file link A, back to the review, then file link B on the same lane.
- **P3: large captured sources render one element per line** (`CreatedFiles.tsx` `FileSource`). The source view creates one `<span>` or `<mark>` for each line, and `isMarked` scans every range for every line. A 512 KiB file with about 15,000 lines gives about 15,000 nodes. That works, but it's slow; consider virtualising or showing plain text when there are no marks.
- **P3: the review path uses a non-null assertion.** `reviewPath!` inside `loadReview` depends on `useResource(null, …)` never calling the loader. That's true today, but the dependency is implicit.
- **P3: duplicate paths across lanes resolve to the first lane** (`files.ts` `useRunCapturedFiles`). If two lanes capture the same path (which is only possible if ownership overlaps), links go to the first lane that loads, in `Promise.allSettled` order, which is the node order. That's deterministic but undocumented. It is also O(lanes) extra worker-result fetches per review view, which is fine at 2 lanes.
- **Good:**
  - Captured Markdown goes through the existing `Markdown` component; confirm it still doesn't render raw HTML, since the captured files are content the worker controls.
  - Finding messages are shown as text.
  - The panel says so when a result predates capture, and it lists paths that aren't among the changed files instead of dropping them.
  - The reason wording covers all four reasons.
- **Pass 2's print-transport P2 is still open.** `executorOf` is still not used by `WorkflowGraph.tsx`. `ReviewDetail.tsx` changed, so check next pass whether it passes transport through there.
- **Missing so far:** `tests/project-workflows/` has fixtures and seed data but no new spec or test cases yet.

---

## Pass 4 at 2026-09-23 ~08:06Z

**Run state:** there are no new events and no `*.completion.json` yet. Both workers are still interactive. The adapter's file set hasn't changed since pass 2, so it may be running its checks.

**Ownership:** no violations. The ui lane now also modifies 4 spec files and `support.ts` under `tests/project-workflows/`.

### ui lane
- **Pass 2's print-transport P2 downgraded to P3.** `NodeDetail.tsx:360` now shows "Executed by" through `executorOf(definition.kind, reviewTransport)`, so the node page is right for print reviews. The graph's accessible name and legend (`WorkflowGraph.tsx`) still use the fixed `EXECUTOR_LABEL` ("one agent session per reviewer") even for a print-transport run. The PRD `executor-marks` row only requires that "each node's accessible name includes its executor". That holds, but the graph and the node page disagree for run 2 (`--reviewer-transport print`).
- **Existing specs were adapted to the new layout:**
  - `openTask(page)` was added before every task-panel assertion in `inputs.spec.ts` and `lanes.spec.ts`.
  - `finding-to-task` now asserts that the task `<details>` is opened by the hand-over and closed on a plain visit, which covers part of PRD `output-first-task-collapsed`.
  - In `worker-inputs`, the executed-check link now points to the verify node (`href=runUrl(verify_ui)` plus `data-check-index`) instead of the in-page `#check-N`. This follows PRD `verify-shows-checks-not-files`, where the launch node no longer has a checks table.
- **P3: the new check link may not scroll to the check** (`inputs.spec.ts`, around line 160). After the link is clicked, the test asserts `#check-0 .check-command` on the verify node, but not that the check is scrolled into view or focused. `data-check-index` suggests the check should be focused; if that's the intent, assert it, or the link degrades into "open the node".
- **Missing (P2 if still absent at completion):** none of the six new ui browser scenarios in PRD section 6 has a `[scenario:…]` test yet: `executor-marks`, `created-file-rendered`, `output-first-task-collapsed` (only partly covered by `finding-to-task`), `verify-shows-checks-not-files`, `findings-on-files` and `findings-by-reviewer`. The policy's browser scenarios gate on these ids, so a completion without them should fail verification.

### adapter lane
No new diffs since pass 3.

---

## Pass 5 at 2026-09-23 ~08:12Z

**Run state:** there are no new events and no `*.completion.json` yet. Both workers are still interactive. The ui lane changed 14 files (+747/−237) and the adapter lane 17 (+379/−22). No ownership violations.

### ui lane: new `tests/project-workflows/clarity.spec.ts`
All six new PRD section 6 ui scenarios now exist, each with its `[scenario:…]` id: `executor-marks` (line 74), `created-file-rendered` (130), `output-first-task-collapsed` (177), `verify-shows-checks-not-files` (208), `findings-on-files` (248) and `findings-by-reviewer` (300). **Pass 4's gap is closed.**

`findings-on-files` checks everything the PRD row asks for:
- exact count and order;
- severity and reviewer attributes;
- the similar path is excluded;
- a finding with no line number has no "Show lines" control;
- "Show lines 12–14" switches to the source view, marks exactly lines 12, 13 and 14, and puts the first mark in the viewport;
- the `.ts` file says that no finding names it;
- on the review node, findings that name a captured file link to it and the others don't;
- clicking a link lands on the launch node with the panel heading in view.

This is strong coverage.

`executor-marks` checks the dash both as a DOM attribute and as the computed `stroke-dasharray`, and checks "one print job per reviewer" on the node page (around line 124).

- **P3: the file link carries no URL fragment** (`clarity.spec.ts` around line 283). The finding's file link is `href=runUrl(launch_ui)`; the target file travels as in-app state (`focusPath`). A copied or middle-clicked link opens the launch node without scrolling to the file. That's acceptable for a SPA link, but a `#file-…` fragment would make it shareable. It also connects to pass 3's P3 about `fileAnchorId` collisions.
- **P3: the graph's print wording isn't asserted.** `executor-marks` checks print wording only on the node page, so pass 4's P3 (the graph still says "agent session" for a print review) isn't caught by any test.
- **Still open:** pass 3's P3 on `focusPath` being frozen at mount. The test covers a single link from the review node, which remounts the panel, so it passes and wouldn't catch this.

### adapter lane
No new diffs.

---

## Pass 6 at 2026-09-23 ~08:18Z

**Run state:** there are no new events and no `*.completion.json` yet. Both workers have been running for about 29 minutes. According to the worker panes (`herdr pane read`):
- the adapter worker is waiting for its workflow unit suite (`wf2.log`), which has been running for about 9 minutes;
- the ui worker is editing the `inViewport` helper in the spec.

No ownership violations.

### ui lane: new `src/projects/scroll.ts`
`keepInView(target, options)` re-scrolls a handed-over target (the task quote or a linked file) whenever an ancestor resizes while content above it loads. It stops on reader input (wheel, touch, key, pointer), after 1 s without a resize, or after 10 s. `WorkerInputs.tsx` and `CreatedFiles.tsx` both use it. This is a reasonable answer to the "first in view" flakiness, and it's a small shared helper in the right folder.

- **P3: `stop` refers to `observer` and `limit` before they're declared** (`scroll.ts`, `stop` closes over the `const observer` and `const limit` that follow it). This is safe only because `stop` can't run before `scroll()` is first called at the end. If someone reorders the lines, it throws a TDZ `ReferenceError`. Declare `observer` and `limit` before `stop`.
- **P3: every ancestor up to `<html>` is observed.** `ResizeObserver` fires once for each observed element when observation starts, so the first frame does N `scrollIntoView` calls. It's cheap, but observing only the nearest scroll container and `document.documentElement` would be enough.
- **P3: `keydown` stops keep-in-view too eagerly.** It includes modifier-only keys and Tab. A keyboard user who tabs right after the hand-over ends it early. That's arguably correct, since the reader moved; just noting it.
- **Cleanup verified:** both callers return `stop` from the effect (`WorkerInputs.tsx:34-36` and `CreatedFiles.tsx:111`).
- **Callback identity verified, no issue:** `onHighlightApplied` and `onFocusApplied` come from `useCallback(..., [])` in `RunView.tsx:51` and `RunView.tsx:55`, so they are stable and the effects run once.

### adapter lane
No new diffs; the worker is running its checks.

---

## Pass 7 at 2026-09-23 ~08:24Z

**Run state:** there are no new events and no `*.completion.json` yet. Both workers have been running for about 35 minutes. No ownership violations, and the diff stats haven't changed since pass 5.

### adapter lane: check status (from the worker's pane)
- The build had failed with 2 type errors. The worker fixed them by changing `contracts/workflow/v1.ts:169` to `a.kind === 'file' && a.path !== undefined ? [a.path] : []`. `npm run build` now exits 0, and the worker reports that all Node checks pass.
- **P2 (flaky): `workflow.test_automatic` fails intermittently in the full unit suite.** Two full runs failed on *different* `test_automatic` cases, the second being the `AutomaticTwoReviewerGraphTests` drill test. The class passes 8 of 8 on its own, and the worker is treating the failures as load-related. Whether or not this lane caused it, the trusted verifier runs the same `workflow-unit` check (timeout 1200 s) in a fresh worktree. If it's timing-sensitive, the lane's worker-phase gate can block at random and waste an attempt. Two things to check after the run:
  1. Whether worker-phase capture (`capture_changed_files`: file I/O plus an fsync per changed file) makes the fixtures in `test_automatic` slower. The drill fixtures call `verify_revision` for real.
  2. Whether `test_automatic` has fixed sleeps or poll deadlines that fail under load.

  If the failure reproduces on base `7dba2fd` under load, it's a pre-existing flake and not this lane's fault. Record which one it is.
- **P3: the build fix shows the TS type is weaker than intended.** `z.union([...{path: z.never().optional()}, ...{kind: z.literal('file'), path}])` should narrow `a.path` to `string` once `a.kind === 'file'`. Needing the extra `a.path !== undefined` guard suggests the inferred union isn't discriminating cleanly, perhaps because the `kind` enum in the first branch plus `never | undefined` isn't treated as a discriminant. Replacing the union with `z.discriminatedUnion('kind', …)`, as pass 1 suggested, would make narrowing work and remove the guard. The guard can't change runtime behaviour, because the schema already guarantees `path`.

### ui lane
The worker is editing gate-receipt comments or tests (per its pane). No new files.

---

## Pass 8 at 2026-09-23 ~08:30Z

**Run state:** there are no new events and no `*.completion.json` yet. Both workers have been running for about 41 minutes. The diff stats haven't changed, so both lanes are in their verification phase.

### adapter lane
- **P2: the unit suite has little time to spare, and the flake from pass 7 is still unresolved.** The worker reports a load average of about 6. The full `workflow-unit` suite took **911 s** this run, against about 600 s before, and the policy timeout for `workflow-unit` is **1200 s**. With both lanes' Playwright runs, and later the trusted verifier and the candidate phase, all competing on the same machine, the controller's verification could hit the timeout or the timing-sensitive `test_automatic` failure. Either would block the gate for reasons that have nothing to do with the code. The worker is now running `workflow.test_automatic` on its own. For the operator: if the worker-phase gate blocks on `workflow-unit`, check the check's duration and the failing case before blaming the change; a retry at lower load is probably enough. Longer term, `test_automatic` should not depend on wall-clock timing.

### ui lane
- The worker is running `tsc -b`, `eslint` and both Playwright phases (worker and candidate) against the final code.
- **P3: the ui worker tests a copy outside its worktree.** It syncs its worktree into `~/.claude/jobs/903df16c/tmp/scratch` with a `sync.sh` script and runs the checks there. This is presumably to avoid shared `node_modules`, ports or a clash with the adapter lane. It's harmless, because only the worktree is verified by the trusted verifier. But the prompt says "Stay within this worktree", and the checks the worker reports were run on a copy, not on the worktree itself. If the sync misses a file (for example a new untracked file that `sync.sh` doesn't copy), the self-reported results could differ from the verifier's. Only the controller's own verification counts, so this is a process note, not a gate issue.

---

## Pass 9 at 2026-09-23 ~08:36Z

**Run state:** the ui worker wrote `ui.completion.json` with `status: completed` at about 08:25. The adapter is still working (about 47 minutes in): `test_automatic` passed 94 of 94 on its own, and the worker is doing a final full `workflow-unit` run (`wf3`). The event log has no new events yet; the controller is waiting for the adapter before the handoff freeze.

### ui completion: the checks it reports
- `npm run build` **FAILED** in the worktree (24 TS errors). `npm run test:unit` **PASSED** (130/130). The Playwright suite **FAILED** in both phases before any test ran: `fixtures.ts` validates the new result at import and throws a ZodError, because `kind: 'file'` isn't in the base contract.
- The cause is expected, not a defect: the ui lane builds against base `7dba2fd`, where `contracts/workflow/v1.ts` doesn't have the adapter's changes yet.
- The gate should still pass. I checked the policy: `DEFERRED_WORKER_KINDS = {build, browser}` (`workflow/verification.py:25`), so in the worker phase `frontend-build` and `project-workflows-browser` are recorded but don't gate. Only `frontend-unit-regression` (unit) gates, and it passed. **The real test for both lanes is the candidate phase**, where their changes are merged.
- **P2: the ui code has never been compiled against the adapter's real schema.** Its green results (tsc, eslint, and Playwright 26/26 in both phases) came from a scratch copy with a *hand-written shim* of the PRD 4.1 contract. The two differences that could break the candidate build:
  - **Artifact type shape.** The adapter uses `z.union([{kind: enum5, path?: never}, {kind: 'file', path: string}])`. The ui's `CapturedFile = Artifact & { kind: 'file'; path: string }` and its type guard work with either shape, and `NodeDetail.tsx(150)` compares `kind === 'file'`, which is valid under the union. **I expect this to compile.**
  - **Cross-field rule.** The adapter's `validateWorkerResult` requires every captured or uncaptured path to be a distinct entry of `changed_files`. The ui fixtures meet this: `CAPTURED_CHANGED_FILES = [AUDIT_PATH, CAPTURE_TS_PATH, TOO_LARGE_PATH, BINARY_PATH]` (`fixtures.ts:292`), and `capturedUiResult` captures 2 and lists 2 (`fixtures.ts:407-413`). `candidateUiResult` has no file artifacts. **It passes.**

  So I expect the candidate to go green. The risk is an unseen type detail, such as `ReviewResult['diff']` now accepting `file` (pass 1's P2).
- **Contract match on the served data:**
  - The ui expects `files_not_captured` on the served result, and the adapter's `projectWorkerResult` passes it through.
  - The ui expects `file` artifacts served as `text/plain`, and the adapter serves them that way.
  - The artifact registration in the ui's `seed.ts` carries `path`; the adapter's `artifactRegistrationSchema` is non-strict and drops it silently, which is fine for serving.
- **The ui's open assumptions match what I found earlier:**
  - The check link doesn't scroll to the check (pass 4).
  - The legend uses inline styles (pass 2).
  - Paths outside `changed_files` are still listed, which the adapter's validator makes impossible for real data; this is harmless defensive code.
  - "Ownership outcome" on the verify view is *derived* from the phase and the gate status, not served. **P3:** it's a presentation inference the PRD may not endorse. A candidate lane says "enforced per lane", which is accurate, but a worker-phase lane that is blocked for a non-ownership reason will show ownership as "not passed", which is misleading. Check the wording in `NodeDetail.tsx` `VerifiedEvidence` after the merge.
- **P3:** one worker-phase run in the scratch copy hit a transient Playwright "Page crashed" in `empty-states` and passed on rerun. That points to the same load pressure as pass 8, and browser checks gate in the candidate phase.

### adapter lane
- `test_automatic` passed 94 of 94 when run on its own, which supports the worker's view that the earlier failures were load-related. Pass 8's P2 still stands for the verifier.

---

## Pass 10 at 2026-09-23 ~08:42Z

**Run state:** nothing has changed. The ui lane is done (`ui.completion.json`), and the adapter is still waiting on its final full `workflow-unit` run (`wf3`, 7 minutes in, 53 minutes since launch). There are no new events, and neither lane's diff has changed since pass 5. No new code to review.

**Timeout watch:** the adapter's timeout is 5400 s (90 minutes), and it's at 53 minutes. At about 15 minutes per full suite under load, it has headroom, as long as it doesn't loop on further reruns.

---

## Pass 11 at 2026-09-23 ~08:48Z

**Run state:**
- 08:39:18: the adapter completed, the workers were stopped, and the freeze succeeded. Snapshots: ui `ff9781e`, adapter `11a3003`.
- **`verify_ui` passed** at 08:39:57 (attempt 1, 39 s). `frontend-build` and `project-workflows-browser` were recorded as deferred to the candidate gate, as pass 9 predicted.
- `verify_adapter` is still running, attempt 1. It includes the `workflow-unit` suite that is under timeout pressure (pass 8).

### adapter completion
The worker reports these checks: workflow unit 204 OK on the final run (two earlier runs each had one load-related `test_automatic` failure), contracts 20/20, test:unit 130/130, `server/projects.test.ts` 37/37 (run directly), build exit 0. It ran `npm ci` in the worktree; `node_modules` is gitignored and no manifest changed.

**Late change: the artifact schema was redesigned.** `contracts/workflow/v1.ts:18-27` is now a single `z.strictObject` with `kind: z.enum(ARTIFACT_KINDS)`, `path: relativePath.optional()`, a `.refine` requiring `path` exactly when the kind is `file`, and `.meta({anyOf: [...]})` so the exported JSON Schema carries the same rule. The worker says the earlier union broke the base `tests/project-workflows/fixtures.ts` type-check in its own worktree.
- This resolves pass 1's P3 on `ARTIFACT_KINDS` being unused, which it now drives, and pass 1's P3 on union error messages.
- It changes pass 7's P3: the `a.path !== undefined` guard in `validateWorkerResult` is now *needed*, because the TS type is `path?: string`. Type-level narrowing on `kind` was given up for a runtime refine. That's a legitimate trade-off, but consumers must null-check `path`. The ui's `capturedFiles` type guard already does (`typeof artifact.path === 'string'`), **so the ui code matches this shape better than the union** and the candidate build risk from pass 9 goes down.
- **P3: the JSON Schema and zod now state the rule separately.** `.meta({anyOf})` hand-writes the JSON Schema rule, while zod enforces it with `.refine`. The two can drift. `contract.test.ts` runs the rejection cases against both `validateWorkerResult` and the Python `handWritten` parser, which guards against drift for the cases listed.
- **P3: `.refine` hides the object's shape methods.** It turns `artifactSchema` into a refined schema, so `.shape`, `.extend` and `.pick` are no longer available to anyone who composes it. The build passes, so nothing uses them today.
- Pass 1's P2 on the widened schema affecting other contracts is **acknowledged as an open assumption**: event and reviewResult schemas changed additively with no version bump. The worker says "the review diff must still be a `patch`", but I haven't checked that the reviewResult validation enforces `kind === 'patch'` for `diff`. If it doesn't, a `file` artifact is now schema-valid as a review diff. Verify after the run.

**P2: no gating check runs the `served-files` scenario.** The adapter's own summary says `server/projects.test.ts` is **not** in `npm run test:unit` (`package.json:15` lists only config/app/file/write/mutate/locations plus the tests/unit files), and none of the adapter's policy checks (`workflow-unit`, `shared-contract`, `backend-regression`, `backend-build`) runs it. So the PRD section 6 `served-files` test, and the whole projects server suite (37 tests), is never run by the trusted verifier. It only passed on the worker's own report. The ui browser suite in the candidate phase serves seeded packets through the real server, so the happy path is covered indirectly. The malformed-files and legacy-result cases are covered only by the ungated unit file. **Suggested fix:** add `server/projects.test.ts` to `test:unit`, or add a policy check for it. This is a pre-existing gap from earlier features, but this PRD's acceptance relies on it. The `coverage` reviewer should flag it too.

**Pass 2's P2 on registration dropping `path`** is resolved in effect as P3 (see pass 3), and the adapter reports cross-field violations as `RESULT_INVALID` when serving.

---

## Pass 12 at 2026-09-23 ~08:54Z

**Run state:** `verify_adapter` is still running (attempt 1, started at 08:39:18). Its `check-0` (`workflow-unit`) has been running for about 9 minutes; the log shows progress dots and no failures yet. There are no new events.

**Resolved: the review diff is still restricted to `patch`.** Pass 11 left this open. `contracts/projects/v1.ts:267` has the cross-field rule `result.diff.kind !== 'patch'` → throw, and `contracts/projects/contract.test.ts:175` tests that a captured file is never accepted as the review's diff. Pass 1's P2 on the widened schema is therefore reduced to P3: the raw JSON Schema for `reviewResult.diff` accepts `file`, but the validator rejects it.

**Observation: this run can't show captured files.** The trusted verifier runs from the pinned source checkout at base `7dba2fd`, which doesn't have the capture code. So `verification/worker/ui/1/packet.json` has **0 `file` artifacts and no `files_not_captured`** for 18 changed files, as expected. When this run is viewed after integration, its launch nodes will show the "results predate file capture" legacy message. The PRD section 8 run 2 (`viewer-clarity-002`, print transport), which runs after this is merged, is the first run whose verifier captures files. That makes run 2 the first live end-to-end check of `capture_changed_files`. Plan to check that run's packet for real `file` artifacts, and that the 8 MiB budget behaves as expected on a real changed-file set: this run's ui lane alone changed 18 files. The worker also ran `npm ci` in the adapter worktree; `node_modules` is gitignored and doesn't appear in the diff.

---

## Pass 13 at 2026-09-23 ~09:00Z

**Run state:**
- **`verify_adapter` passed** at 08:49:27, after about 10 minutes. `backend-build` was deferred to the candidate gate. `workflow-unit` passed inside the verifier on its first attempt, so pass 8's timeout risk didn't happen this time.
- **`candidate_ui` passed** at 08:51:49 on the combined revision `054d149`.
- The adapter's candidate-phase check is presumably in progress.

**Resolved: pass 9's P2 (the ui code had never been compiled against the adapter's real schema).** `candidate_ui` gates on `frontend-build` and `project-workflows-browser` in the candidate phase, and it passed on the merged revision. So the ui code type-checks against the adapter's refined `artifactSchema`, and all browser scenarios, including the six new ones, pass against the real server.

**P3 (pre-existing): the build warns about bundle size.** The build log warns about chunks over 500 kB (the gzip size shown is about 368 kB). The warning isn't caused by this change, but `CreatedFiles` pulls `Markdown` into the projects view. Consider lazy-loading the projects route later.

---

## Pass 14 at 2026-09-23 ~09:06Z

**Run state:** `candidate_adapter` (attempt 1) is running `workflow-unit` (`check-0`) on the combined revision `054d149`, with no failures so far. The pass-8 timeout risk applies again. There are no new events and no review has started. No new code.

---

## Pass 15 at 2026-09-23 ~09:12Z: RUN COMPLETE (terminal)

**Timeline (UTC):**
| Time | Event |
|---|---|
| 07:43 | Launch; workers `ui` and `adapter` started |
| 08:25 | ui worker signals `completed` |
| 08:39 | adapter worker `completed`; workers stopped; freeze (ui `ff9781e`, adapter `11a3003`) |
| 08:39:57 | `verify_ui` passed (build and browser deferred) |
| 08:49:27 | `verify_adapter` passed (`backend-build` deferred) |
| 08:51:49 | `candidate_ui` passed on combined `054d149` |
| 09:01:40 | `candidate_adapter` passed |
| 09:01:44–48 | Native reviewers `general` and `coverage` launched |
| 09:03:32 / 09:03:51 | coverage and general **approved** |
| 09:03:56 | **Integrated**: fast-forwarded to `054d149` (commits `c524b74` ui and `054d149` adapter on `feature/viewer-clarity/viewer-clarity-001`); no push |

`run-state.next` is `[]`. Every gate passed on attempt 1, with no retries.

### Reviewer findings (review.json: 7, all P2, all `open`)
| # | Reviewer | Lane | Finding | Matches this log? |
|---|---|---|---|---|
| 1 | general | ui | **The captured Markdown is rendered with live remote images and external links.** `src/document/Markdown.tsx:28-36` turns `https://` images into `<img src>` and makes `http(s)` links live. Captured files are untrusted worker output shown inline by default, so opening a launch node makes the browser fetch URLs the worker chose (a beacon), which contradicts PRD section 2 ("links rendered as text or relative anchors only"). **I confirmed it in the source.** | **Missed.** Pass 3 only checked for raw HTML. This is the most important open issue. |
| 2 | general | ui | The required-check link lands at the top of the verify node instead of on the check | Yes, pass 4 (P3) |
| 3 | general | ui | The "ownership outcome" on the verify view is inferred, not served | Yes, pass 9 (P3) |
| 4 | general | adapter | `contracts/projects/examples.ts` `servedWorkerResult` uses `verify_ui` and points to a route that doesn't exist (`results/verify_ui/1`) | New (cosmetic) |
| 5 | coverage | adapter | `server/projects.test.ts` (including `[scenario:served-files]` at :934 and malformed-files at :948) is never run by any gating check | Yes, pass 11 (P2) |
| 6 | coverage | ui | The six new browser scenarios passed only in the candidate phase; the worker-phase fixture path was never exercised (it hit a ZodError in the worker phase and was deferred) | Partly, pass 9 |
| 7 | coverage | ui | `findings-by-reviewer` can't tell each reviewer's own verdict from the run verdict (every reviewer in the fixtures approved) | New |

### Final summary of this log's findings still open after integration
**P2**
- Remote images and links in the captured Markdown (reviewer finding 1). Fix: give `CreatedFiles` a Markdown variant with images and links inert, or a component override.
- `server/projects.test.ts` isn't in `test:unit` or any policy check (pass 11 and reviewer finding 5).
- `workflow-unit` flakes under load (`test_automatic`), and the full suite took 911 s against a 1200 s timeout (passes 7-8). It didn't bite in the verifier this run.

**P3**
- Refine plus hand-written `.meta({anyOf})` means the rule is stated twice and can drift, and the refined schema loses `.extend`/`.pick` (pass 11).
- The JSON Schema for `reviewResult.diff` accepts `file`; only the TS cross-field rule (`contracts/projects/v1.ts:267`) rejects it (passes 1 and 12).
- `path` isn't bound to the file bytes in `recheck_packet` or `evidence` (pass 3).
- The budget is first-fit, recorded as an open assumption (pass 2).
- `fileAnchorId` ids can collide, e.g. `docs/a.md` and `docs_a.md` (pass 3).
- `focusPath` is frozen at mount in `CreatedFiles` (pass 3).
- The graph's executor wording ignores print transport (only the node page uses `executorOf`), and no test covers it (passes 4-5).
- The class name `is-controller` is also applied to verifier nodes (pass 2).
- Inline styles on the graph legend (pass 2).
- `scroll.ts` refers to `observer` and `limit` in `stop` before they are declared, and observes every ancestor (pass 6).
- The source view creates one element per line, with no virtualisation (pass 3).
- `linesNamed` quietly turns a reversed range into one line (pass 2).
- The file link has no URL fragment, so it can't be shared (pass 5).
- The `verification.py:148` error message covers two different failures (pass 1).
- The ui worker ran its self-checks on a scratch copy outside its worktree (pass 8).
- The bundle is over 500 kB (pass 13).

**Resolved during the run:** `ARTIFACT_KINDS` unused; union error messages; the ui not being compiled against the real schema (`candidate_ui` passed); the missing ui scenarios (all 6 added); the review diff restricted to `patch` (verified).

**Ownership:** no violations in either lane for the whole run.

### Process notes
- Both reviewers finished in about 2 minutes on a 209 KB diff, yet their findings are specific and correct, including one this log missed.
- The run approved with 7 open P2s, which the policy allows (P2s don't block). Reviewer finding 1 is worth fixing before the result is relied on, or before run 2.
- **Next, per PRD section 8:** run 2 (`viewer-clarity-002`, `--reviewer-transport print`) is the first run whose verifier actually captures files, because this run's verifier used base code without capture. Check its packets for real `file` artifacts and the budget behaviour. Note that finding 1 means viewing run 2's captured Markdown will fetch any remote images in it.
- Branch `feature/viewer-clarity/viewer-clarity-001` is at `054d149` and has not been pushed; merging to main is the operator's step.

*Review loop ended: cron job `003fffc3` deleted.*
