export const meta = {
  name: 'workflow-ux-audit-design',
  description: 'Audit the Projects/workflow viewer UX through four lenses, draft three competing redesigns, judge them, synthesize one spec, and check it for gaps',
  phases: [
    { title: 'Audit', detail: 'four lenses over screenshots, code and live API payloads' },
    { title: 'Design', detail: 'three competing redesign proposals' },
    { title: 'Judge', detail: 'operator-fit and feasibility judges score all proposals' },
    { title: 'Synthesize', detail: 'one merged spec with slices and acceptance criteria' },
    { title: 'Critic', detail: 'completeness check against every P1 finding; one revision if needed' },
  ],
}

const S = args.scratch
const CONTEXT = `
PRODUCT: MD Manager (repo /home/agentops/dev/md-manager) is a local web app. Its "Projects" section is a READ-ONLY viewer of agent workflow runs produced by the repo's Python controller (\`python -m workflow\`): each run is a LangGraph pipeline per feature — design challenge (print job) → launch_<lane> worker agent sessions (one per lane) → handoff/freeze → verify_<lane> (trusted verifier runs checks) → candidate (combined checks) → independent review (1+ reviewer agents, native or print transport) → approval → integrate. Runs are started, resumed, answered and approved ONLY from the CLI; the viewer never mutates.

THE USER'S COMPLAINT (verbatim): "Lets work on making the UX better for the workflow section. Its not good, i need to look around to understand whats where when it happened and overall is just bad."
The user operates runs daily, often watching a live run from a Mac browser while agents work on a VPS. Typical questions: What is happening right now / which step is active? Did it pass, and if not, why and what do I do next (which CLI command)? When did each step start/finish and how long did it take? What did the worker change, which checks ran, where are the screenshots/logs? What did the reviewers find? Is a worker waiting on a question?

MATERIAL (read it; do not guess):
- Screenshots of the CURRENT UI (live data): ${S}/shots/*.png. "-fold" = first 900px, "-full" = full page. Pages: 01 projects list, 02 project, 03 workflow run list, 04 run page (skeleton-001, failed at review), 05-08 node pages of skeleton-001 (challenge, launch_game [~20000px tall!], verify_game, review), 09-12 skeleton-fixes-001 (succeeded run) run/review/candidate/handoff, 13 a two-lane md-manager run, 14 the run's Assignment tab, and -mobile variants (390px) of 03/04/07. Use the Read tool on the PNGs (large ones are downscaled; the -fold images are sharp).
- Live API payloads: ${S}/api/*.json — <run>.detail.json (summary+definition+snapshot), <run>.events.json (the event timeline with occurred_at, node_id, status, message), <run>.inputs.json (pinned policy, lanes, checks, completion signals, questions, challenge, decisions), result_*.json (worker/candidate results: checks with started_at/finished_at, artifacts, changed files, screenshots) and reviews_*.json (review verdict, reviewers, findings). The live API is at http://127.0.0.1:3001/api/projects (read-only GETs are fine).
- Code: src/projects/*.tsx (ProjectsView.tsx levels, RunView.tsx run page, NodeDetail.tsx node inspector, ReviewDetail.tsx, WorkerInputs.tsx, Assignment.tsx, Challenge.tsx, CreatedFiles.tsx, WorkflowGraph.tsx, status.ts wording, panels.tsx), src/App.css (styles), src/App.tsx (app shell: header, Pi/Claude/Projects roots, Refresh button), contracts/projects/v1.ts (the API contract), server/projects.ts (how the server projects state; what data exists), tests/project-workflows/*.spec.ts (existing browser tests and data-testids they depend on).
- Prior design intent: docs/PRD_VIEWER_CLARITY.md, docs/PRD_REVIEW_VISIBILITY.md, docs/PRD_RUN_INPUTS.md, docs/PRD_WORKER_LANES.md. Earlier slices deliberately added honesty wording ("a succeeded worker is not workflow completion", executor legends, read-only disclaimers). Respect the underlying truthfulness requirements but you may propose far more concise ways to convey them; the user now finds the page hard to use.
- Recent behaviour: run and list pages poll every 5 s (useResource pollToken / usePoll); the server projects live state from events.jsonl + run-state.json.

RULES: READ-ONLY. Do not edit repo files, do not commit, do not run Playwright or the test suites, do not restart servers on 3001/5173, do not touch ~/.local/state. You may write scratch files only under ${S}/work/. Be concrete: cite screenshot names, file:line, API fields. The Pi/Claude skills sections are out of scope.`

const AUDIT_SCHEMA = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string', description: 'short slug, unique within your lens' },
      severity: { type: 'string', enum: ['P1', 'P2', 'P3'], description: 'P1 = directly causes the user complaint (hunting around, cannot tell when/where/why)' },
      page: { type: 'string' },
      problem: { type: 'string' },
      evidence: { type: 'string', description: 'screenshot names, file:line, API fields' },
      user_impact: { type: 'string' },
      data_available: { type: 'string', description: 'which existing API fields could fix it, or "needs backend: ..."' },
      suggestion: { type: 'string' },
    }, required: ['id', 'severity', 'page', 'problem', 'evidence', 'user_impact', 'data_available', 'suggestion'] } },
    questions_by_page: { type: 'string', description: 'for each page level: the questions an operator arrives with, and whether the current page answers each within the first screen' },
    notes: { type: 'string' },
  },
  required: ['findings', 'questions_by_page', 'notes'],
}

const LENSES = [
  { key: 'orientation', prompt: `LENS: ORIENTATION & INFORMATION ARCHITECTURE ("what's where"). Walk every level (projects → project → workflow → run → node, plus the Assignment tab). For each: what is on the first screen, what is redundant (e.g. node list duplicating the graph, legends, disclaimers, metadata grids), what is missing, naming problems (e.g. every workflow is called "Feature implementation" — check workflow names vs feature names in the data), breadcrumb/route usefulness, where each kind of information lives (checks, logs, screenshots, changed files, findings, questions, commands to run) and how many clicks/scrolls it takes to reach it. Measure page heights from the screenshots. Identify the navigation model problems.` },
  { key: 'chronology', prompt: `LENS: TIME & CHRONOLOGY ("when it happened"). Inventory EVERY timestamp and duration the API exposes (events.occurred_at, summary created/updated, launch_requested_at/native_started_at, check started_at/finished_at, reviewer launched_at/accepted_at, reviewed_at, question asked_at/answered_at, completion signals, challenge attempts...). Then show what the UI renders today and where. Is there any run-level timeline? Are events only per node? Which nodes show "No events reference this node" although things happened (e.g. print-transport review, challenge)? Can the user tell how long each step took, when the run went idle, what happened most recently, retries/attempts over time? Are times absolute UTC only (the user is in a different timezone on a Mac)? Propose what a timeline/durations view could show purely from existing data, and list gaps that need backend events.` },
  { key: 'detail-density', prompt: `LENS: NODE DETAIL & EVIDENCE DENSITY. The node inspector (NodeDetail.tsx and children) produces pages of 3000–20000px (launch_game ~20000px). Break down section by section what each node kind shows (worker/launch, verification, candidate, review, challenge, handoff/prepare, integration) and in what order; measure which sections dominate the height (use the -full screenshots and the result/inputs payloads: e.g. every captured file inlined? every check log?). Decide for each section: essential-at-a-glance / on-demand / noise. Identify repeated information across node, run and Assignment tab. Consider how evidence (screenshots, logs, diffs, changed files, findings) should be progressively disclosed. Note mobile (390px) problems.` },
  { key: 'live-status', prompt: `LENS: LIVE STATUS & NEXT ACTION ("what is going on now, what do I do"). Using the three runs (one failed at review, one succeeded, one older two-lane run) and the server's projection rules (server/projects.ts projectSnapshot, status.ts wording), evaluate: can the user see at a glance which step is active, whether a worker is working/idle/blocked/waiting on a question, how long it has been running vs its deadline, why a run failed (e.g. skeleton-001's review blocked with a P1 — is that visible on the run page without clicking?), and what CLI command resolves the situation (retry/resume/answer/repair/accept-challenge — find them in workflow/*.py help text and README/RUNBOOK if present)? Does the auto-refresh (5 s poll) give any feedback (last updated / live indicator)? Are status colours and labels (Succeeded/Failed/Paused/Awaiting approval, attempt counters, executor legend) understandable? Is the runs list informative (duration, current step, verdict)?` },
]

phase('Audit')
const audits = (await parallel(LENSES.map(lens => () =>
  agent(`${CONTEXT}\n\n${lens.prompt}\n\nReturn findings ranked most severe first (aim for completeness within your lens, typically 8-20 findings).`,
    { label: `audit:${lens.key}`, phase: 'Audit', schema: AUDIT_SCHEMA })
    .then(r => r && { lens: lens.key, ...r })))).filter(Boolean)
log(`Audit: ${audits.map(a => `${a.lens} ${a.findings.length}`).join(', ')} findings`)
const auditText = JSON.stringify(audits, null, 1)

const PROPOSAL_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    thesis: { type: 'string', description: 'the organising idea in 2-4 sentences' },
    information_architecture: { type: 'string', description: 'markdown: levels/routes, what each page answers first, what moves where, what is removed or merged' },
    wireframes: { type: 'string', description: 'markdown with ASCII wireframes for: runs list, run page (desktop, first screen), node inspector for a worker lane, for review, and the run page at 390px' },
    timeline: { type: 'string', description: 'how chronology is shown (run timeline, durations, relative+local times, attempts), built from which fields' },
    live_and_next_action: { type: 'string', description: 'how current step, waiting states, failure reason and the next CLI command are surfaced' },
    evidence_disclosure: { type: 'string', description: 'how checks, logs, screenshots, changed files, findings, inputs are progressively disclosed' },
    removed_or_demoted: { type: 'string' },
    data_needs: { type: 'string', description: 'existing API fields used; any backend/contract additions (keep minimal, justify each)' },
    implementation: { type: 'string', description: 'files/components to add/change, rough size, and a slice order' },
    test_impact: { type: 'string', description: 'which existing Playwright specs/testids break and how to migrate; new tests' },
    risks: { type: 'string' },
    addresses_findings: { type: 'array', items: { type: 'string' }, description: 'audit finding ids (lens:id) this proposal fixes' },
  },
  required: ['name', 'thesis', 'information_architecture', 'wireframes', 'timeline', 'live_and_next_action', 'evidence_disclosure', 'removed_or_demoted', 'data_needs', 'implementation', 'test_impact', 'risks', 'addresses_findings'],
}

const ANGLES = [
  { key: 'timeline-first', prompt: 'ANGLE: TIMELINE-FIRST. The run page is organised around chronology: a run timeline (what happened when, how long each step took, what is happening now) is the primary surface; the graph becomes a compact progress strip; node details open from timeline entries.' },
  { key: 'triage-first', prompt: 'ANGLE: TRIAGE/STATUS-FIRST. The run page leads with an answer: a status headline (state, current step, elapsed vs deadline, why it stopped, the exact next CLI command), then per-lane cards (worker state, checks, questions, verdict), with deeper evidence one click away. The runs list becomes a dashboard of runs with current step/verdict/duration.' },
  { key: 'graph-inspector', prompt: 'ANGLE: SPLIT-PANE GRAPH + INSPECTOR. A full-width, always-visible pipeline (never clipped) with a persistent side/bottom inspector; each node inspector uses tabs (Summary / Timeline / Evidence / Inputs) so no node page is ever longer than ~2 screens; the Assignment tab content is folded into the relevant node tabs.' },
]

phase('Design')
const proposals = (await parallel(ANGLES.map(angle => () =>
  agent(`${CONTEXT}\n\nYou are a senior product designer + frontend engineer. Below are the audit findings from four lenses (JSON). Design a redesign of the Projects/workflow viewer.\n\n${angle.prompt}\n\nYour proposal must: fix every P1 finding you can, stay a read-only viewer, prefer existing API data (propose backend additions only where essential and small), keep accessibility (keyboard, screen reader, reduced motion) and the truthful-status requirements (expressed concisely), work at 390px, and be implementable incrementally in this codebase (React + TS, plain CSS in src/App.css, no new heavy dependencies). Read the code you need to be concrete about components and testids.\n\nAUDIT FINDINGS:\n${auditText}`,
    { label: `design:${angle.key}`, phase: 'Design', schema: PROPOSAL_SCHEMA })
    .then(r => r && { angle: angle.key, ...r })))).filter(Boolean)
const proposalText = JSON.stringify(proposals, null, 1)

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    scores: { type: 'array', items: { type: 'object', properties: {
      angle: { type: 'string' },
      score: { type: 'number', description: '0-10' },
      strengths: { type: 'string' },
      weaknesses: { type: 'string' },
    }, required: ['angle', 'score', 'strengths', 'weaknesses'] } },
    winner: { type: 'string' },
    grafts: { type: 'array', items: { type: 'string' }, description: 'specific ideas from any proposal the final design must include' },
    must_avoid: { type: 'array', items: { type: 'string' } },
  },
  required: ['scores', 'winner', 'grafts', 'must_avoid'],
}
const JUDGES = [
  { key: 'operator', prompt: 'JUDGE LENS: THE OPERATOR. Score each proposal by how fast the user answers their real questions (what is happening now, why did it fail and what command next, when did each step happen and how long, where is the evidence, what did reviewers find, is a worker waiting on a question) on desktop and on a phone, and how completely it removes the "I need to look around" feeling. Walk through the three concrete runs in the API payloads against each proposal\'s wireframes.' },
  { key: 'feasibility', prompt: 'JUDGE LENS: FEASIBILITY & RISK. Score each proposal on: implementable with existing data (verify claimed API fields exist in contracts/projects/v1.ts and the payloads), size of backend/contract changes, test churn in tests/project-workflows (count affected testids/specs), accessibility (keyboard/screen reader for timeline/graph/tabs), performance with 5 s polling, mobile, and incremental delivery (can it ship in slices without a broken intermediate state).' },
]
phase('Judge')
const verdicts = (await parallel(JUDGES.map(judge => () =>
  agent(`${CONTEXT}\n\n${judge.prompt}\n\nAUDIT FINDINGS:\n${auditText}\n\nPROPOSALS:\n${proposalText}`,
    { label: `judge:${judge.key}`, phase: 'Judge', schema: JUDGE_SCHEMA })
    .then(r => r && { judge: judge.key, ...r })))).filter(Boolean)
log(`Judges: ${verdicts.map(v => `${v.judge} → ${v.winner}`).join('; ')}`)

const SPEC_PATH = `${S}/work/SPEC.md`
const synthPrompt = (extra) => `${CONTEXT}\n\nSynthesize the FINAL redesign spec for the Projects/workflow viewer from the audit, the three proposals and the two judges' verdicts. Start from the judges' winner(s), graft every listed graft that fits, honour every must_avoid. Write it as a PRD in the style of the repo's docs/PRD_*.md (read one or two for tone/structure) to ${SPEC_PATH} (create ${S}/work/ if needed). Required sections: 1 Problem (tie to the user's complaint and the P1 findings), 2 Goals / non-goals, 3 Information architecture, 4 Page designs with ASCII wireframes (runs list, run page first screen desktop + 390px, node inspector for worker lane, verification/candidate, review, challenge, handoff/integration), 5 Timeline & time display rules (local vs UTC, relative, durations, attempts), 6 Live state & next action (including the exact CLI command table per situation, verified against workflow/*.py and README), 7 Evidence disclosure rules, 8 Copy/wording (concise truthful status language replacing the current disclaimers), 9 Data: existing fields used per element + any backend/contract additions with justification, 10 Accessibility & mobile, 11 Implementation slices (ordered, each shippable, files touched, size, and which can run in parallel without file conflicts), 12 Test plan (new specs, testids, migration of existing specs, red/green expectations), 13 Open questions for the user (at most 5, each with a recommended default). Also append an appendix mapping EVERY audit finding id (lens:id) to the spec section that addresses it or to "won't fix: reason".${extra}\n\nAUDIT:\n${auditText}\n\nPROPOSALS:\n${proposalText}\n\nVERDICTS:\n${JSON.stringify(verdicts, null, 1)}\n\nReturn a short summary (<= 25 lines) of the design and the slice list.`

phase('Synthesize')
let summary = await agent(synthPrompt(''), { label: 'synthesize', phase: 'Synthesize' })

const CRITIC_SCHEMA = {
  type: 'object',
  properties: {
    gaps: { type: 'array', items: { type: 'object', properties: {
      finding_or_topic: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' },
    }, required: ['finding_or_topic', 'problem', 'fix'] } },
    verdict: { type: 'string', enum: ['complete', 'needs_revision'] },
  },
  required: ['gaps', 'verdict'],
}
phase('Critic')
const critique = await agent(`${CONTEXT}\n\nYou are the completeness critic. Read the spec at ${SPEC_PATH}. Check: (1) every P1 audit finding is genuinely addressed (not just mapped in the appendix); (2) every claimed API field exists (check contracts/projects/v1.ts and the payloads); (3) the CLI commands in the next-action table exist with those arguments (check workflow/pipeline.py argparse, workflow/__main__.py, README.md); (4) slices are each shippable and their parallel groups really touch disjoint files; (5) the wireframes answer the user's complaint on the first screen of the run page; (6) nothing makes the viewer mutate state. Report only real gaps.\n\nAUDIT:\n${auditText}`,
  { label: 'critic', phase: 'Critic', schema: CRITIC_SCHEMA })
if (critique && critique.verdict === 'needs_revision' && critique.gaps.length) {
  log(`Critic found ${critique.gaps.length} gaps; revising once`)
  summary = await agent(synthPrompt(`\n\nREVISION: the spec already exists at ${SPEC_PATH}; revise it in place to close these critic gaps:\n${JSON.stringify(critique.gaps, null, 1)}`),
    { label: 'revise', phase: 'Critic' })
}
return { spec: SPEC_PATH, summary, verdicts, critique, audit_counts: audits.map(a => ({ lens: a.lens, p1: a.findings.filter(f => f.severity === 'P1').length, total: a.findings.length })), proposals: proposals.map(p => ({ angle: p.angle, name: p.name, thesis: p.thesis })) }
