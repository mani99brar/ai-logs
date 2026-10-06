export const meta = {
  name: 'review-visibility-implement',
  description: 'Implement PRD_REVIEW_VISIBILITY slices A/B/C as three parallel workstreams (controller, adapter, UI) in isolated worktrees',
  phases: [{ title: 'Implement', detail: 'controller (Python), server adapter (TS), UI + browser tests, in isolated worktrees' }],
}

const SPEC = '/tmp/claude-1000/-home-agentops-dev-md-manager-ultra/9ef1cac0-1832-43a8-bc1f-712f36914ef4/scratchpad/DESIGN_REVIEW_VISIBILITY.md'
const SOURCE = '/home/agentops/dev/md-manager-ultra'

const REPORT = {
  type: 'object',
  required: ['worktree', 'changed_files', 'tests_run', 'deviations', 'concerns', 'notes_for_integrator'],
  properties: {
    worktree: { type: 'string', description: 'absolute path of the git worktree you worked in (output of `pwd`)' },
    changed_files: { type: 'array', items: { type: 'string' }, description: 'repo-relative paths you created or modified' },
    tests_run: { type: 'array', items: { type: 'object', required: ['command', 'result'], properties: { command: { type: 'string' }, result: { type: 'string', description: 'e.g. "59 passed, 0 failed" or the failure summary' } } } },
    deviations: { type: 'array', items: { type: 'string' }, description: 'places where you departed from the spec and why' },
    concerns: { type: 'array', items: { type: 'string' }, description: 'bugs, gaps or contract problems you noticed but could not fix within your ownership' },
    notes_for_integrator: { type: 'string' },
  },
}

const common = (stream) => `You are workstream ${stream} of a three-workstream implementation. Work ONLY in your current working directory (it is an isolated git worktree of the md-manager repository; run \`pwd\` first and report it). Do not commit, stash, push or touch any other directory.

STEP 0 (mandatory, before anything else):
1. \`ln -s /home/agentops/dev/md-manager/node_modules node_modules\` (node_modules is gitignored and absent in a fresh worktree).
2. Copy the frozen, already-written contract files from the integrator's checkout into your worktree (they are uncommitted there, so your worktree does not have them yet):
   cp ${SOURCE}/contracts/projects/v1.ts ${SOURCE}/contracts/projects/examples.ts ${SOURCE}/contracts/projects/contract.test.ts ${SOURCE}/contracts/projects/README.md ${SOURCE}/contracts/projects/reviewResult.schema.json ${SOURCE}/contracts/projects/runInputs.schema.json contracts/projects/
   cp ${SOURCE}/contracts/workflow/reviewCompletion.schema.json contracts/workflow/
   Then run \`npm run test:contracts\` (expect 13 passed) to confirm the copy.
3. Read the design spec at ${SPEC} in full. It is the authoritative description of the shapes shared between workstreams; the PRDs it references are in docs/. Then read the contract files you just copied.

Environment: Python is /home/agentops/dev/md-manager/.venv/bin/python (never create a venv). Node tooling is in node_modules. Browser tests need no extra setup. Never read or modify ~/.local/state/md-manager-workflows (the live run directory), only inspect it read-only if you need a real example of a file shape (its run project-workflows-001 is a real 1.0.0 run with review.json, receipts and packets).

Working discipline: red → green → refactor per increment (write the failing test, observe the behavioural failure, implement, re-run). Keep to your ownership list exactly; if you need a change elsewhere, put it in "concerns" instead of making it. Match the existing code style and the project's fail-closed philosophy. When done, run every test command listed for your workstream and report exact counts. Your final answer must be the structured report (the harness enforces the schema); "changed_files" must be complete.`

phase('Implement')
const results = await parallel([
  () => agent(`${common('P (Python controller, export, CLI, feature directories, docs)')}

YOUR TASK: implement spec section 3 completely (3.1 through 3.8): slice A (native reviewer session with completion-file protocol, third Herdr pane, wait_review, fail-closed acceptance, stop with identity re-check, --reviewer-transport print fallback), the run-state.json 1.2.0 export sections "review" and "inputs" (spec section 2, Python side), the \`workflow export <run>\` CLI action, the review-result and run-inputs feature directories plus launch.py choices, and the docs. Ownership: workflow/** (all .py and .md files), contracts/workflow/README.md, features/project-workflows/README.md, features/review-result/**, features/run-inputs/**. Nothing else.

Order of work: 3.1 settings → 3.2 interactive.py → 3.3 automatic.py → 3.4 pipeline.py → 3.5 export → 3.6 tests (extend as you go, not at the end) → 3.7 features/launch → 3.8 docs. Existing tests must keep passing (59 currently). Run at the end:
  /home/agentops/dev/md-manager/.venv/bin/python -m unittest workflow.test_automatic workflow.test_interactive workflow.test_feature_launch workflow.test_sessions workflow.test_verification workflow.test_pipeline workflow.test_graph -v
(add your new module, e.g. workflow.test_export, to that list) and report counts. Also sanity-check that \`python -m workflow launch review-result --dry-run\` and \`... run-inputs --dry-run\` print commands. Pay special attention to: no relaunch of a reviewer under any failure; KeyboardInterrupt during wait_review leaves the reviewer running and the receipt at "running"; every rejected completion file is fail-closed; old plans without reviewer_transport still validate; export_state's stability rule; the export CLI must work on a run directory whose worktrees no longer exist (build a lightweight runtime, do not construct InteractiveSessions).`, { label: 'impl:controller', phase: 'Implement', schema: REPORT, isolation: 'worktree' }),

  () => agent(`${common('S (server adapter)')}

YOUR TASK: implement spec section 4 completely: extend the run export schema to versions 1.0.0/1.1.0/1.2.0 with the "review" and "inputs" sections (spec section 2), project them onto the frozen contract payloads reviewResult and runInputs (redaction, truncation, requirement_found_in computed only from verbatim substring matches, the review.diff patch artifact served through the artifact route with hash and size checks), the review node's session_id/result_uri in the snapshot, the two new routes with their 404 codes REVIEW_NOT_FOUND / INPUTS_NOT_FOUND and 405 handling, and the tests listed in section 4. Ownership: server/**, config/projects.example.json. Nothing else.

Read server/projects.ts, server/projectRoutes.ts and server/projects.test.ts fully before changing anything; keep the existing 22 tests passing and every existing behaviour (bounded no-follow reads, no paths in messages, contract conformance before sending). Run at the end: \`npx --no-install tsx --test server/projects.test.ts\`, \`npm run test:unit\`, \`npm run test:contracts\`, \`npm run build\`, \`npm run lint\` and report counts. Pay special attention to: the 1.0.0 export (no sections) must still load with the review node's session_id/result_uri null; a malformed section is RUN_STORAGE_INVALID naming only the run; requirement quotes must be matched against the raw task/prompt text before redaction; the diff artifact id is "patch-review-" + the first 12 hex characters of its sha256.`, { label: 'impl:adapter', phase: 'Implement', schema: REPORT, isolation: 'worktree' }),

  () => agent(`${common('U (UI and browser tests)')}

YOUR TASK: implement spec section 5 completely (5.1 through 5.5): the review panel on the review node (slice B), the run inputs (Assignment tab, run header facts, worker node Task / Exact prompt / Launch receipt / Reported-by-the-worker / Handoff / Stop panels), the finding-to-task links with the quote highlight hand-off (slice C), the API client additions, and the mocks, seeds, fixtures and the two new spec files with the nine new scenarios (review-verdict, review-blocked, review-legacy, paths-redacted, run-assignment, worker-inputs, finding-to-task, inputs-legacy, inputs-paths-redacted). Ownership: src/App.tsx, src/App.css, src/graph/**, src/projects/**, src/index.css, tests/project-workflows/**. Nothing else (you may import src/document/Markdown.tsx but not edit it).

Read src/projects/*.tsx, src/projects/api.ts, tests/project-workflows/*.ts and the existing scenarios in projects.spec.ts fully before changing anything; keep the six existing scenarios passing in BOTH phases. IMPORTANT about candidate mode: your worktree's server/ is the OLD adapter (the review and inputs routes are being built in parallel by another workstream), so in candidate mode (WORKFLOW_VERIFICATION_PHASE=candidate) the NINE NEW scenarios are expected to fail against your local backend; write seed.ts exactly per spec section 2 so they pass once the adapter lands, make sure the six existing scenarios still pass in candidate mode, and report the new scenarios' candidate-mode status honestly. Worker mode (mocks) must be fully green: all 15 scenarios. Run at the end: \`npx --no-install playwright test --config=tests/project-workflows/playwright.config.ts\` (worker mode), \`WORKFLOW_VERIFICATION_PHASE=candidate npx --no-install playwright test --config=tests/project-workflows/playwright.config.ts\`, \`npm run build\`, \`npm run lint\`, \`npm run test:unit\` and report counts. Never run two Playwright suites at once. Keep the narrow-layout (420px) assertion in failed-and-paused passing: new panels must not overflow horizontally. Accessibility: headings, labelled tabs (role=tablist/tab/tabpanel with aria-selected/aria-controls), keyboard-operable toggles, and a `<mark>` highlight with visible contrast in both colour schemes (App.css tokens).`, { label: 'impl:ui', phase: 'Implement', schema: REPORT, isolation: 'worktree' }),
])

const [controller, adapter, ui] = results
return { controller, adapter, ui }