# Validation — 2026-09-20

## v1.1.2 record validation and workflow inspection

- New tests reproduced rejection of honest empty lists and acceptance of “none” before the fix. All 34 tests pass after the change.
- Optional record arrays can be empty, including proposed slices; acceptance criteria remain required. Obvious acceptance/slice placeholders are rejected. Code does not claim to prove usefulness.
- Executed the generated workflow with a mocked native transport: each revision uses a distinct review key, `context: fresh`, no `resume`, and explicit record/current-PRD paths. Prior review/PRD files are deliberately available, not author-conversation history.
- Verified initial PASS launches only one review, REVISE→PASS stops after two even if nextRound is incorrectly true, optional-only REVISE is rejected, and the helper refuses a post-PASS draft. Existing three-round limit tests remain green.
- Read-only intent is present in the generated task; actual tool permissions depend on the discovered reviewer profile. This change does not add a sandbox or claim a new live multi-round isolation test. The original live test recorded resolvedContext=fresh for its single reviewer.
- Whole-run evidence remains the original one-draft/one-review test: explicit extracted record/excerpts, no full parent transcript, no material findings and no revision needed. Targeted resolution is mock-tested, not live-tested. No measured reduction in human review effort is claimed. No extra model calls, discovery loops or telemetry were added for this change.

## v1.1.1 directory layout

Code moved to scripts/, tests to scripts/tests/, templates/fixture to assets/, and docs to references/.
All 30 tests pass at the new paths. Runtime Pi discovery still finds one explicit-only skill without diagnostics.
Earlier command paths below are historical evidence, not current invocation instructions.
The upstream specification permits arbitrary supporting files and recommends these directory conventions.
Its reference validator rejects Pi's `disable-model-invocation` extension; that flag is intentionally retained to preserve the user's explicit-only requirement, not claimed as strict standard frontmatter compliance.

## v1.1.0 live-view checks

- 30 unit/process tests pass; Python compilation and `git diff --check` pass.
- Inspected installed Herdr 0.9.0 CLI: explicit caller workspace, `tab create --no-focus`, returned pane ID, `pane run`.
- Real subscription Claude draft: `/home/agentops/.local/state/team-prd/run-_db4wv07`, 19.14 seconds, valid structured PRD.
- Herdr tab `w5:t9`, pane `w5:pF`, label `Team PRD · claude-1`: verified rendered PRD and CLI-exit notice with `pane read`.
- Captured 257 stream events, including 6 text deltas and 244 structured-input deltas; the view receives live progress, not only the final result.
- Smoke test exposed that `pane run` succeeds with empty stdout, unlike `tab create`'s JSON. Corrected observer receipt handling and added the empty-stdout regression test; the original live tab itself had opened and rendered successfully.
- Mock tests cover unavailable Herdr, opt-out, explicit workspace/no-focus, shell quoting, terminal-control filtering, private-thinking omission, stream failure/timeout and observer independence.
- This was a drafting/view smoke test only, not a new challenged/accepted PRD. No native reviewer launch or application changes were needed.

## Inspection and installation

Installed persistently at `/home/agentops/.pi/agent/skills/team-prd`.
Read installed Pi skills conventions and pi-subagents API/control/review guidance, existing
`herdr-notes`/`explain-diff` skills, and the reusable agent-workflow `runner/night.sh` wrapper.
No applicable ancestor AGENTS.md or separate local skill-management policy was found.
Version is recorded in SKILL.md/CHANGELOG.md; source is versioned locally, never pushed.
No extension, agent profile, settings, authentication, application code or dependency changes.

Claude Code 2.1.278: inspected `--help`, verified `claude auth status` reports logged-in
first-party claude.ai subscription. Existing subscription used, no API keys/config changes.
Native discovery found executable read-only reviewer with supervisor messaging. Runtime model
selection resolved the main session's `openai-codex/gpt-6-astra`; this ID appears only in test
receipts, not hardcoded skill routing. Reviewer retained its configured high thinking setting.

## Executed checks

- `python3 -m unittest discover -s /home/agentops/.pi/agent/skills/team-prd/tests -v`: **23 passed**.
  - Complete structured context, explicit-only metadata, missing context.
  - Targeted blocking revision with the same decision hash; PASS with optional notes does not loop.
  - Three-round ceiling and configurable one-round ceiling; unchanged/repeated findings stop.
  - NEEDS_USER and contradictory feedback; malformed/bare PASS and invalid draft rejection.
  - Subscription-only auth gate; failed attempts consume draft budget.
  - Real local subprocess success, exit 7 and timeout with partial stdout preservation.
  - CLI-level malformed-review failure preserves prior PRD and invalid input.
  - Actual workflow JS executed with mocked runs transport: hard cap and malformed result checks.
  - Structured-output/footer regression, durable result/usage capture and supervisor/final mismatch.
  - Final elapsed time remains stable.
- Python byte compilation passed.
- Installed Pi `dist/core/skills.js` loader: one skill, zero diagnostics,
  `disableModelInvocation === true`; `formatSkillsForPrompt` excludes team-prd.
  This verifies runtime non-advertisement, not a probabilistic unrelated-prompt model test.
- Native `subagent action:validate` accepted generated workflow scripts. Static validator reports
  dynamic launch counts; the workflow's numeric bound and native maxSubagentSpawnsPerRun enforce them.
- MD Manager remained clean on branch `slice-3-editing-and-file-operations`,
  commit `146493b8322a7afab77b3eb46a845ea5175e59cd`.

## Real end-to-end result

Sanitized simulated grilling fixture: `tests/md-manager-record.json`, drawn from documented
MD Manager behavior. Explicitly NOT a claim of new user-approved product requirements.

Successful run: `/home/agentops/.local/state/team-prd/run-g_r0a6qq`

- Native workflow: `2eaabf67-6138-4d56-97e7-1b5995022315`.
- Fresh reviewer: `937fe425-23ce-4ce8-b2dc-4e0fb99653c1`.
- PRD: `prd-1.md`; fixed record: `decision.json`.
- Evidence: `review-1.json`, `structured-review-1.json`, `native-status.json`, `native-receipt.json`.
- **PASS**, one draft, one review; zero blocking/optional findings; no revisions required.
- Parent verified all six review claims against the PRD and record.
- Total through parent acceptance: **126.04 seconds** (includes orchestration/inspection).
- Claude call: **20.07 seconds**, input 2, cache creation 2018, cache read 3823, output 1770.
- Reviewer workflow: **27.24 seconds**, input 5503, cache read 2688, output 617; 2 turns.
- CLI/native estimated costs recorded, not assertions of extra subscription billing.
- Parent extraction token usage is not separately attributable.

Sample PRD criteria:
> AC1: Given an existing Pi or Claude .md document, selecting it displays its returned content and leaves its file bytes unchanged.
> AC3: Given a document changed externally, the next explicit open displays the current content, not the prior cached content.

Review evidence confirms read-only exclusions, existing API constraints, useful ordered proposed slices,
verifiable success/failure checks, and deferred Q1 wording / Q2 rendering style kept visible.
Those two nonblocking questions remain unresolved; reviewer suggestions became no new decisions.

## Failures retained during development

- `run-ykt2po4u`: first draft stopped NEEDS_USER because Claude put nonblocking/deferred questions
  in an ambiguous `questions` field. Fixed with explicit `blocking_questions`; no silent continuation.
- `run-y7stlhdj`: native workflow `32f3c7c6-a9c2-460f-b6f3-d505d98818a6` failed closed on
  `invalid review envelope`: decorated native prose included an artifact footer. Child
  `895b1344-741f-431b-a129-b52b06e1bca6` had returned PASS, but it was not accepted. Fixed to use
  supported `outputSchema`/`structuredOutput`, then explicitly retried validation through the same
  native protocol in a new run. No fallback CLI reviewer, no overwritten evidence.
- With structured output, Pi can save an empty prose output file while the actual structured object
  lives in result/status and structuredOutputPath. `finish` consumes/captures the authoritative object;
  empty or missing structured results fail. The real successful run exercised this path.

## Known limits

- Linux/Python 3 and the inspected Claude flags/native pi-subagents API are required. Older versions
  fail closed; no fallback runner or account reconfiguration.
- Semantic traceability, paraphrased repetition, contradictory suggestions and focused questions still
  require parent judgment. Schema validation cannot prove truthful review evidence.
- Live real test took the default PASS path. Revision/limit/failure paths are tested with mocks;
  a live supervisor-mediated REVISE-to-NEXT_READY round was not exercised.
- Reviewer runtime includes waiting for parent validation/revision. Set budgets up front for slow
  providers. Native timeouts and helper deadline checks bound calls; parent idle/crash does not produce
  a terminal approval, and an unfinished ledger expires on its next operation.
- Artifacts may contain sensitive decision data; run directories are private and outside repos.
  No automatic cleanup or publication. Abrupt OS/process termination can leave an unfinished ledger.
- The helper does not inspect the full conversation; the parent must extract and validate the record.
