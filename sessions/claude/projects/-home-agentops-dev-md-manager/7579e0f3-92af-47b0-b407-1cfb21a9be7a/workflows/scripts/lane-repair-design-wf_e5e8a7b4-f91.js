export const meta = {
  name: 'lane-repair-design',
  description: 'Judge panel: three independent designs for repairing one lane of a blocked workflow run, scored and synthesized into a design doc',
  phases: [
    { title: 'Design', detail: 'three designers, different angles' },
    { title: 'Judge', detail: 'score and synthesize the recommended design' },
  ],
}

const REPO = '/home/agentops/dev/md-manager'
const CONTEXT = `Repository: ${REPO} (Python package workflow/, the LangGraph-based automatic controller; read workflow/README.md and workflow/RUNBOOK.md first, then workflow/pipeline.py, workflow/automatic.py, workflow/sessions.py, workflow/interactive.py, workflow/checks.py, workflow/verification.py, workflow/integration*.py or wherever the candidate is built). Read-only: do not edit anything in the repository or any run directory; do not run git commands that change state; no tests needed.

Problem (from /home/agentops/dev/md-manager-reviews/workflow-guardrails-001-issues.md, P1 'the verifier's browser rules are hidden from the lanes until the candidate', third bullet): in run workflow-guardrails-001 (run dir ~/.local/state/md-manager-workflows/workflow-guardrails/workflow-guardrails-001; read its plan.json, events.jsonl, verification/*/*/*/packet.json, attempts.json, checkpoint files as examples) both lanes finished and passed worker-phase verification, the combined candidate was integrated, and the candidate check of the ui lane failed twice identically on a one-line test defect ('Expected one screenshot attachment for inert-markdown'). The worker sessions had been stopped and their snapshots frozen; the identical-failure guard ended the run blocked. There is no supported way to send one lane back for a fix: \`retry\` reruns checks at the same revision and never launches a worker; \`reconcile\` never launches. The operator had to finish by hand outside the workflow. The same dead end exists when a lane blocks in the worker phase.

Prior art: an unmerged commit 312a96d on branch fix/worker-relaunch ('Add workflow relaunch for a stopped worker lane': \`git -C ${REPO} show 312a96d\`) relaunches a halted lane BEFORE handoff (archives the attempt under relaunched/<lane>/<attempt>/, one new session with the same task in the same worktree, fresh deadline; refuses lanes that already handed off, whose stop is unconfirmed or whose session is alive). The codebase deliberately says 'no automatic relaunch' in many places: repairs must be operator-initiated and auditable.

Invariants that any design must keep (check the code for more): a worker/reviewer session is launched at most once per recorded launch intent and never implicitly; frozen snapshots are immutable evidence (a repair produces a NEW snapshot, never rewrites one); every lane snapshot touches only its owned paths; the trusted verifier re-runs every policy check on each new snapshot and on each new candidate; reviewers only ever see a candidate that passed; the source checkout is pinned and stays clean until integration; everything is resumable after a crash at any point; the viewer/export can show what happened (export_state.py).

Produce a concrete design: the operator command(s) and flags, which states they accept and refuse, exactly which run files/graph state change (LangGraph checkpoint handling: rewind/update_state vs new thread vs new sub-run), how the new snapshot is produced (a new worker session in the lane worktree seeded with the blocking reasons and the original task, and/or an operator-supplied commit), how verification attempts, candidate numbering, attempts.json and the identical-failure guard are reset or archived, how the export/timeline shows it, crash points and recovery, the test list, and an honest size estimate (files, lines, test count). Name the simplest version that would have saved workflow-guardrails-001.`

const ANGLES = [
  { key: 'operator-amend', angle: 'Design angle: SIMPLEST FIRST. Prefer an operator-supplied fix: e.g. `workflow amend <run> <lane> <commit>` where the operator (or a Claude session they run by hand) commits a fix on top of the lane snapshot; the controller validates ancestry and owned paths, records it as the lane\'s next snapshot and re-enters worker-phase verification and candidate integration. Consider whether a worker relaunch is needed at all.' },
  { key: 'worker-relaunch', angle: 'Design angle: AUTOMATE THE REPAIR WITH A WORKER. Extend 312a96d into `workflow relaunch <run> <lane>` that also works after handoff/freeze and after a candidate block: a new worker session in the lane worktree whose task is the original task plus the verifier\'s blocking reasons (and the failing evidence paths), then the normal completion, freeze, worker verification, candidate integration and review flow.' },
  { key: 'risk-first', angle: 'Design angle: RISK FIRST. Start from the invariants and crash points and from how LangGraph checkpoints are used in this code; design the state transitions so a repair can never mix old and new evidence, never launch twice, and is resumable at every step; then decide which command surface (amend, relaunch, or both sharing one state transition) that safely supports, and what to refuse.' },
]

const DESIGN = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    commands: { type: 'string' },
    state_transitions: { type: 'string' },
    snapshot_and_verification: { type: 'string' },
    refusals: { type: 'string' },
    crash_recovery: { type: 'string' },
    export_and_timeline: { type: 'string' },
    tests: { type: 'array', items: { type: 'string' } },
    size_estimate: { type: 'string' },
    minimal_version: { type: 'string' },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'summary', 'commands', 'state_transitions', 'snapshot_and_verification', 'refusals', 'crash_recovery', 'tests', 'size_estimate', 'minimal_version', 'risks'],
}

phase('Design')
const designs = (await parallel(ANGLES.map(a => () => agent(`${CONTEXT}\n\n${a.angle}`, { label: `design:${a.key}`, phase: 'Design', schema: DESIGN })
  .then(d => d && ({ key: a.key, ...d }))))).filter(Boolean)

phase('Judge')
const doc = await agent(`${CONTEXT}\n\nThree independent designers proposed these designs (JSON):\n${JSON.stringify(designs, null, 2)}\n\nYou are the judge. Verify the load-bearing claims of each against the code (read the functions they cite; reject designs built on wrong assumptions about how the pipeline, LangGraph checkpoints, snapshots or verification work). Score each on: safety against the invariants, crash recovery, operator simplicity, implementation size/risk, and whether it would have saved workflow-guardrails-001. Then write ONE recommended design, taking the best of each, with a clear minimal first version and what is deferred. Write it as Markdown to /home/agentops/dev/md-manager-reviews/lane-repair-design.md (this is the only file you may write) with sections: Recommendation (3-5 sentences), Scores (table), Command surface, State transitions, Snapshot and verification, Refusals, Crash recovery, Export and timeline, Tests, Size, Deferred, Rejected alternatives. Return the file path and a 10-line summary including the size estimate.`, { label: 'judge', phase: 'Judge' })
return { designs: designs.map(d => ({ key: d.key, title: d.title, summary: d.summary, size: d.size_estimate })), doc }
