export const meta = {
  name: 'compare-pr9-pr10-pr11',
  description: 'Three-way code-quality comparison of PRs 9, 10 and 11 (same feature) with adversarial verification and a scoring judge panel',
  phases: [
    { title: 'Review', detail: 'eleven dimension reviewers read all three PR worktrees' },
    { title: 'Verify', detail: 'one adversarial skeptic per dimension' },
    { title: 'Critique', detail: 'completeness critic, gap follow-ups' },
    { title: 'Judge', detail: 'three judges score each PR 1-10' },
  ],
}

const S = '/tmp/claude-1000/-home-agentops-dev-md-manager/4c896989-729c-4d58-b47e-6b887ba715fc/scratchpad'

const CONTEXT = `
You are comparing THREE GitHub pull requests that implement the SAME feature in the same repository (GitHub mani99brar/team-manager, checked out locally as md-manager). All three were authored with Claude Code by the same person on the same day and branch from the same main commit 61e4752. The person wants to know: which has the better CODE QUALITY, which did the better job overall, and a SCORE for each PR. Judge by reading the code. Be concrete and evidence-based: cite file:line, quote code. Do not be diplomatic for its own sake; if one PR is clearly better or worse on your dimension, say so and prove it. Rank all three on your dimension.

DO NOT RUN THE TEST SUITES. The person has confirmed all three PRs' suites pass, and my own run confirmed PR 9 (94 py / 13 contract / tsc+eslint clean / 130 unit) and PR 10 (96 py / 14 contract / clean / 130 unit). Read tests as code and judge their quality; do not execute them. Cheap static checks are fine (grep, wc, diff, python -c import, node -e, reading \`claude --help\`). A tiny throwaway probe to confirm one specific suspected bug is acceptable, on a copy, never in the worktrees. Never start a real Claude session.

LOCATIONS (read-only; NEVER modify files inside these four worktrees):
- main (baseline):   /home/agentops/dev/md-manager            commit 61e4752
- PR 9  = branch feature-opus,  worktree /home/agentops/dev/md-manager-opus   commit 99c770f. "Run the reviewer as an attachable native session (slice A)". 21 files, +1183/-121. Scope: slice A only, no server/ or src/ change. No live smoke test (says so).
- PR 10 = branch feature-high,  worktree /home/agentops/dev/md-manager-high   commit a1fab98. "Review visibility: native reviewer session, review/inputs export, feature runs". 39 files, +3329/-205. Scope: slice A in full PLUS slice B and C "pre-run work" (contracts/projects, export_state, features/review-result, features/run-inputs), no server/ or src/ change. Ran the live smoke test twice (artifacts at ~/.local/state/md-manager-workflows/smoke/review-smoke-001/).
- PR 11 = branch feature-ultra, worktree /home/agentops/dev/md-manager-ultra  commit 43f44de. "Review visibility and run inputs (PRD_REVIEW_VISIBILITY slices A, B, C)". 56 files, +6074/-333. Scope: ALL THREE slices implemented directly (controller, contracts, export, adapter in server/, UI in src/projects, browser tests in tests/project-workflows, feature dirs), bypassing the PRD's plan of shipping B and C as feature runs. Claims four live smoke sessions and a six-lens adversarial audit.
- Full diffs vs main: ${S}/pr9.diff, ${S}/pr10.diff, ${S}/pr11.diff. Each PR restricted to the slice-A file set (apples-to-apples on the shared surface): ${S}/pr10-sliceA.diff (17 files, +1161/-193), ${S}/pr11-sliceA.diff (14 files, +1699/-178); pr9.diff is already slice A only.
- PR descriptions: ${S}/pr9-body.md, ${S}/pr10-body.md, ${S}/pr11-body.md. Commit messages: ${S}/pr9-commit.txt, ${S}/pr10-commit.txt, ${S}/pr11-commit.txt (each PR is one squashed commit).
- Handoff docs: PR 9 /home/agentops/dev/md-manager-opus/docs/HANDOFF_REVIEWER_PANE.md; PR 10 /home/agentops/dev/md-manager-high/docs/HANDOFF_REVIEW_VISIBILITY.md; PR 11 /home/agentops/dev/md-manager-ultra/docs/HANDOFF_REVIEW_VISIBILITY.md.
- Specs on main: /home/agentops/dev/md-manager/docs/PRD_REVIEW_VISIBILITY.md (umbrella: ship A alone, then B's feature run, then C's feature run, "each run has a smaller, focused diff"), docs/PRD_REVIEWER_PANE.md (slice A: 6 work items, section 5 acceptance incl. a controlled live smoke test that gates the merge), docs/PRD_REVIEW_RESULT.md (B), docs/PRD_RUN_INPUTS.md (C). All three PRs edited the PRDs; read main's copies for the original spec and diff each branch to see what it changed.
- Existing live run on disk (must keep loading in the viewer after any merge): ~/.local/state/md-manager-workflows/project-workflows/project-workflows-001/ (plan.json, run-state.json export 1.0.0, review.json from a print-mode reviewer).

KEY FACTS ALREADY ESTABLISHED (verify, do not just trust):
- Reviewer write permission: PR 9 launches with --tools Read,Glob,Grep,Write and --permission-mode dontAsk with NO allow rule; PR 10 and PR 11 both discovered live that this write is denied and use --allowedTools "Edit(//<run>/review.completion.json)". PR 11 additionally found that --add-dir is variadic and swallowed the prompt that followed it, and reordered the arguments.
- Completion schema: PR 9 and PR 10 define reviewCompletion in contracts/workflow/v1.ts (zod) with examples and contract tests and generate reviewCompletion.schema.json via npm run contracts:export (the repo's convention); PR 11 hand-writes a 39-line reviewCompletion.schema.json with no v1.ts/examples/contract.test.ts change, and binds a controller-issued launch_token instead of the reviewer session UUID.
- Export version: PR 9 leaves it at 1.0.0. PR 10 bumps export_state to 1.2.0 without touching the adapter, while main's server/projects.ts validates with z.literal(EXPORT_VERSION)=1.0.0, so new runs after merging PR 10 are rejected by the viewer until slice B lands. PR 11 bumps to 1.2.0 AND updates the adapter to accept 1.0.0/1.1.0/1.2.0.
- Default when plan.json lacks reviewer_transport: PR 9 = native; PR 10 = print; PR 11 = native for validation but nullable in the export (records what was actually used).
- attach-one node name: PR 9 uses --node reviewer; PR 10 and 11 use --node review.

OUTPUT: return only the structured object requested. In "evidence" put file:line refs, quoted code, and any commands you ran with their salient output. Findings must be specific and checkable. Include "praise" findings for things done notably well so the comparison is fair. Severity: high = would block merge, is a real bug, or materially misleads a reviewer; medium = should be fixed; low = nit. Give each PR a 1-10 score on your dimension.
`

const FINDING = {
  type: 'object',
  properties: {
    pr: { type: 'string', enum: ['9', '10', '11', '9+10', '10+11', '9+11', 'all'] },
    kind: { type: 'string', enum: ['bug', 'risk', 'design', 'quality', 'test', 'docs', 'scope', 'praise', 'discrepancy', 'security'] },
    severity: { type: 'string', enum: ['high', 'medium', 'low'] },
    title: { type: 'string' },
    detail: { type: 'string' },
    evidence: { type: 'string' },
  },
  required: ['pr', 'kind', 'severity', 'title', 'detail', 'evidence'],
}

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Three to five sentences: what you examined and the headline three-way comparison' },
    pr9: { type: 'string', description: 'Assessment of PR 9 on this dimension' },
    pr10: { type: 'string', description: 'Assessment of PR 10 on this dimension' },
    pr11: { type: 'string', description: 'Assessment of PR 11 on this dimension' },
    ranking: { type: 'array', items: { type: 'string', enum: ['pr9', 'pr10', 'pr11'] }, description: 'best first' },
    ranking_reason: { type: 'string' },
    score_pr9: { type: 'number' }, score_pr10: { type: 'number' }, score_pr11: { type: 'number' },
    findings: { type: 'array', items: FINDING },
  },
  required: ['summary', 'pr9', 'pr10', 'pr11', 'ranking', 'ranking_reason', 'score_pr9', 'score_pr10', 'score_pr11', 'findings'],
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'exact title of the finding being judged' },
          verdict: { type: 'string', enum: ['confirmed', 'refuted', 'downgraded', 'unverifiable'] },
          reason: { type: 'string' },
          corrected_severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          evidence: { type: 'string' },
        },
        required: ['title', 'verdict', 'reason', 'evidence'],
      },
    },
    ranking_after_verification: { type: 'array', items: { type: 'string', enum: ['pr9', 'pr10', 'pr11'] } },
    ranking_note: { type: 'string' },
    score_pr9: { type: 'number' }, score_pr10: { type: 'number' }, score_pr11: { type: 'number' },
    new_findings: { type: 'array', items: FINDING },
  },
  required: ['verdicts', 'ranking_after_verification', 'ranking_note', 'score_pr9', 'score_pr10', 'score_pr11', 'new_findings'],
}

const CRITIC_SCHEMA = {
  type: 'object',
  properties: {
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          why_it_matters: { type: 'string' },
          how_to_check: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['title', 'why_it_matters', 'how_to_check', 'priority'],
      },
    },
    contradictions: { type: 'array', items: { type: 'string' } },
  },
  required: ['gaps', 'contradictions'],
}

const SCORES = {
  type: 'object',
  properties: {
    code_quality: { type: 'number' }, structure: { type: 'number' }, correctness: { type: 'number' },
    tests: { type: 'number' }, spec_fidelity: { type: 'number' }, docs_and_handoff: { type: 'number' },
    reviewability: { type: 'number' }, overall: { type: 'number' },
  },
  required: ['code_quality', 'structure', 'correctness', 'tests', 'spec_fidelity', 'docs_and_handoff', 'reviewability', 'overall'],
}

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    lens: { type: 'string' },
    scores_pr9: SCORES, scores_pr10: SCORES, scores_pr11: SCORES,
    best_code_quality: { type: 'string', enum: ['pr9', 'pr10', 'pr11'] },
    overall_ranking: { type: 'array', items: { type: 'string', enum: ['pr9', 'pr10', 'pr11'] } },
    easiest_to_review: { type: 'string', enum: ['pr9', 'pr10', 'pr11'] },
    rationale: { type: 'string' },
    key_points: { type: 'array', items: { type: 'string' } },
    per_pr_verdict: {
      type: 'object',
      properties: { pr9: { type: 'string' }, pr10: { type: 'string' }, pr11: { type: 'string' } },
      required: ['pr9', 'pr10', 'pr11'],
    },
    merge_recommendation: { type: 'string' },
  },
  required: ['lens', 'scores_pr9', 'scores_pr10', 'scores_pr11', 'best_code_quality', 'overall_ranking', 'easiest_to_review', 'rationale', 'key_points', 'per_pr_verdict', 'merge_recommendation'],
}

const DIMENSIONS = [
  {
    key: 'controller-structure',
    prompt: `DIMENSION: code structure, abstraction and maintainability of the slice-A controller changes. Compare ${S}/pr9.diff, ${S}/pr10-sliceA.diff and ${S}/pr11-sliceA.diff on the shared surface (workflow/automatic.py, interactive.py, pipeline.py, launch.py, sessions.py), reading the full files in each worktree where the diff is not enough.
Assess how each generalised worker-only code to cover a reviewer (PR 9: worktree()/receipt_path()/stop_session + REVIEWER constant with file_prefix in sessions.py; PR 10: SESSION_NODES, worktree_of, reconcile/launch/run_reviewer generalisation, stop_session(node); PR 11: InteractiveSessions knows node 'review', launch_name/node_worktree, _review_native/_review_print split, ExportRuntime), and which is cleanest, least duplicated and least likely to rot. Function length and cohesion of the new review functions; naming consistency (reviewer vs review); where the transport switch lives and how reviewer_transport is plumbed and pinned; defaults for plans lacking the key and which is safest given the on-disk run; dead code, copy-paste, magic strings, error-message quality, timeline events. Give a maintainer's verdict with a 1-10 score per PR: which codebase would you rather own in six months, citing the code that decided it.`,
  },
  {
    key: 'review-protocol-correctness',
    prompt: `DIMENSION: correctness of the review-node control path by reading workflow/automatic.py (and the pipeline.py functions it calls) in all three PRs.
Read each implementation of: reviewer launch, wait/poll, completion-file read and validation, bindings (run id, node, bundle sha, candidate commit, launch token and/or reviewer UUID), independence from both worker UUIDs, which session states accept the file (idle/done/blocked/working) vs the PRD, deadline semantics, behaviour when the reviewer session vanishes / is blocked / is stopped externally, KeyboardInterrupt and resume in a new controller process, the "no second reviewer" guarantee, fail-closed on invalid or foreign files, symlink/oversize/partial-write handling, TOCTOU between validation and acceptance, review.json for blocked verdicts, re-checks of bundle/diff hash and worktree cleanliness before acceptance, stop after acceptance and what happens if the stop fails, and exception handling that could swallow failures. PR 11's handoff lists fixes from an audit (launch-window Ctrl-C stranding the session, post-acceptance stop never retried, approved-with-open-P1 recorded as blocked): check whether PR 9 and PR 10 have those same defects, and whether PR 11's fixes are correct. For each suspected bug, point at the exact lines and explain the failing sequence; a tiny probe on a copy is allowed. Rank the three on robustness with a 1-10 score each.`,
  },
  {
    key: 'launch-attach-stop',
    prompt: `DIMENSION: the reviewer launch, pane, attach and stop code (workflow/interactive.py, pipeline.py, sessions.py) in all three PRs, and whether each would work against the real Claude Code CLI.
(1) Extract the exact argv each PR builds for the reviewer (tools, --allowedTools, --permission-mode, --add-dir, --safe-mode, MCP config, --name, prompt position, cwd) and compare with the worker launch argv on main. (2) Using \`claude --help\` and Claude Code's permission documentation (no real sessions): is PR 9's launch (Write tool, dontAsk, no allow rule) able to write the completion file? Is the Edit(//abs/path) spelling PR 10 and 11 use the documented one? Does --add-dir take multiple values so that a prompt placed after it is swallowed (PR 11's claim), and if so does PR 9 or PR 10 place the prompt after --add-dir? Does --safe-mode exist? (3) Pane attachment: third pane in the run's tab, idempotence, attach-one naming, detached-run behaviour, whether \`attach\` (all panes) also adds the reviewer (PR 11 says it fixed this; check 9 and 10). (4) Stop: identity re-check, idempotence, event recording, stop markers. (5) Regressions to the existing worker launch/attach/stop paths from each PR's generalisation. Rank with 1-10 scores; a PR whose reviewer cannot write its verdict or never receives its prompt is live-broken and must score accordingly.`,
  },
  {
    key: 'contracts-and-schemas',
    prompt: `DIMENSION: contract and schema design across the three PRs.
(1) reviewCompletion: compare PR 9 and PR 10 (zod in contracts/workflow/v1.ts + examples.ts + contract.test.ts + generated schema JSON) with PR 11 (hand-written contracts/workflow/reviewCompletion.schema.json, no TS module, launch_token binding instead of reviewer UUID). Check the repo convention (contracts/*/README.md, export.ts, package.json contracts:export) and judge whether PR 11's hand-written schema violates it, whether the schema JSON in each PR matches what npm run contracts:export would emit (run \`git status\`-safe check: run the export into a temp copy, not the worktree, or compare by reading export.ts), strictness (additionalProperties, enums, patterns), required vs optional worker/requirement on the wire vs in the Python validator, cross-field rules (blocked with no findings; approved with open P0/P1), and how the Python side validates (jsonschema? hand-rolled?). (2) contracts/projects additions in PR 10 (reviewResult 1.1.0, runInputs + runInputsResponse 1.2.0, requirement_verbatim) vs PR 11 (reviewResult, runInputs at 1.2.0, requirement_found_in): compare against the PRD B/C tables, additivity, example and negative-test quality, README updates, and consistency between the TS contract, the generated JSON, the Python export and (for PR 11) the adapter's zod parsing. (3) Versioning coherence: export version vs contract_version per payload in each PR; anything contradictory. Rank with 1-10 scores.`,
  },
  {
    key: 'export-and-compat',
    prompt: `DIMENSION: workflow/export_state.py, the \`workflow export\` CLI action, and backward compatibility, in PR 10 and PR 11 (PR 9 does not touch export; score it on compat only).
Read export_state.py and the export_run/ExportRuntime code in pipeline.py in both. Judge: correctness of the review and inputs sections (sources, null handling, hashes, truncation at 256 KiB in PR 10 vs 64 KiB adapter-side in PR 11, timestamps), the lightweight runtime approach, lock handling, validation of plan/policy/review before export, refusal paths, and duplication with the normal export path. Then compat: prove from code (main's server/projects.ts z.literal(EXPORT_VERSION) at line 52 vs each PR's server/projects.ts if changed) what happens to (a) the existing run project-workflows-001 (export 1.0.0 on disk) and (b) a new run exported by each PR's controller, when served by the adapter that PR ships. State plainly for each PR whether merging it as-is leaves the viewer working for new runs. Rank with 1-10 scores.`,
  },
  {
    key: 'adapter-server',
    prompt: `DIMENSION: PR 11 only has real adapter work (server/projects.ts, server/projectRoutes.ts, server/projects.test.ts); PR 10 ships adapter-task.md files that DESCRIBE the same work for a future worker; PR 9 ships nothing here.
Review PR 11's adapter code as a security-minded backend reviewer: export version acceptance, projection of the review and inputs sections, redaction (paths adjacent to Markdown punctuation, file:// URIs, absolute paths in commands), the review.diff artifact registration (hash and size checks, content type, nosniff/CSP), bounded reads and truncation, 404 vs 500 behaviour, verbatim requirement lookup (requirement_found_in) never guessing, error bodies never containing paths, and consistency with the existing adapter style on main. Judge the test file as code (fixtures, assertion strength, coverage of the negative paths). Then compare with PR 10's adapter-task.md and PR 11's own adapter-task.md: is the task specification precise enough that a worker would produce equivalent code, and does PR 11's shipped code match the PRD B/C adapter deliverables? Score PR 11 on quality of what shipped; score PR 10 on quality of the specification; score PR 9 as not applicable (use 0 and say so) unless you find it should score for restraint.`,
  },
  {
    key: 'ui-and-browser-tests',
    prompt: `DIMENSION: PR 11 only has real UI work (src/projects/ReviewDetail.tsx, Assignment.tsx, WorkerInputs.tsx, RunView.tsx, NodeDetail.tsx, api.ts, panels.tsx, status.ts, App.css, index.css) and browser tests (tests/project-workflows/review.spec.ts, inputs.spec.ts, fixtures.ts, seed.ts, mock.ts, support.ts); PR 10 ships ui-task.md files describing the same work; PR 9 ships nothing here.
Review PR 11's UI code as a front-end reviewer: component structure and size, state handling, accessibility of the new panels and toggles, consistency with the existing src/projects components on main, redaction assumptions, the finding-to-task scroll/highlight mechanics, "no review recorded"/"inputs not recorded" legacy states, CSS hygiene. Review the browser tests as code: fixtures vs seeds (worker vs candidate phase), assertion strength, any conditional or vacuous assertions, whether the PRD B/C acceptance scenario ids (review-verdict, review-blocked, review-legacy, paths-redacted, run-assignment, worker-inputs, finding-to-task, inputs-legacy) are each covered by a real assertion. Compare with PR 10's ui-task.md and policy.json scenario lists. Score PR 11 on shipped quality, PR 10 on specification quality, PR 9 as not applicable (0, say so).`,
  },
  {
    key: 'python-tests-as-code',
    prompt: `DIMENSION: quality of the Python test code for slice A in all three PRs (workflow/test_automatic.py, test_interactive.py, test_pipeline.py, test_feature_launch.py; plus test_export.py in PR 10 and 11). Do NOT run them.
Map each PR's new tests to PRD_REVIEWER_PANE work item 5 (offline reviewer via FakeSessions; three-process recovery extended to a reviewer interruption; rejected completion file with wrong bundle hash / wrong UUID / wrong candidate fails closed; print-mode fallback still passes) and to the acceptance bullets in section 5. Judge assertion strength (behaviour vs implementation detail), fake and fixture design (how each PR extended FakeSessions), readability and naming, duplication, brittleness, and whether any pre-existing test was weakened or pinned to keep passing (PR 10's handoff says print-mode tests were pinned to reviewer_transport=print and the multi-process assertion was loosened to "one interruption and a final success"; PR 9 asserts exact exit codes [75,130,75,0]; check what PR 11 does). List the reviewer-related test names per PR and note important behaviours with no test in each. Rank with 1-10 scores.`,
  },
  {
    key: 'spec-fidelity-and-scope',
    prompt: `DIMENSION: spec fidelity and scope discipline.
Build a table mapping every work item (PRD_REVIEWER_PANE section 4, items 1-6), every design-table row (section 3) and every acceptance bullet (section 5) to what each PR implements, with file:line. Note deviations and classify each as (a) justified and recorded, (b) silent, or (c) a spec rewrite to fit the code; diff docs/PRD_*.md on main against each branch to see how each PR edited the specs. Then judge scope against the umbrella PRD's explicit plan (A alone, then B as a feature run, then C as a feature run, with the stated rationale): PR 9 follows it; PR 10 adds B/C pre-run work; PR 11 implements B and C directly and bypasses the feature-run process the PRDs prescribe (its handoff says so). Weigh: did the PRD author leave room for that? What is gained (a coherent, viewer-working merge; measured verbatim match rate) and lost (the feature-run exercise of the reviewer pane that slice B was meant to provide; review focus; the process itself)? Also the "live smoke test gates the merge" rule: PR 9 skipped it and said so; PR 10 and 11 ran it. Rank with 1-10 scores on doing what was asked, the way it was asked, with honest recording of deviations.`,
  },
  {
    key: 'reviewability-and-docs',
    prompt: `DIMENSION: reviewability and documentation honesty. Put yourself in the seat of the human who has to approve one of these.
(1) Effort: files, lines, distinct concerns, single-commit vs splittable, share of the diff that is mechanical (generated schemas, fixtures, feature dirs) vs logic; estimate reviewer hours for each. (2) Description accuracy: check the checkable claims in ${S}/pr9-body.md, pr10-body.md, pr11-body.md, the commit messages and the handoffs against the diffs (e.g. PR 9 "no server/ or src/ change"; PR 10 "96 Python tests" in the body vs "95" in its handoff; PR 11 "contracts: 13" although it adds projects contract tests, "124 Python tests (59 before)" vs the other two citing 70 before, "backend: 30", "15 browser scenarios" vs scenario ids listed, "git diff --check clean"). Where a claim cannot be checked without running things, say so rather than guessing. (3) Does each description steer the reviewer to the real risks (PR 9 names two explicitly)? (4) Docs: RUNBOOK, INTERACTIVE_SESSIONS, workflow/README, feature README, contract READMEs: are operator instructions correct against the code in that PR (attach-one node name, transport flag, recovery steps, export command)? Any doc describing behaviour the code lacks? (5) Are the handoffs an asset or noise (PR 9 red/green tables and mutation checks; PR 10 live-smoke narrative and suggested commit split; PR 11 six-lens audit narrative and four attempts)? Conclude which is easiest to review and rank with 1-10 scores.`,
  },
  {
    key: 'claims-and-evidence',
    prompt: `DIMENSION: independent check of each PR's stated evidence, WITHOUT running test suites.
(1) PR 10's live smoke test: inspect ~/.local/state/md-manager-workflows/smoke/review-smoke-001/ and cross-check the handoff narrative (sessions dccd22b5 and 5865c9a6, bundle hash 58308a53, candidate b5385b3, verdict blocked with 1 P1 + 6 P2, 7/7 requirement quotes verbatim; verify the 7/7 yourself by searching each finding's requirement string in that run's plan.json task text; stop marker; terminals.json pane). (2) PR 11's live smoke tests: its handoff names sessions a4c348e5, 25d99bf4, f36b923d and a scratch run "built from a copy of project-workflows-001's bundle" whose reviewer was named workflow-project-workflows-001-reviewer. Find that scratch run on disk if it exists (search ~/.local/state, /tmp, the ultra worktree, and \`claude agents --all --json\` if available, for review.completion.json / review.stop.json / those session ids) and cross-check: 8/8 verbatim quotes, the P3 rejection, the deadline path, the accept path. If the artifacts cannot be found, say so plainly and rate the claim as unverifiable, not false. Check the /tmp/permtest experiment directory too. (3) PR 9's red/green narrative: check internal consistency by reading (do the named tests exist; do the described mutation checks correspond to real code paths). (4) Report every discrepancy between claim and reality per PR and score each PR's evidence quality 1-10 (quality = real, checkable, honest about limits).`,
  },
]

const reviewPrompt = d => `${CONTEXT}\n\n${d.prompt}`

const verifyPrompt = (d, r) => `${CONTEXT}

You are an adversarial verifier for the "${d.key}" dimension. Another reviewer produced the findings below. REFUTE each finding of severity high or medium: re-read the code yourself, check the docs, use a tiny probe on a copy if one specific claim needs it (never run the test suites). Do not accept a finding because it sounds plausible. Mark "confirmed" only when you personally observed the evidence; "refuted" when it is wrong; "downgraded" when true but overstated (give corrected_severity); "unverifiable" only when you genuinely could not check. Then re-rank the three PRs on this dimension and give your own 1-10 scores, and add any important finding the reviewer missed (as new_findings, same evidence standard). Be as skeptical of "praise" as of bugs.

Reviewer summary: ${r.summary}
Reviewer PR 9: ${r.pr9}
Reviewer PR 10: ${r.pr10}
Reviewer PR 11: ${r.pr11}
Reviewer ranking: ${JSON.stringify(r.ranking)} because ${r.ranking_reason}
Reviewer scores: pr9=${r.score_pr9} pr10=${r.score_pr10} pr11=${r.score_pr11}

Findings to verify (JSON):
${JSON.stringify(r.findings.filter(f => f.severity !== 'low'), null, 2)}

Low-severity findings you may skip unless one is wrong in a way that matters:
${JSON.stringify(r.findings.filter(f => f.severity === 'low').map(f => f.title), null, 2)}`

phase('Review')
log('Reviewing three PRs across 11 dimensions, 2 agents at a time (4-CPU host)')

const results = await pipeline(
  DIMENSIONS,
  d => agent(reviewPrompt(d), { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA }),
  (r, d) => {
    if (!r) return null
    log(`review:${d.key} done — ranking ${r.ranking.join('>')}, ${r.findings.length} findings`)
    return agent(verifyPrompt(d, r), { label: `verify:${d.key}`, phase: 'Verify', schema: VERIFY_SCHEMA })
      .then(v => ({ dimension: d.key, review: r, verify: v }))
  },
)

const dims = results.filter(Boolean)
log(`${dims.length}/${DIMENSIONS.length} dimensions reviewed and verified`)

function mergeDimension(x) {
  const verdictByTitle = new Map((x.verify?.verdicts || []).map(v => [v.title, v]))
  const findings = x.review.findings.map(f => {
    const v = verdictByTitle.get(f.title)
    if (!v) return { ...f, dimension: x.dimension, verdict: f.severity === 'low' ? 'unverified-low' : 'unverified' }
    return {
      ...f,
      dimension: x.dimension,
      verdict: v.verdict,
      severity: v.verdict === 'downgraded' && v.corrected_severity ? v.corrected_severity : f.severity,
      verifier_reason: v.reason,
      verifier_evidence: v.evidence,
    }
  })
  const extra = (x.verify?.new_findings || []).map(f => ({ ...f, dimension: x.dimension, verdict: 'added-by-verifier' }))
  return {
    dimension: x.dimension,
    summary: x.review.summary,
    pr9: x.review.pr9, pr10: x.review.pr10, pr11: x.review.pr11,
    reviewer_ranking: x.review.ranking,
    reviewer_scores: { pr9: x.review.score_pr9, pr10: x.review.score_pr10, pr11: x.review.score_pr11 },
    ranking_after_verification: x.verify?.ranking_after_verification || x.review.ranking,
    verifier_scores: x.verify ? { pr9: x.verify.score_pr9, pr10: x.verify.score_pr10, pr11: x.verify.score_pr11 } : null,
    ranking_reason: x.review.ranking_reason,
    verifier_note: x.verify?.ranking_note || '',
    findings: findings.concat(extra),
  }
}

const merged = dims.map(mergeDimension)
const refuted = merged.flatMap(m => m.findings.filter(f => f.verdict === 'refuted'))
log(`${merged.flatMap(m => m.findings).length - refuted.length} findings survive verification, ${refuted.length} refuted`)

phase('Critique')
const critic = await agent(`${CONTEXT}

You are the completeness critic. Below are the verified results of eleven review dimensions comparing PRs 9, 10 and 11. Answer: what is MISSING that could change "which has the best code quality, which did the better job, and what score each deserves"? Look for: files in any diff no dimension examined (list each diff's files and check coverage), a high-severity finding left unverified, contradictions between dimensions or between a reviewer and its verifier (e.g. different claims about the same code), a PR that was scored on one dimension for work it did not ship, and any important code path nobody read (print-mode regression, resume across controller processes, the existing live run still loading in each PR's adapter). Do the cheap checks yourself; reserve "high" priority for gaps that could change a ranking or move a score by 2 or more.

Dimension results:
${JSON.stringify(merged, null, 2)}`, { label: 'critic', phase: 'Critique', schema: CRITIC_SCHEMA })

const highGaps = (critic?.gaps || []).filter(g => g.priority === 'high')
const gaps = highGaps.slice(0, 3)
if (highGaps.length > 3) log(`Capped gap follow-up at 3 of ${highGaps.length} high-priority gaps`)
log(`critic: ${critic?.gaps?.length || 0} gaps (${highGaps.length} high), ${critic?.contradictions?.length || 0} contradictions`)

const gapResults = await pipeline(
  gaps,
  g => agent(`${CONTEXT}

A completeness critic identified this gap. Investigate it fully, with evidence, to the same standard as the dimension reviewers, and state plainly whether the result changes any PR's ranking or score.

Gap: ${g.title}
Why it matters: ${g.why_it_matters}
How to check: ${g.how_to_check}

Contradictions the critic noticed (resolve any that touch your gap): ${JSON.stringify(critic.contradictions)}`, { label: `gap:${g.title.slice(0, 40)}`, phase: 'Critique', schema: FINDINGS_SCHEMA }),
  (r, g) => r ? agent(verifyPrompt({ key: `gap:${g.title}` }, r), { label: `verify-gap:${g.title.slice(0, 30)}`, phase: 'Critique', schema: VERIFY_SCHEMA }).then(v => ({ dimension: `gap:${g.title}`, review: r, verify: v })) : null,
)
const allDims = merged.concat(gapResults.filter(Boolean).map(mergeDimension))
const allSurviving = allDims.flatMap(m => m.findings.filter(f => f.verdict !== 'refuted'))

phase('Judge')
const JUDGES = [
  { lens: 'maintainer', prompt: 'You are the long-term maintainer of workflow/, contracts/, server/ and src/projects. You weigh structure, abstraction quality, correctness under failure, test durability and backward compatibility. You care about which code you would rather own and extend.' },
  { lens: 'reviewer', prompt: 'You are the human who has to approve one of these PRs today. You weigh reviewability (size, scope, splittability, precision and honesty of the description and handoff, whether evidence is real and checkable), the risk of merging as-is, and whether the PR did what the PRD asked the way it asked. You penalise scope creep and unverifiable claims; you reward evidence that lets you skip re-deriving things. But you also recognise that a PR whose code is live-broken is not mergeable however small it is.' },
  { lens: 'product-owner', prompt: 'You wrote the PRDs. You weigh whether the shipped behaviour actually works live (reviewer pane, completion protocol, unattended completion), whether the section-5 acceptance gate was honoured, whether decisions and deviations were recorded honestly in the PRDs, whether the viewer keeps working for the existing run and for new runs after merge, and whether bypassing the feature-run process (PR 11) or bundling pre-run work (PR 10) was a good call or an overreach.' },
]

const judges = await parallel(JUDGES.map(j => () => agent(`${CONTEXT}

${j.prompt}

Below are the verified comparison results (eleven dimensions plus gap follow-ups; each finding carries a verifier verdict; refuted findings are listed separately and must not be used). Score all three PRs 1-10 on each axis and give an OVERALL 1-10 score per PR, name the best code quality, rank the three overall, name the easiest to review, and write a rationale a colleague could act on, citing the specific findings that decided each call. Give a one-paragraph verdict per PR and a merge recommendation for each (merge as-is / merge with named changes / split / reject).

Dimension summaries, rankings and scores:
${JSON.stringify(allDims.map(m => ({ dimension: m.dimension, summary: m.summary, pr9: m.pr9, pr10: m.pr10, pr11: m.pr11, reviewer_ranking: m.reviewer_ranking, ranking_after_verification: m.ranking_after_verification, reviewer_scores: m.reviewer_scores, verifier_scores: m.verifier_scores, ranking_reason: m.ranking_reason, verifier_note: m.verifier_note })), null, 2)}

Surviving findings (${allSurviving.length}):
${JSON.stringify(allSurviving.map(f => ({ dimension: f.dimension, pr: f.pr, kind: f.kind, severity: f.severity, verdict: f.verdict, title: f.title, detail: f.detail, evidence: f.evidence, verifier_reason: f.verifier_reason })), null, 2)}

Refuted findings (awareness only):
${JSON.stringify(refuted.map(f => ({ dimension: f.dimension, pr: f.pr, title: f.title, verifier_reason: f.verifier_reason })), null, 2)}`, { label: `judge:${j.lens}`, phase: 'Judge', schema: JUDGE_SCHEMA, effort: 'xhigh' })))

return {
  dimensions: allDims,
  refuted,
  critic,
  judges: judges.filter(Boolean),
}
