import type { WorkerResult } from '../workflow/v1.js'
import type { ReviewFinding, ReviewResult, RunDetail, RunInputs } from './v1.js'

export const runDetail: RunDetail = {
  summary: {
    contract_version: '1.0.0', project_id: 'md-manager', workflow_id: 'feature-implementation',
    definition_revision: 'a'.repeat(64), run_id: 'run-001', status: 'running',
    created_at: '2026-01-01T12:00:00Z', updated_at: '2026-01-01T12:01:00Z',
  },
  definition: {
    contract_version: '1.0.0', project_id: 'md-manager', workflow_id: 'feature-implementation',
    definition_revision: 'a'.repeat(64), name: 'Feature implementation',
    nodes: [
      { node_id: 'ui', label: 'UI worker', kind: 'worker', depends_on: [] },
      { node_id: 'adapter', label: 'Adapter worker', kind: 'worker', depends_on: [] },
      { node_id: 'review', label: 'Independent review', kind: 'review', depends_on: ['ui', 'adapter'] },
    ],
  },
  snapshot: {
    contract_version: '1.0.0', run_id: 'run-001', status: 'running', last_sequence: 2,
    nodes: [
      { node_id: 'ui', kind: 'worker', depends_on: [], status: 'succeeded', attempt: 1, session_id: 'ui-session', result_uri: '/api/projects/md-manager/workflows/feature-implementation/runs/run-001/results/ui/1', lane_results: [] },
      { node_id: 'adapter', kind: 'worker', depends_on: [], status: 'running', attempt: 1, session_id: 'adapter-session', result_uri: null, lane_results: [] },
      { node_id: 'review', kind: 'review', depends_on: ['ui', 'adapter'], status: 'pending', attempt: 0, session_id: null, result_uri: null, lane_results: [] },
    ],
  },
}
const artifacts = '/api/projects/md-manager/workflows/feature-implementation/runs/run-001/artifacts'
/**
 * A worker-phase result as `.../results/ui/1` serves it: scoped artifact links, the snapshot's changed text files as
 * `file` artifacts with their repo-relative `path`, and the changed paths that were not captured with the reason.
 */
export const servedWorkerResult: WorkerResult = {
  contract_version: '1.0.0', run_id: 'run-001', node_id: 'ui', attempt: 1, session_id: 'ui-session', status: 'succeeded',
  base_commit: 'a'.repeat(40), output_commit: 'b'.repeat(40),
  changed_files: ['docs/VIEWER.md', 'src/projects/Viewer.tsx', 'src/projects/logo.png', 'src/projects/big.json'],
  checks: [{ command: 'npm run build', cwd: 'verification/worker/ui/1/worktree', started_at: '2026-01-01T12:00:00Z', finished_at: '2026-01-01T12:00:30Z', exit_code: 0, log_artifact_id: 'log-2-0123456789ab' }],
  open_assumptions: [],
  artifacts: [
    { artifact_id: 'file-0-0123456789ab', kind: 'file', path: 'docs/VIEWER.md', uri: `${artifacts}/file-0-0123456789ab`, sha256: 'c'.repeat(64) },
    { artifact_id: 'file-1-0123456789ab', kind: 'file', path: 'src/projects/Viewer.tsx', uri: `${artifacts}/file-1-0123456789ab`, sha256: 'd'.repeat(64) },
    { artifact_id: 'log-2-0123456789ab', kind: 'log', uri: `${artifacts}/log-2-0123456789ab`, sha256: 'e'.repeat(64) },
  ],
  files_not_captured: [{ path: 'src/projects/logo.png', reason: 'binary' }, { path: 'src/projects/big.json', reason: 'too_large' }],
  deferred_checks: [{ id: 'frontend-build', check_index: 0 }],
  summary: 'Trusted worker check capture; not integration approval', error: null,
}
export const projectList = { projects: [{ project_id: 'md-manager', name: 'MD Manager' }] }
export const workflowList = { workflows: [runDetail.definition] }
export const runList = { runs: [runDetail.summary], next_cursor: null }

const UI_TASK = '# UI worker\n\nRender the review verdict on the review node. Show every finding with severity and disposition.\n\nApproved ownership and checks:\n{"node_id": "ui"}'

const GENERAL_FINDINGS: ReviewFinding[] = [
  {
    severity: 'P2', message: 'The findings table omits the disposition column on narrow screens.', disposition: 'open',
    worker: 'ui', requirement: 'Show every finding with severity and disposition.', requirement_found_in: ['ui'], reviewer: 'general',
  },
  {
    severity: 'P2', message: 'The root Playwright suite is not part of the policy check set.', disposition: 'accepted',
    worker: 'none', requirement: null, requirement_found_in: [], reviewer: 'general',
  },
]
const COVERAGE_FINDINGS: ReviewFinding[] = [
  {
    severity: 'P2', message: 'The review route and its panel disagree about the attempt number.', disposition: 'resolved',
    worker: 'multiple', requirement: null, requirement_found_in: [], reviewer: 'coverage',
  },
  {
    severity: 'P2', message: 'The findings table omits the disposition column on narrow screens.', disposition: 'open',
    worker: 'ui', requirement: 'Show every finding with severity and disposition.', requirement_found_in: ['ui'], reviewer: 'coverage',
  },
]

/**
 * A recorded review by two reviewers (`general` and `coverage`) over the same bundle: both approved, the combined list is the
 * union of their findings tagged by reviewer (the same defect reported twice is kept twice), and `reviewers` records each one.
 */
export const reviewResult: ReviewResult = {
  contract_version: '1.4.0', run_id: 'run-001', node_id: 'review', attempt: 1,
  reviewer: { session_id: '3f0c2a44-9f5b-4d0e-8c0a-5a6b7c8d9e01, 7a1d9c02-4b3e-4f60-9d21-0c8e5f6a7b02', transport: 'native', independent: true },
  bundle_sha256: 'b'.repeat(64), candidate_commit: 'c'.repeat(40),
  verdict: 'approved',
  findings: [...GENERAL_FINDINGS, ...COVERAGE_FINDINGS],
  reviewers: [
    {
      reviewer_id: 'general', transport: 'native', session_id: '3f0c2a44-9f5b-4d0e-8c0a-5a6b7c8d9e01', verdict: 'approved', findings: GENERAL_FINDINGS,
      launched_at: '2026-01-01T12:10:00Z', accepted_at: '2026-01-01T12:28:00Z', status: 'accepted',
    },
    {
      reviewer_id: 'coverage', transport: 'native', session_id: '7a1d9c02-4b3e-4f60-9d21-0c8e5f6a7b02', verdict: 'approved', findings: COVERAGE_FINDINGS,
      launched_at: '2026-01-01T12:10:05Z', accepted_at: '2026-01-01T12:30:00Z', status: 'accepted',
    },
  ],
  reviewed_at: '2026-01-01T12:30:00Z',
  diff: { artifact_id: 'patch-review-2bb474561d3e', kind: 'patch', uri: '/api/projects/md-manager/workflows/feature-implementation/runs/run-001/artifacts/patch-review-2bb474561d3e', sha256: 'd'.repeat(64) },
}

/** The pinned assignment of the same run: two of three declared lanes selected, one automatic profile, receipts as far as the run got. */
export const runInputs: RunInputs = {
  contract_version: '1.3.0', run_id: 'run-001', feature: 'Review verdict and findings in the viewer',
  base_commit: 'e'.repeat(40), source_branch: 'feature/review-result/run-001', mode: 'automatic',
  automatic: { finish: 'verified-feature-branch', permission_mode: 'bypassPermissions', worker_timeout_seconds: 14400, review_timeout_seconds: 1800, reviewer_transport: 'native' },
  setup: [{ command: 'npm ci', timeout_seconds: 600 }],
  max_verification_attempts: 3,
  selected_workers: ['ui', 'adapter'],
  excluded_workers: ['docs'],
  workers: [
    {
      node_id: 'ui', launch_node_id: 'launch_ui', role: 'frontend', required_check_kinds: ['build', 'browser'],
      task: { text: UI_TASK, truncated: false },
      prompt: { text: `You are a workflow worker in your own worktree.\n\n${UI_TASK}`, truncated: false },
      owned_paths: ['src/projects', 'tests/project-workflows'],
      checks: [
        { id: 'frontend-build', kind: 'build', command: 'npm run build', timeout_seconds: 180, scenarios: [] },
        { id: 'review-browser', kind: 'browser', command: 'npx --no-install playwright test --config=tests/project-workflows/playwright.config.ts', timeout_seconds: 300, scenarios: [{ id: 'review-verdict', description: 'The review node shows the verdict and findings' }] },
      ],
      launch: { session_id: 'ui-session', launch_requested_at: '2026-01-01T12:00:00Z', native_started_at: '2026-01-01T12:00:02Z', observed_state: 'working', status: 'attached_session_available', launcher_invocations: 1 },
      completion: { status: 'completed', summary: 'Implemented the findings panel.', open_assumptions: ['Candidate mode seeds the review section.'] },
      handoff: { summary: 'Implemented the findings panel.', open_assumptions: ['Candidate mode seeds the review section.'] },
      stop: { stopped: true, confirmed_at: '2026-01-01T12:20:00Z' },
    },
    {
      node_id: 'adapter', launch_node_id: 'launch_adapter', role: 'backend', required_check_kinds: ['unit'],
      task: { text: '# Adapter worker\n\nServe the review route.', truncated: false },
      prompt: null,
      owned_paths: ['server'],
      checks: [{ id: 'backend-unit', kind: 'unit', command: 'npx --no-install tsx --test server/projects.test.ts', timeout_seconds: 180, scenarios: [] }],
      launch: { session_id: 'adapter-session', launch_requested_at: '2026-01-01T12:00:00Z', native_started_at: null, observed_state: null, status: 'attached_session_available', launcher_invocations: 1 },
      completion: null,
      handoff: null,
      stop: null,
    },
  ],
}
