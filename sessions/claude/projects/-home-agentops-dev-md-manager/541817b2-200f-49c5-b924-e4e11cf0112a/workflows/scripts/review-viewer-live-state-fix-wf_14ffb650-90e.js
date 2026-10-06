export const meta = {
  name: 'review-viewer-live-state-fix',
  description: 'Two independent adversarial reviewers over the viewer live-state, auto-refresh and vitest-parser fix',
  phases: [{ title: 'Review', detail: 'one reviewer per area, each tries to break the change' }],
}

const DIFF = args.diff
const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
          file: { type: 'string' },
          line: { type: 'integer' },
          summary: { type: 'string' },
          failure_scenario: { type: 'string', description: 'concrete inputs/state -> wrong output; how you confirmed it' },
          confirmed: { type: 'boolean', description: 'true only if you reproduced it (ran code/tests) or traced it with certainty' },
        },
        required: ['severity', 'file', 'summary', 'failure_scenario', 'confirmed'],
      },
    },
    notes: { type: 'string' },
  },
  required: ['findings', 'notes'],
}

const common = `Repository: /home/agentops/dev/md-manager (branch fix/viewer-live-worker-state, uncommitted working tree). The full diff is at ${DIFF}; read it first, then the surrounding code.
Context: a live automatic workflow run (project-B, skeleton-001) showed in the viewer as "Awaiting approval" with the worker's launch node "succeeded" while the worker was still coding, because the handoff node holds a LangGraph interrupt {kind: 'worker_handoff'} while it waits on the workers' completion signals. The export (run-state.json) is only rewritten at checkpoints; events.jsonl grows live. Separately the verifier rejected vitest output ("Tests  70 passed (70)") as "no passing test evidence" because workflow/checks.py text_test_counts only knew Python unittest and Node TAP/spec.
Rules: READ-ONLY review. Do not edit tracked files, do not commit, do not touch ~/.local/state or any live run, do not restart servers on ports 3001/5173. You may write scratch files under /tmp/claude-1000/ and run targeted tests (npx tsx --test <file> --test-name-pattern ..., .venv/bin/python -m unittest ...). Do NOT run Playwright (the VPS allows only one browser run at a time).
Report only real defects with a concrete failure scenario; mark confirmed=true only if you reproduced or traced it for certain. Style nits are not findings. An empty list is a fine answer.`

const lanes = [
  {
    key: 'projection+parser',
    prompt: `${common}
Your area: server/projects.ts projectSnapshot change (+ server/projects.test.ts) and workflow/checks.py vitest_counts (+ workflow/test_checks.py).
Try to break them:
- Projection: every state a run passes through (manual vs automatic mode, exports without inputs, a lane whose launch task errored, a freeze interrupted/blocked/resumed, retry after a failed verify, multi-lane runs, legacy flat lane keys, review interrupts, repair flows in workflow/repair.py). Could any node now show running/pending when it is failed, or could the run status become wrong (e.g. 'running' for a run that really waits on the operator, or a finished run looking live)? Check how workflow/automatic.py and workflow/pipeline.py actually emit the interrupt and events (e.g. do freeze events arrive while the interrupt is still in the export?).
- Parser: can vitest_counts produce a false pass (passed>=1, failed==0) for a failing or partial vitest run (bail, watch output, workspaces/projects printing several summaries, 'Type Errors' line with typecheck enabled, 'expected fail', snapshot failures, duplicate labels, ANSI colour placement)? Can it steal logs previously parsed by the unittest or Node TAP branches? Check real vitest 5 output formats if you can find vitest in node_modules anywhere (e.g. /home/agentops/.local/state/agent-workflows/project-B/skeleton/skeleton-001/worktree-game/node_modules/vitest — READ ONLY) for the summary printer source.`,
  },
  {
    key: 'auto-refresh',
    prompt: `${common}
Your area: frontend auto-refresh — src/projects/useResource.ts (new pollToken), src/projects/usePoll.ts (new), src/projects/ProjectsView.tsx, src/projects/RunView.tsx, and the Playwright scenario appended to tests/project-workflows/projects.spec.ts (read it, do not run it).
Try to break it:
- Stale data: can a poll response for an old key/base ever be shown for a new route (navigating between runs, between workflow and run levels), or a manual Refresh/Retry stop showing loading/error as before? Does an error panel's Retry still work? Does a poll that fails on a resource that was in an error state behave sensibly?
- Lifecycle: interval/listener leaks, polling while hidden, polling a finished (succeeded/cancelled) run, the 'finished' state leaking between runs, React strict-mode double effects, the useEffect/useState ordering in ProjectsView (morePages moved earlier; is 'extra'/'loadMore' logic unchanged?).
- Other consumers: every other caller of useResource (grep src/) and every child of RunView that gets refreshToken — does anything now re-mount, lose selection/scroll/tab state, or refetch expensive artifacts every 5 s? Does the announce dedupe (announced ref) suppress an announcement that should happen (e.g. manual Refresh with identical content, navigating back to the same page)?
- Load: each poll hits the run detail endpoint; look at server/projects.ts loadRun cost (packet hashing?) and say whether a 5 s poll of a run with many packets is a real problem.`,
  },
]

phase('Review')
const results = await parallel(lanes.map(lane => () =>
  agent(lane.prompt, { label: `review:${lane.key}`, phase: 'Review', schema: FINDINGS })
    .then(result => result && { lane: lane.key, ...result })))
return results.filter(Boolean)
