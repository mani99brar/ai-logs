export const meta = {
  name: 'workflow-issue-fixes',
  description: 'Fix workflow-guardrails-001 run issues: one implementer per issue group in its own worktree, independent verification, one fix round',
  phases: [
    { title: 'Implement', detail: 'one agent per issue group, own worktree and branch' },
    { title: 'Verify', detail: 'independent skeptic reviews the branch diff and runs targeted tests' },
    { title: 'Fix', detail: 'implementer fixes confirmed problems, then a final recheck' },
  ],
}

const PY = '/home/agentops/dev/md-manager/.venv/bin/python'
const BASE = args.base || '7c5e37e'
const ISSUES = '/home/agentops/dev/md-manager-reviews/workflow-guardrails-001-issues.md'
const GROUPS = args.groups
const ALL = args.all_groups

function others(g) {
  return ALL.filter(o => o.key !== g.key).map(o => `- fix/${o.key} (~/dev/mdm-fix-${o.key}): ${o.area}`).join('\n')
}

function preamble(g) {
  return `You are working on the md-manager repository's workflow controller: the Python package \`workflow/\`, a LangGraph-based automatic controller that launches Claude Code worker sessions (\`claude --bg\`), waits for their completion files, verifies each lane's snapshot with trusted checks, integrates a candidate, runs reviewers (native sessions or \`claude --print\` jobs) and fast-forwards a feature branch. Operators drive it with \`python -m workflow ...\` and watch it in Herdr panes. Docs: workflow/README.md and workflow/RUNBOOK.md.

Work ONLY in the git worktree /home/agentops/dev/mdm-fix-${g.key} (branch fix/${g.key}, based on ${BASE}); cd there for every command. Never edit /home/agentops/dev/md-manager or any other worktree. Python: ${PY}; run it from the worktree root so \`-m workflow...\` imports this worktree's code. node_modules is a symlink (gitignored).

These issues were collected during the live run workflow-guardrails-001; the list is ${ISSUES} (read the sections named below; the run directory ~/.local/state/md-manager-workflows/workflow-guardrails/workflow-guardrails-001 holds its events.jsonl, logs and packets if you need real examples; read it, never write it).

Rules:
- Match the surrounding code: comment density, naming, idioms, error-message voice. Minimal focused changes; no drive-by refactors.
- Test first where practical: every new behaviour gets a unit test that fails without the change (confirm it fails, then make it pass). Tests never call real Claude, never touch ~/.config, ~/.local/state, the real registry or real Herdr; use the existing fakes/patches (see workflow/test_*.py). New test classes must be independent (the suite runs in parallel by class).
- Run targeted tests only: the test modules for the code you changed and modules that import or exercise it (for example \`${PY} -m unittest workflow.test_sessions workflow.test_automatic\`). Do NOT run the full suite (\`python -m workflow.run_tests\`) or Playwright: the integrator runs them after merging, and the machine has only 4 CPUs shared with other agents. Report exactly what you ran and the result.
- Update workflow/README.md / workflow/RUNBOOK.md where behaviour or operator practice changes, briefly, in the existing voice.
- Other agents fix other issue groups at the same time on sibling branches; stay out of their areas so merges stay clean, and if you must touch a shared file keep the change local to your functions:
${others(g)}
- Commit on your branch (one or a few commits) with a subject line and a body explaining why, ending with the line: Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>. Never push, never rewrite commits you did not make, never switch branches.
- If a decision is genuinely ambiguous, choose the safer option, record it in your report as a decision, and keep going.`
}

const IMPL = {
  type: 'object',
  properties: {
    commits: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    tests_run: { type: 'array', items: { type: 'object', properties: { command: { type: 'string' }, result: { type: 'string' } }, required: ['command', 'result'] } },
    decisions: { type: 'array', items: { type: 'string' } },
    not_done: { type: 'array', items: { type: 'string' } },
  },
  required: ['commits', 'summary', 'tests_run', 'decisions', 'not_done'],
}

const REVIEW = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['ok', 'problems'] },
    problems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
          file: { type: 'string' },
          line: { type: 'integer' },
          description: { type: 'string' },
          failure_scenario: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['severity', 'file', 'description', 'failure_scenario', 'fix'],
      },
    },
    tests_run: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['verdict', 'problems'],
}

function reviewPrompt(g, round) {
  return `${preamble(g)}

You are NOT the implementer. You are an independent, skeptical reviewer (round ${round}) of branch fix/${g.key}. Do not edit files, do not commit; read-only except running tests. Read \`git -C /home/agentops/dev/mdm-fix-${g.key} diff ${BASE}..HEAD\` and the full functions it touches plus their callers.

The assignment the implementer had:
${g.task}

Try to REFUTE that it is done correctly: Does it fix the issue in the real scenario from the issue list (not only in the unit test)? Can the new tests pass while the behaviour is wrong? Regressions: existing guarantees (a worker or reviewer session is launched at most once; a launch is never retried after the command ran; workers are never stopped by a transient error; 2.1.0 features and old run directories keep working; operator commands keep their output contracts)? Every call site covered (grep for the patterns)? Docs updated and accurate? Run the targeted tests for the changed modules yourself (${PY} -m unittest ..., never the full suite or Playwright).

Report problems with severity (P0/P1 must-fix, P2 should-fix, P3 nit) and a concrete fix. verdict=ok only if there is nothing P0-P2.`
}

const results = await pipeline(
  GROUPS,
  g => agent(`${preamble(g)}\n\nYOUR ASSIGNMENT (${g.key}):\n${g.task}`, { label: `impl:${g.key}`, phase: 'Implement', schema: IMPL }),
  (impl, g) => agent(reviewPrompt(g, 1), { label: `verify:${g.key}`, phase: 'Verify', schema: REVIEW }).then(review => ({ impl, review })),
  async (state, g) => {
    const must = (state.review && state.review.problems || []).filter(p => p.severity !== 'P3')
    if (!must.length) return { group: g.key, ...state, fix: null, recheck: null }
    const fix = await agent(`${preamble(g)}\n\nYOUR ASSIGNMENT (${g.key}):\n${g.task}\n\nYou (or a previous agent) already implemented this on branch fix/${g.key}; see \`git log ${BASE}..HEAD\` and the diff. An independent reviewer reported these problems. Fix every P0-P2 problem that is real (if you are sure one is not real, say why in decisions), add or adjust tests so each would have caught it, rerun the targeted tests, and commit.\n\nPROBLEMS:\n${JSON.stringify(must, null, 2)}`, { label: `fix:${g.key}`, phase: 'Fix', schema: IMPL })
    const recheck = await agent(reviewPrompt(g, 2) + `\n\nThe previous round reported these problems; check each is now fixed, and look for anything new:\n${JSON.stringify(must, null, 2)}`, { label: `recheck:${g.key}`, phase: 'Fix', schema: REVIEW })
    return { group: g.key, ...state, fix, recheck }
  },
)
return results
