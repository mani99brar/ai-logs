export const meta = {
  name: 'explain-diff-readers',
  description: 'Parallel read-only readers over the feature-ultra diff, one per concern, producing grounded explain-diff material (walkthrough, decisions, risks, checks) with file:line anchors',
  phases: [{ title: 'Read', detail: 'five concerns over git diff main...HEAD' }],
}

const REPO = '/home/agentops/dev/md-manager-ultra'
const OUT = {
  type: 'object', required: ['groups', 'decisions', 'risks', 'not_done', 'verify', 'questions'],
  properties: {
    groups: { type: 'array', items: { type: 'object', required: ['title', 'files', 'what', 'why', 'how'], properties: {
      title: { type: 'string' }, files: { type: 'array', items: { type: 'string' } },
      what: { type: 'string', description: 'the concrete edit, 1-3 sentences, with path:line anchors' },
      why: { type: 'string', description: 'intent tied to the PRD/task; prefix with "intent: inferred" or "intent: unclear" when not stated in code/docs' },
      how: { type: 'string', description: 'mechanism, only as deep as needed to trust it' } } } },
    decisions: { type: 'array', items: { type: 'string', description: 'an implicit assumption, default, hard-coded value, scoping or non-obvious behaviour change, with path:line' } },
    risks: { type: 'array', items: { type: 'object', required: ['severity', 'where', 'evidence', 'why'], properties: { severity: { type: 'string', enum: ['P0', 'P1', 'P2'] }, where: { type: 'string' }, evidence: { type: 'string' }, why: { type: 'string' } } } },
    not_done: { type: 'array', items: { type: 'string' } },
    verify: { type: 'array', items: { type: 'string', description: 'a concrete runnable command or a specific file/case to eyeball' } },
    questions: { type: 'array', items: { type: 'object', required: ['question', 'answer'], properties: { question: { type: 'string' }, answer: { type: 'string' } } } },
  },
}

const common = `Read-only review task in ${REPO} on branch feature-ultra (one commit ahead of main). The change under review is: git diff main...HEAD (use --stat first, then read the hunks for YOUR files; read full files where a hunk is not self-explanatory). Never edit, stage, commit or push; never run the Playwright browser suite; never touch ~/.local/state/md-manager-workflows. Context you may cite: docs/PRD_REVIEW_VISIBILITY.md, docs/PRD_REVIEWER_PANE.md, docs/PRD_REVIEW_RESULT.md, docs/PRD_RUN_INPUTS.md and docs/HANDOFF_REVIEW_VISIBILITY.md (the author's own account; verify it against the code rather than trusting it).

Principle: verify, don't narrate. Every claim must be grounded in the diff or code you read, with path:line anchors (line numbers of the NEW file). If intent is unclear, say so instead of inventing a rationale. Surfacing an unstated assumption or a non-obvious behaviour change is worth more than restating what the code obviously does. Skip formatting churn with one line. Risks must carry concrete evidence; if you find none at a severity, return none rather than padding. Keep each field tight (a reviewer reads this). Return the structured object.`

const LENSES = [
  { key: 'controller', prompt: `${common}\n\nYOUR FILES: workflow/automatic.py, workflow/interactive.py, workflow/pipeline.py, workflow/launch.py, workflow/sessions.py (if changed), contracts/workflow/reviewCompletion.schema.json. Concern: the native reviewer protocol and lifecycle (launch flags, completion-file acceptance, resume/interrupt paths, stop, --reviewer-transport, the export CLI action, launch choices). Pay attention to fail-closed properties: can anything launch a second reviewer, accept an unbound file, or lose a live session?` },
  { key: 'export-and-tests', prompt: `${common}\n\nYOUR FILES: workflow/export_state.py, workflow/test_export.py, workflow/test_automatic.py, workflow/test_interactive.py, workflow/test_pipeline.py, workflow/test_feature_launch.py, features/review-result/**, features/run-inputs/**, features/project-workflows/README.md, workflow/RUNBOOK.md, workflow/README.md, contracts/workflow/README.md. Concern: the run-state.json 1.2.0 export sections (what is derived from which file, what is null when), test coverage honesty (what the fakes can and cannot exercise), the feature directories and whether the docs describe the code accurately.` },
  { key: 'contract-and-adapter', prompt: `${common}\n\nYOUR FILES: contracts/projects/v1.ts, contracts/projects/examples.ts, contracts/projects/contract.test.ts, contracts/projects/README.md, contracts/projects/reviewResult.schema.json, contracts/projects/runInputs.schema.json, server/projects.ts, server/projectRoutes.ts, server/projects.test.ts. Concern: the 1.2.0 payloads, how the adapter validates the export sections and projects them (redaction, truncation, requirement_found_in, diff artifact, review node status/session/result_uri, new routes and 404 codes, interrupted/paused mapping), backward compatibility with 1.0.0 exports, and anything a consumer could be surprised by.` },
  { key: 'ui', prompt: `${common}\n\nYOUR FILES: src/projects/api.ts, src/projects/status.ts, src/projects/panels.tsx, src/projects/NodeDetail.tsx, src/projects/RunView.tsx, src/projects/ReviewDetail.tsx, src/projects/WorkerInputs.tsx, src/projects/Assignment.tsx, src/App.css, src/index.css. Concern: what the viewer now shows on the run header, the review node and the worker nodes; the tab/toggle/highlight mechanics; how "not recorded" states and scoped links are handled; accessibility; any state that could throw or mislead.` },
  { key: 'browser-tests-and-docs', prompt: `${common}\n\nYOUR FILES: tests/project-workflows/fixtures.ts, tests/project-workflows/mock.ts, tests/project-workflows/seed.ts, tests/project-workflows/support.ts, tests/project-workflows/projects.spec.ts, tests/project-workflows/review.spec.ts, tests/project-workflows/inputs.spec.ts, docs/HANDOFF_REVIEW_VISIBILITY.md, docs/PRD_*.md. Concern: what the nine new scenarios actually assert versus the PRD tables, how worker-mode mocks and candidate-mode seeds stay in step with the real adapter, what the seeded runs are, and whether the handoff/PRD edits match the code (flag any claim in the docs that the diff does not support).` },
]

phase('Read')
const results = await parallel(LENSES.map(lens => () => agent(lens.prompt, { label: `read:${lens.key}`, phase: 'Read', schema: OUT })))
return Object.fromEntries(LENSES.map((lens, index) => [lens.key, results[index]]))