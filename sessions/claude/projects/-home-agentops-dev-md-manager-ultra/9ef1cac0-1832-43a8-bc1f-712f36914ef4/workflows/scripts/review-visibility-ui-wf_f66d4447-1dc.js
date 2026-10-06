export const meta = {
  name: 'review-visibility-ui',
  description: 'Implement the UI and browser-test workstream (slices B and C) directly in the integrator checkout against the merged adapter and controller',
  phases: [{ title: 'Implement UI', detail: 'review panel, run inputs, finding-to-task links, mocks/seeds/specs' }],
}

const SPEC = '/tmp/claude-1000/-home-agentops-dev-md-manager-ultra/9ef1cac0-1832-43a8-bc1f-712f36914ef4/scratchpad/DESIGN_REVIEW_VISIBILITY.md'

const REPORT = {
  type: 'object',
  required: ['changed_files', 'tests_run', 'deviations', 'concerns', 'notes_for_integrator'],
  properties: {
    changed_files: { type: 'array', items: { type: 'string' } },
    tests_run: { type: 'array', items: { type: 'object', required: ['command', 'result'], properties: { command: { type: 'string' }, result: { type: 'string' } } } },
    deviations: { type: 'array', items: { type: 'string' } },
    concerns: { type: 'array', items: { type: 'string' } },
    notes_for_integrator: { type: 'string' },
  },
}

phase('Implement UI')
const prompt = [
  'You are workstream U (UI and browser tests) of a three-workstream implementation. The other two workstreams (P: Python controller/export, S: server adapter) are FINISHED and already merged into your working directory, /home/agentops/dev/md-manager-ultra (run pwd to confirm; do not cd elsewhere). Work directly in this checkout; there is no worktree isolation. Do not commit, stash or push. node_modules is a symlink that already exists; Python is /home/agentops/dev/md-manager/.venv/bin/python (not needed for your work).',
  '',
  'STEP 0: read the design spec at ' + SPEC + ' in full (sections 0, 1, 2 and 5 are yours; section 4 describes the adapter that is now real). Then read contracts/projects/v1.ts, contracts/projects/examples.ts, contracts/projects/README.md, and the merged adapter in server/projects.ts (the projectReview/projectInputs functions and the review/inputs routes in server/projectRoutes.ts) so your seeds match what the real backend accepts: the export sections it validates are strict (see the reviewSectionSchema and inputsSectionSchema near the top of server/projects.ts).',
  '',
  'YOUR TASK: implement spec section 5 completely (5.1 through 5.5): the review panel on the review node (slice B), the run inputs (Assignment tab, run header facts, worker node Task / Exact prompt / Launch receipt / Reported-by-the-worker / Handoff / Stop panels), the finding-to-task links with the quote highlight hand-off (slice C), the API client additions, and the mocks, seeds, fixtures and the two new spec files with the nine new scenarios (review-verdict, review-blocked, review-legacy, paths-redacted, run-assignment, worker-inputs, finding-to-task, inputs-legacy, inputs-paths-redacted). Ownership: src/App.tsx, src/App.css, src/graph/**, src/projects/**, src/index.css, tests/project-workflows/**. Nothing else: never edit server/**, workflow/**, contracts/**, features/**, docs/**, package.json or the root playwright.config.ts (you may import src/document/Markdown.tsx but not edit it). If something outside your ownership blocks you, report it in "concerns" rather than changing it.',
  '',
  'Read src/projects/*.tsx, src/projects/api.ts, tests/project-workflows/*.ts and the existing scenarios in projects.spec.ts fully before changing anything; keep the six existing scenarios passing in BOTH phases. Because the real adapter is present, candidate mode (WORKFLOW_VERIFICATION_PHASE=candidate) must be fully green for all 15 scenarios, as must worker mode (mocks). Red-green discipline: write each new scenario first, watch it fail for the behavioural reason, then implement. Run at the end, one after the other (never two Playwright suites at once): npx --no-install playwright test --config=tests/project-workflows/playwright.config.ts ; then WORKFLOW_VERIFICATION_PHASE=candidate npx --no-install playwright test --config=tests/project-workflows/playwright.config.ts ; then npm run build ; npm run lint ; npm run test:unit ; and report exact counts. Keep the narrow-layout (420px) assertion in failed-and-paused passing: new panels must not overflow horizontally. Accessibility: headings, labelled tabs (role=tablist/tab/tabpanel with aria-selected/aria-controls), keyboard-operable toggles, and a mark element highlight with visible contrast in both colour schemes (use the App.css colour tokens; add new tokens to src/index.css if needed). Match the existing code style (no semicolons, single quotes, 2-space). The seed data must include the raw absolute path under the temporary root inside one finding message, one requirement quote (so its redaction is exercised too) and one completion summary, so that the two redaction scenarios can assert the literal string <path> in candidate mode and never see /tmp/ or /home/ in the rendered text.',
  '',
  'Your final answer must be the structured report (schema enforced); "changed_files" must be complete and "tests_run" must list every command above with its counts.',
].join('\n')

const report = await agent(prompt, { label: 'impl:ui', phase: 'Implement UI', schema: REPORT })
return report