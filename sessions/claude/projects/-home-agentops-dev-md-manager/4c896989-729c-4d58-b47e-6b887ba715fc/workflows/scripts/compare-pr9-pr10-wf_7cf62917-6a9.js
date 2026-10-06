export const meta = {
  name: 'compare-pr9-pr10',
  description: 'Compare PR 9 and PR 10 (same feature) on code quality, structure, correctness, tests, spec fidelity and reviewability, with adversarial verification and a judge panel',
  phases: [
    { title: 'Review', detail: 'nine dimension reviewers over both PR worktrees' },
    { title: 'Verify', detail: 'one adversarial skeptic per dimension, refutes findings by running code' },
    { title: 'Critique', detail: 'completeness critic finds gaps, gap finders fill them' },
    { title: 'Judge', detail: 'three judges with distinct lenses score both PRs' },
  ],
}

const S = '/tmp/claude-1000/-home-agentops-dev-md-manager/4c896989-729c-4d58-b47e-6b887ba715fc/scratchpad'

const CONTEXT = `
You are comparing two GitHub pull requests that implement the SAME feature in the same repository (GitHub mani99brar/team-manager, checked out locally as md-manager). Both were authored with Claude Code by the same person on the same day; both branch from the same main commit 61e4752. The person wants to know: which has better code quality, better structure, which did the better job overall, and which is easier to review. Be concrete and evidence-based: cite file:line, quote code, run commands. Do not be diplomatic for its own sake; if one PR is clearly better on your dimension, say so and prove it.

LOCATIONS (all read-only; NEVER modify files inside these three worktrees):
- main (baseline):   /home/agentops/dev/md-manager            commit 61e4752
- PR 9  = branch feature-opus, worktree /home/agentops/dev/md-manager-opus  commit 99c770f. Title "Run the reviewer as an attachable native session (slice A)". 21 files, +1183/-121. Scope: slice A only.
- PR 10 = branch feature-high, worktree /home/agentops/dev/md-manager-high  commit a1fab98. Title "Review visibility: native reviewer session, review/inputs export, feature runs". 39 files, +3329/-205. Scope: slice A in full PLUS slice B and C "pre-run work" (contracts/projects, export_state, features/review-result, features/run-inputs).
- Full diffs vs main: ${S}/pr9.diff, ${S}/pr10.diff. PR 10 restricted to the slice-A files (apples-to-apples with PR 9): ${S}/pr10-sliceA.diff.
- PR descriptions: ${S}/pr9-body.md, ${S}/pr10-body.md. Commit messages: ${S}/pr9-commit.txt, ${S}/pr10-commit.txt (each PR is a single squashed commit).
- Handoff docs: /home/agentops/dev/md-manager-opus/docs/HANDOFF_REVIEWER_PANE.md (PR 9) and /home/agentops/dev/md-manager-high/docs/HANDOFF_REVIEW_VISIBILITY.md (PR 10).
- Specs on main: /home/agentops/dev/md-manager/docs/PRD_REVIEW_VISIBILITY.md (umbrella, says: ship slice A alone, then B's run, then C's run, "each run has a smaller, focused diff"), docs/PRD_REVIEWER_PANE.md (slice A: 6 work items, section 5 acceptance incl. a controlled live smoke test that gates the merge), docs/PRD_REVIEW_RESULT.md (slice B), docs/PRD_RUN_INPUTS.md (slice C). Note both PRs edited the PRDs; read main's copies for the original spec and diff to see what each PR changed.
- PR 10's live smoke-test artifacts (real, on disk): ~/.local/state/md-manager-workflows/smoke/review-smoke-001/ (review.completion.json, review.json, automatic-review.json, review.interactive.json, review.stop.json, events.jsonl, terminals.json, review.launch.log). PR 9 did not run a live smoke test and says so.
- Test logs (my own run of python unittest discover, npm run test:contracts, npx tsc -b, npx eslint ., npm run test:unit in each worktree): ${S}/tests-opus.log (PR 9) and ${S}/tests-high.log (PR 10). If a log is incomplete when you read it, wait a bit and re-read, or run the specific suite yourself.

HOW TO RUN THINGS: Python interpreter is /home/agentops/dev/md-manager/.venv/bin/python (stdlib unittest; run with cwd = the worktree root, e.g. \`cd /home/agentops/dev/md-manager-opus && /home/agentops/dev/md-manager/.venv/bin/python -m unittest workflow.test_automatic -v\`). node_modules exist in both worktrees. If you must mutate code (e.g. mutation-testing a test), copy the worktree first: \`rsync -a --exclude node_modules --exclude .git --exclude .venv /home/agentops/dev/md-manager-opus/ ${S}/copy-<yourname>/ && ln -s /home/agentops/dev/md-manager/node_modules ${S}/copy-<yourname>/node_modules\`. Never start a real Claude session (no \`claude --bg\`, no \`claude -p\`); \`claude --help\` and reading docs are fine.

KEY FACTS ALREADY ESTABLISHED (verify, do not just trust):
- PR 9 launches the reviewer with --tools Read,Glob,Grep,Write and --permission-mode dontAsk, with no allow rule for the write; its handoff admits the live path is unproven and flags exactly this risk.
- PR 10 ran the live smoke test twice; attempt 1 had the reviewer's Write denied under dontAsk; attempt 2 fixed it with --allowedTools "Edit(//<run>/review.completion.json)" and completed the whole protocol (verdict recorded).
- PR 10 bumps the run-state export version to 1.2.0; main's server/projects.ts validates the export with z.literal(EXPORT_VERSION) (=1.0.0), so new runs after merging PR 10 may be rejected by the current viewer until slice B's adapter lands. PR 10's handoff acknowledges this.
- Default when plan.json lacks reviewer_transport: PR 9 treats it as native; PR 10 treats it as print.
- attach-one node name: PR 9 uses --node reviewer; PR 10 uses --node review.

OUTPUT: return only the structured object requested. In "evidence" put file:line refs, commands you ran and their salient output. Findings must be specific and checkable, not vibes. Include "praise" findings for things done notably well so the comparison is fair. Severity: high = would block merge or materially mislead a reviewer; medium = should be fixed; low = nit.
`

const FINDING = {
  type: 'object',
  properties: {
    pr: { type: 'string', enum: ['9', '10', 'both'] },
    kind: { type: 'string', enum: ['bug', 'risk', 'design', 'quality', 'test', 'docs', 'scope', 'praise', 'discrepancy'] },
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
    summary: { type: 'string', description: 'Two to four sentences: what you examined and the headline comparison' },
    pr9: { type: 'string', description: 'Assessment of PR 9 on this dimension' },
    pr10: { type: 'string', description: 'Assessment of PR 10 on this dimension' },
    edge: { type: 'string', enum: ['pr9', 'pr10', 'tie'] },
    edge_reason: { type: 'string' },
    findings: { type: 'array', items: FINDING },
  },
  required: ['summary', 'pr9', 'pr10', 'edge', 'edge_reason', 'findings'],
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
    edge_override: { type: 'string', enum: ['pr9', 'pr10', 'tie', 'agree'], description: 'agree = the reviewer edge call stands after verification' },
    edge_note: { type: 'string' },
    new_findings: { type: 'array', items: FINDING },
  },
  required: ['verdicts', 'edge_override', 'edge_note', 'new_findings'],
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
    contradictions: { type: 'array', items: { type: 'string' }, description: 'places where two dimensions or a reviewer and its verifier contradict each other' },
  },
  required: ['gaps', 'contradictions'],
}

const SCORES = {
  type: 'object',
  properties: {
    code_quality: { type: 'number' }, structure: { type: 'number' }, correctness: { type: 'number' },
    tests: { type: 'number' }, spec_fidelity: { type: 'number' }, docs_and_handoff: { type: 'number' }, reviewability: { type: 'number' },
  },
  required: ['code_quality', 'structure', 'correctness', 'tests', 'spec_fidelity', 'docs_and_handoff', 'reviewability'],
}

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    lens: { type: 'string' },
    scores_pr9: SCORES,
    scores_pr10: SCORES,
    better_code_quality: { type: 'string', enum: ['pr9', 'pr10', 'tie'] },
    better_structure: { type: 'string', enum: ['pr9', 'pr10', 'tie'] },
    overall_winner: { type: 'string', enum: ['pr9', 'pr10', 'tie'] },
    easier_to_review: { type: 'string', enum: ['pr9', 'pr10', 'tie'] },
    rationale: { type: 'string' },
    key_points: { type: 'array', items: { type: 'string' } },
    what_each_should_borrow: { type: 'string', description: 'what PR 9 should take from PR 10 and vice versa' },
    merge_recommendation: { type: 'string' },
  },
  required: ['lens', 'scores_pr9', 'scores_pr10', 'better_code_quality', 'better_structure', 'overall_winner', 'easier_to_review', 'rationale', 'key_points', 'what_each_should_borrow', 'merge_recommendation'],
}

const DIMENSIONS = [
  {
    key: 'scope-and-spec',
    prompt: `DIMENSION: scope discipline and spec fidelity for slice A.
Build a table mapping every work item (PRD_REVIEWER_PANE section 4, items 1-6) and every acceptance bullet (section 5) and every design-table row (section 3: completion file, bindings, payload, accepted-when, timeout, independence, human input, after acceptance) to what each PR actually implements, with file:line. Note deviations and whether each deviation is (a) justified and recorded, (b) silently made, or (c) a spec rewrite to fit the code. Diff docs/PRD_*.md on main vs each branch and judge how each PR edited the spec (recording a decision honestly vs rewriting requirements). Assess PR 10's decision to bundle slice B and C pre-run work against the umbrella PRD's explicit ordering and rationale; quantify what portion of PR 10 is slice A (use pr10-sliceA.diff vs pr10.diff). Consider the merge consequences: what happens to the live viewer and to the next run after each PR merges as-is. Also consider the "controlled live smoke test gates the merge" acceptance rule: PR 9 skipped it and said so, PR 10 ran it; weigh that against the PRD's own words.`,
  },
  {
    key: 'correctness-review-path',
    prompt: `DIMENSION: correctness of the review-node control path in workflow/automatic.py (and the parts of pipeline.py it calls) in both PRs.
Read both implementations fully: wait_review / read_review_completion / native review / print review / resumable-review / finish paths. Hunt for real bugs: binding checks (run id, node, bundle sha, candidate commit, reviewer UUID, launch token), independence from worker UUIDs, which session states accept the file (idle/done/blocked/working) and whether that matches the PRD, deadline semantics (from launch vs from something else), what happens when the reviewer session disappears, is blocked, or is stopped by someone else, KeyboardInterrupt handling and resume in a new controller process, "no second reviewer" guarantee, fail-closed on invalid or foreign files, symlink/oversize/partial-write handling, TOCTOU between validation and acceptance, whether review.json is written for blocked verdicts, hash re-checks of bundle/diff/worktree cleanliness before acceptance, and exception handling that could swallow failures. For each suspected bug, try to demonstrate it: write a throwaway test or script against a rsync copy, or point at an existing test that would catch it. Compare the two designs and say which is more robust and why.`,
  },
  {
    key: 'correctness-launch-and-live',
    prompt: `DIMENSION: correctness of the reviewer launch, pane, attach and stop code (workflow/interactive.py, workflow/pipeline.py, workflow/sessions.py) in both PRs, and whether each PR would actually work against the real Claude Code CLI.
(1) Compare the exact launch command each PR builds (tools list, --allowedTools, --permission-mode, --add-dir, --safe-mode, MCP config, --name, cwd, settle/identity checks). (2) Determine from the Claude Code CLI itself and its documentation whether PR 9's launch (--tools Read,Glob,Grep,Write --permission-mode dontAsk, no allow rule) can write the completion file at all: run \`claude --help\` and check the permission-rule documentation (permission rule syntax; whether Write is governed by Edit(...) rules; whether a Write(...) rule is honored; what --safe-mode does and whether the flag exists). Do NOT launch any real session. Conclude whether PR 9 is live-broken as written, and whether PR 10's Edit(//abs/path) rule is the correct documented spelling. (3) Review pane attachment: third pane in the run's tab, idempotence, attach-one node naming (PR 9 --node reviewer vs PR 10 --node review; check which is consistent with the rest of each codebase and docs), detached-run behaviour. (4) Review stop: identity re-check, idempotence, event recording, stop markers. (5) Any regressions to the existing worker launch/attach/stop paths caused by the generalisation each PR did. Run the relevant tests in both worktrees and report.`,
  },
  {
    key: 'structure-and-abstraction',
    prompt: `DIMENSION: code structure, abstraction and maintainability of the slice-A controller changes. Compare ${S}/pr9.diff with ${S}/pr10-sliceA.diff on the shared surface (automatic.py, interactive.py, pipeline.py, launch.py, sessions.py).
Assess: how each generalised the worker-only code to cover a reviewer (PR 9: worktree()/receipt_path()/stop_session + REVIEWER constant with file_prefix in sessions.py; PR 10: SESSION_NODES, worktree_of, reconcile/launch/run_reviewer generalisation, stop_session(node)), and which generalisation is cleaner, less duplicated and less likely to rot. Function length and cohesion of the new review functions; naming; where the transport switch lives; how reviewer_transport is plumbed and pinned into plan.json; what each chose as the default for plans lacking the key (native vs print) and which is the safer/backwards-compatible choice given existing runs on disk (look at ~/.local/state/md-manager-workflows/project-workflows/project-workflows-001/plan.json). Dead code, copy-paste, magic strings, inconsistent naming (reviewer vs review), error message quality, logging/timeline events. Give a maintainer's verdict: which codebase would you rather own in six months, and cite the specific code that decided it.`,
  },
  {
    key: 'tests',
    prompt: `DIMENSION: test quality for slice A in both PRs (workflow/test_automatic.py, test_interactive.py, test_pipeline.py, test_feature_launch.py, contracts/workflow/contract.test.ts).
Map each PR's new tests to PRD_REVIEWER_PANE work item 5 (offline reviewer via FakeSessions; three-process recovery extended to a reviewer interruption; rejected completion file with wrong bundle hash / wrong UUID / wrong candidate fails closed; print-mode fallback still passes). Judge assertion strength (behaviour vs implementation detail), fake/fixture design, readability, brittleness, duplication, and whether any existing test was weakened or pinned to keep passing (PR 10's handoff says print-mode tests were pinned to reviewer_transport=print and the multi-process assertion was loosened to "one interruption and a final success rather than a fixed order"; PR 9 says [75,130,75,0] exact). Check PR 9's three claimed mutation checks by actually performing at least two of them on a rsync copy and running the named tests; try the equivalent mutations against PR 10's tests and report whether PR 10's tests also catch them. Run both suites with -v and list the reviewer-related test names for each. Conclude which test suite gives a reviewer more confidence and why.`,
  },
  {
    key: 'contracts-and-compat',
    prompt: `DIMENSION: contract/schema design and backward compatibility.
(1) contracts/workflow reviewCompletion in both PRs: compare v1.ts, examples.ts, contract.test.ts and the generated reviewCompletion.schema.json. Strictness (additionalProperties, enums, min lengths), whether worker/requirement are required or optional on the wire vs in pipeline validate, cross-field rules (blocked needs findings? approved with open P1?), versioning, example quality, negative test coverage, and whether the schema is regenerated from the source (check npm run contracts:export leaves no diff in each worktree). (2) PR 10 only: contracts/projects additions (reviewResult 1.1.0, runInputs/runInputsResponse 1.2.0, requirement_verbatim). Are they additive as the PRDs require? Well-tested? Consistent with PRD B/C tables? (3) Compatibility consequences of merging each PR: PR 10 bumps EXPORT version to 1.2.0 in workflow/export_state.py while main's server/projects.ts uses z.literal(EXPORT_VERSION) at line 52. Prove or disprove that a run exported by PR 10's controller is rejected by the viewer on main (write a tiny script or test against a copy; do not modify the worktrees). Also check the reverse: does PR 9's controller keep exporting 1.0.0? Does either PR break reading of the existing on-disk run project-workflows-001? Quantify the blast radius of each PR's compat story.`,
  },
  {
    key: 'slice-bc-prework',
    prompt: `DIMENSION: PR 10's extra scope beyond slice A: workflow/export_state.py (review and inputs sections), export_run + the \`workflow export\` CLI action in pipeline.py, workflow/test_export.py, features/review-result/ and features/run-inputs/ (feature.json, policy.json, README, ui-task.md, adapter-task.md), and the launch.py changes (--feature, feature choices).
Review it as if it were its own PR: correctness (lock handling, lightweight runtime, validation of plan/policy/review, hash checks, truncation of task text at 256 KiB, redaction expectations left to the adapter), test coverage, and quality of the feature definitions and worker task files (are they launchable, do they match PRD B/C worker assignments, checks and acceptance scenarios; is anything contradictory or under-specified). Then answer: does bundling this into PR 10 add value for the reviewer or dilute the slice-A review? Would you have accepted it as-is, asked for it to be split (the handoff even lists the three suggested commits), or rejected parts? Also verify \`workflow launch review-result --dry-run --automatic\` and run-inputs --dry-run work from the PR 10 worktree (dry-run must not launch anything; confirm by reading the code first).`,
  },
  {
    key: 'reviewability-and-docs',
    prompt: `DIMENSION: reviewability and documentation honesty. Put yourself in the seat of the human reviewer who has to approve one of these.
(1) Effort: files, lines, number of concerns per PR, single-commit vs splittable, how much of the diff is mechanical (generated schemas, fixtures) vs logic. (2) Description accuracy: check every checkable claim in ${S}/pr9-body.md, ${S}/pr10-body.md, the commit messages and both handoffs against the diff and the test logs (${S}/tests-opus.log, ${S}/tests-high.log). Examples: PR 9 "no server/ or src/ change" (git diff --stat), "94 passed / 13 contract tests"; PR 10 "96 Python tests" in the PR body vs "95 tests OK" in its handoff, "130 unit tests", "14 contract tests", "project-workflows browser suite passes" (can you tell?), the claim that Write(...) rules are ignored, cleanup claims about the scratch worktree. (3) Does each PR description steer the reviewer to the real risks? PR 9 explicitly names two things to look at; does PR 10 do the equivalent? (4) Docs: RUNBOOK, INTERACTIVE_SESSIONS, feature README, contract README, VALIDATION: are the operator instructions correct against the code (e.g. attach-one node name, transport flag, recovery steps)? Any doc that describes behaviour the code does not have? (5) Are the handoff docs an asset or noise for a reviewer (red/green tables, mutation checks in PR 9; live smoke narrative in PR 10)? Conclude which PR is easier to review, with a concrete estimate of reviewer effort for each and the main reasons.`,
  },
  {
    key: 'evidence-and-claims',
    prompt: `DIMENSION: independent verification of each PR's stated evidence.
(1) Read ${S}/tests-opus.log and ${S}/tests-high.log (if incomplete, re-run the missing suite yourself in the right worktree). Report exact pass/fail counts for python unittest, contract tests, tsc, eslint and unit tests per PR, and compare to what each PR claims. Also run main's baseline python and contract counts (cwd /home/agentops/dev/md-manager) to check the "70 Python / 10 contract" baseline both cite. (2) PR 10's live smoke test: inspect ~/.local/state/md-manager-workflows/smoke/review-smoke-001/ and cross-check the handoff's narrative (session UUIDs 5865c9a6..., dccd22b5..., timestamps 19:41/19:53/20:00, bundle hash 58308a53..., candidate b5385b3, verdict blocked with 1 P1 + 6 P2, 7/7 requirement quotes verbatim, stop marker, terminals.json pane). Verify the 7/7 verbatim claim yourself by grepping each finding's requirement string in the plan.json task text. Check whether the leftover scratch worktree was really removed from the main repo's worktree list (git -C /home/agentops/dev/md-manager worktree list). Also check whether attempt 1's artifacts (session dccd22b5) still exist or were overwritten, and whether that matters. (3) PR 9's red/green narrative cannot be replayed, but check internal consistency: do the named tests exist, do the counts add up (31 in test_automatic, 17 in test_interactive, 11 in test_pipeline), does the four-process test produce [75,130,75,0]? Run it. (4) Report every discrepancy between claim and reality for each PR, and rate each PR's evidence quality.`,
  },
]

const reviewPrompt = d => `${CONTEXT}\n\n${d.prompt}`

const verifyPrompt = (d, r) => `${CONTEXT}

You are an adversarial verifier for the "${d.key}" dimension. Another reviewer produced the findings below. Your job is to REFUTE each finding of severity high or medium: re-read the code yourself, run tests or scripts, check the docs. Do not accept a finding because it sounds plausible. Mark "confirmed" only when you personally reproduced or observed the evidence; "refuted" when it is wrong; "downgraded" when true but overstated (give corrected_severity); "unverifiable" only when you genuinely could not check. Also judge whether the reviewer's edge call (which PR is better on this dimension) survives your verification, and add any important finding the reviewer missed (as new_findings, same evidence standard). Be as skeptical of "praise" findings as of bugs.

Reviewer summary: ${r.summary}
Reviewer PR 9 view: ${r.pr9}
Reviewer PR 10 view: ${r.pr10}
Reviewer edge: ${r.edge} because ${r.edge_reason}

Findings to verify (JSON):
${JSON.stringify(r.findings.filter(f => f.severity !== 'low'), null, 2)}

Low-severity findings you may skip unless one is wrong in a way that matters:
${JSON.stringify(r.findings.filter(f => f.severity === 'low').map(f => f.title), null, 2)}`

phase('Review')
log('Reviewing both PRs across 9 dimensions, 2 agents at a time (4-CPU host)')

const results = await pipeline(
  DIMENSIONS,
  d => agent(reviewPrompt(d), { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA }),
  (r, d) => {
    if (!r) return null
    log(`review:${d.key} done — edge ${r.edge}, ${r.findings.length} findings`)
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
  const edge = x.verify && x.verify.edge_override && x.verify.edge_override !== 'agree' ? x.verify.edge_override : x.review.edge
  return {
    dimension: x.dimension,
    summary: x.review.summary,
    pr9: x.review.pr9,
    pr10: x.review.pr10,
    reviewer_edge: x.review.edge,
    edge_after_verification: edge,
    edge_reason: x.review.edge_reason,
    verifier_note: x.verify?.edge_note || '',
    findings: findings.concat(extra),
  }
}

const merged = dims.map(mergeDimension)
const surviving = merged.flatMap(m => m.findings.filter(f => f.verdict !== 'refuted'))
const refuted = merged.flatMap(m => m.findings.filter(f => f.verdict === 'refuted'))
log(`${surviving.length} findings survive verification, ${refuted.length} refuted`)

phase('Critique')
const critic = await agent(`${CONTEXT}

You are the completeness critic. Below are the verified results of nine review dimensions comparing PR 9 and PR 10. Read them and answer: what is MISSING that would change the answer to "which PR has better code quality, structure, did the better job, and is easier to review"? Look for: a file or subsystem in either diff no dimension examined (list the files in each diff and check coverage), a claim in a PR description nobody checked, a contradiction between dimensions or between a reviewer and its verifier, an unverified high-severity finding, an important behaviour nobody tested (e.g. print-mode regression, resume across controller processes for PR 10, the existing live run project-workflows-001 still loading). Do the cheap checks yourself and report them as gaps with how_to_check; reserve "high" priority for gaps that could flip a verdict.

Dimension results:
${JSON.stringify(merged, null, 2)}`, { label: 'critic', phase: 'Critique', schema: CRITIC_SCHEMA })

const gaps = (critic?.gaps || []).filter(g => g.priority === 'high').slice(0, 3)
if ((critic?.gaps || []).filter(g => g.priority === 'high').length > 3) log('Capped gap follow-up at 3 high-priority gaps')
log(`critic: ${critic?.gaps?.length || 0} gaps (${gaps.length} high), ${critic?.contradictions?.length || 0} contradictions`)

const gapResults = await pipeline(
  gaps,
  g => agent(`${CONTEXT}

A completeness critic identified this gap in the comparison. Investigate it fully and report findings with evidence, following the same standard as the dimension reviewers. Also state plainly whether the result changes which PR is better on any of: code quality, structure, overall, ease of review.

Gap: ${g.title}
Why it matters: ${g.why_it_matters}
How to check: ${g.how_to_check}

Contradictions the critic noticed (resolve any that touch your gap): ${JSON.stringify(critic.contradictions)}`, { label: `gap:${g.title.slice(0, 40)}`, phase: 'Critique', schema: FINDINGS_SCHEMA }),
  (r, g) => r ? agent(verifyPrompt({ key: `gap:${g.title}` }, r), { label: `verify-gap:${g.title.slice(0, 30)}`, phase: 'Critique', schema: VERIFY_SCHEMA }).then(v => ({ dimension: `gap:${g.title}`, review: r, verify: v })) : null,
)
const gapMerged = gapResults.filter(Boolean).map(mergeDimension)
const allDims = merged.concat(gapMerged)
const allSurviving = allDims.flatMap(m => m.findings.filter(f => f.verdict !== 'refuted'))

phase('Judge')
const JUDGES = [
  { lens: 'maintainer', prompt: 'You are the long-term maintainer of workflow/ and contracts/. You weigh structure, abstraction quality, correctness under failure, test durability and backward compatibility. You care about which code you would rather own and extend for slices B and C.' },
  { lens: 'reviewer', prompt: 'You are the human who has to approve one of these PRs today. You weigh reviewability (size, scope, splittability, honesty and precision of the description and handoff, whether the evidence is real and checkable), risk of merging as-is, and whether the PR did what the PRD asked, no more and no less. You penalise scope creep and unverifiable claims; you reward evidence that lets you skip re-deriving things.' },
  { lens: 'product-owner', prompt: 'You wrote the PRDs. You weigh whether the shipped behaviour would actually work live (the reviewer pane, the completion protocol, unattended completion), whether the acceptance gate in PRD_REVIEWER_PANE section 5 was honoured, whether decisions and deviations were recorded honestly in the PRDs, and whether the extra slice B/C work advances or endangers the plan of "A, then B run, then C run".' },
]

const judges = await parallel(JUDGES.map(j => () => agent(`${CONTEXT}

${j.prompt}

Below are the verified comparison results (nine dimensions plus gap follow-ups; each finding carries a verifier verdict, refuted findings already removed). Score both PRs 1-10 on each axis, decide better code quality, better structure, overall winner and easier to review, and write a rationale a colleague could act on. Cite the specific findings that decided each call. Say what each PR should borrow from the other and give a merge recommendation (merge as-is / merge with changes / split / reject) for each PR.

Dimension summaries and edges:
${JSON.stringify(allDims.map(m => ({ dimension: m.dimension, summary: m.summary, pr9: m.pr9, pr10: m.pr10, edge_after_verification: m.edge_after_verification, edge_reason: m.edge_reason, verifier_note: m.verifier_note })), null, 2)}

Surviving findings (${allSurviving.length}):
${JSON.stringify(allSurviving.map(f => ({ dimension: f.dimension, pr: f.pr, kind: f.kind, severity: f.severity, verdict: f.verdict, title: f.title, detail: f.detail, evidence: f.evidence, verifier_reason: f.verifier_reason })), null, 2)}

Refuted findings (for awareness only; do not use them):
${JSON.stringify(refuted.map(f => ({ dimension: f.dimension, pr: f.pr, title: f.title, verifier_reason: f.verifier_reason })), null, 2)}`, { label: `judge:${j.lens}`, phase: 'Judge', schema: JUDGE_SCHEMA, effort: 'xhigh' })))

return {
  dimensions: allDims,
  refuted,
  critic,
  judges: judges.filter(Boolean),
}
