# AI Roadmap — Evidence and Run Log (md-manager)

> **Superseded (6 Oct 2026).** The current report is the submission doc at https://claude.ai/artifact/4Rif48YoL5xGZUvoxrM6LS with its companion at https://claude.ai/artifact/L4u5pfDtjjBqZCAYuKGcqo; the 6 Oct evidence bundle is in `evidence/2026-10-06/`. This file is the 24 Sep version, kept for history.

Course: *AI driven development — 36h30 study program*, 16 September 2026 edition (`~/dev/AI_ROADMAP.pdf`).
Project: **md-manager** — a graph explorer, document viewer and explicit-save Markdown editor for the Pi and Claude skill directories on this machine, plus the LangGraph workflow lab that runs supervised multi-lane Claude Code workers.
Author: Mani Brar. Report assembled from machine artifacts on 2026-09-24.

> **Cost correction (5 Oct 2026).** Earlier versions of this report put the effort comparison at $15.34 / $45.15 / $707.16. Those figures added up repeated running-total `cost-state` lines from the same sessions. The last `cost-state` line of each session gives `/effort high` **$7.67** (only the resumed part of that session was logged), `opus` **$22.57** and `/effort ultracode` **$241.84**. `cost/cost-log.csv` and the category totals in `REPORT.md` Section 5 use the last-line method. The Section 5 table below summed the repeated lines too, so its total overstates spend; use `cost/cost-log.csv`.

> **How to read this file.** Section 1 is the course's short training report (400–700 words). Sections 2–8 are the full evidence log: setup, timeline, the run table, cost, failures caught, and the course cross-check. Section 9 is the operating plan (fill in the `TODO(you)` markers). Screenshots are yours to paste at the marked `[SCREENSHOT …]` placeholders.

---

## 1. Short training report

The week turned a small fixture-only Markdown viewer into a working tool plus a supervised multi-lane agent workflow, with every feature landing through the same discipline: a written PRD, an interview, isolated worktrees, executed checks, independent review and explicit integration.

**Project and accepted result.** The app grew from a static fixture listing to slices for folder navigation (19 Sep), selection/preview (20 Sep), editing and bounded file operations (20–21 Sep), live Pi/Claude skill directories (20–21 Sep), a Projects viewer over workflow runs (21 Sep), review visibility and run inputs (22–23 Sep, the ultra-comparison branch), worker lanes, parallel reviewers, a portable controller, viewer clarity, a cited audit, and workflow guardrails (22–24 Sep). Each landed on `main` from a reviewed feature branch; evidence is the merge history in `git log --first-parent main` (113 commits) and the run exports in `~/.local/state/md-manager-workflows/`. Unfinished: workflow-guardrails-001's candidate is blocked on a browser-evidence rule (fixes landed 23–24 Sep, rerun pending), and the Day-5 capstone repo (project-B) is prepared but not yet run.

**One rediscovery.** The Day-4 effort comparison was the clearest test of an inherited assumption. The same PRD (`PRD_REVIEW_VISIBILITY`, slices A–C) was given to three fresh sessions: `high` (at least $7.67; only part of that session was logged), `opus` ($22.57) and `ultracode` ($241.84). Ultra produced the merged implementation, at about 11× the cost of the `opus` session, with no acceptance-rate gain to justify it for this task class. Default effort is now `high`/`xhigh`; ultracode is reserved for substantive single-shot work. I also retested the "two attempts" habit on the fixture-listing task (attempt-a/b/c, 19 Sep): the structured outcome brief won, and I kept it as the house brief format.

**Current setup.** Two providers, per course policy: Claude Code (subscription; fable-5-1 for ordinary work, opus-5-5 for lanes since 23 Sep, opus-5 with xhigh effort; settings in `~/.claude/settings.json`) and Pi with Codex `gpt-6-astra` for supervision, review and planning (`~/.pi/agent/sessions/--home-agentops-dev-md-manager--/`). Herdr manages panes; every concurrent writer gets its own worktree. Measured Claude spend for all md-manager work to date: **$1,799.16** (cost-state lines in the session transcripts). Pi spend is subscription-bundled and not metered per run.

**Process evidence.** Grilling: the `workflow-grill` skill interviewed the guardrails feature and the project-B skeleton; both `decisions.md` files record answers with consequences. Skill: `workflow-grill` ships and is linked into `~/.claude/skills`; a `team-prd` Pi skill was built 20 Sep. Goal and recovery: an overnight goal run completed live-skills (`PROGRESS_LIVE_SKILLS.md`), and `viewer-clarity-002` was deliberately interrupted — the run dir records the stop and nothing was lost. Graph: eleven supervised runs (Section 4), including an intentional verification-branch failure drill (21 Sep) and two live Claude auto-update outages recovered in-run. Routine: Pi schedules monitor run events (`parallel-reviewers-001-monitor`, `pr-review-watch`); the workflow CLI itself is the Day-5 wrapper. Multitasking: two lanes per run plus a parallel `vea` review stream; review queue stayed empty except where deliberately blocked.

**Failure and next step.** Three independent reviews returned blocked verdicts and each caught a real defect: a P1 in reuse-evidence rendering (smoke, 21 Sep), a P1 that degraded legacy-run exports on any status command (worker-lanes, 22 Sep), and a P1 class of browser-evidence-rule surprises at the candidate gate (guardrails, 23 Sep). The reviewer is the highest-value component of the pipeline. Next month: rerun workflow-guardrails-001, run the project-B capstone through the 2.2.0 guardrails end-to-end, and add a per-run cost line to the export so the cost log stops being manual.

## 2. Setup, providers and configuration

| Item | Value | Evidence |
| --- | --- | --- |
| Course doc | `AI_ROADMAP.pdf`, 110 pp, 16 Sep 2026 edition | `~/dev/AI_ROADMAP.pdf` |
| Primary harness | Claude Code, subscription | `~/.claude/settings.json` |
| Models used | `claude-fable-5-1` (dev + first lanes), `claude-opus-5` (smoke reviewers, effort comparison), `claude-opus-5-5` (lanes from 23 Sep), `claude-haiku-4-5` | model lines in `~/.claude/projects/*/​*.jsonl` |
| Effort settings | opus-5 `xhigh`; fable-5-1 and opus-5-5 `high`; default model `opus[1m]` | `~/.claude/settings.json` |
| Second provider | Pi (OpenAI Codex), `gpt-6-astra`, thinking medium | `model_change` lines in `~/.pi/agent/sessions/--home-agentops-dev-md-manager--/​*.jsonl` |
| Terminal manager | Herdr (workspace `notes`, 14 panes used across runs) | `~/.config/herdr/session.json`; per-run `terminals.json` |
| Isolation | one Git worktree per worker lane; separate repo copies `~/dev/md-manager-ctl`, `~/dev/md-manager-ctl2` for parallel streams | run dirs; git worktree list |
| Machine | VPS, 4 cores / 7.9 GB — fits 3–4 worker lanes | project-B `CLAUDE.md` (operator notes) |
| Acceptance checks | app unit + e2e suites, workflow suite (339 test functions), contract schemas (`npm run test:contracts`), per-run policy checks (build + Playwright browser scenarios) | `workflow/test_*.py`, `tests/`, `contracts/` |
| Plan tier / quota | `TODO(you)`: state your Claude plan (Max 5x/20x) and ChatGPT Pro tier, and anything notable about quota during the week (e.g. the 22 Sep adapter quota block) | — |

## 3. Timeline with evidence

Commits on `main` by day: 18 Sep ×2 · 19 Sep ×5 · 20 Sep ×5 · 21 Sep ×18 · 22 Sep ×15 · 23 Sep ×48 · 24 Sep ×20.

### Thu 18 Sep — scaffold (course Day 1: setup)
- `4304042` init project, `21db6f7` sample files. Pi session `-home-agentops-dev-md-manager-a-` runs from 16:31.
- [SCREENSHOT: first running fixture listing]

### Fri 19 Sep — slice 1, rediscovery attempts, Day-2 PRD practice
- Slice-1 PRD pasted into Claude session `13a450df` (17:45 UTC). Four alternatives built in isolated worktrees the same evening: `slice1/compact-explorer`, `slice1/folder-gallery`, `slice1/graph-explorer`, `slice1/classic-folder-cards` (branches at 5c9c2b2, 3608d89, 9ca0cc5, 74ef08f; transcripts `-home-agentops-dev-md-manager-slice1-*`). Graph explorer chosen.
- Rediscovery experiment: `attempt-a` (162d695), `attempt-b`, `attempt-c` — bounded re-runs of the same fixture-listing task with different briefs (experiment branches, not merged).
- Day-2 grilling practice: `c52f58a` "add day 2 MD Manager PRD", `77dda06` "add revised challenge day 2 PRD" (`docs/PRD_GRILL_DAY2.md`, `docs/PRD_CHALLENGE_DAY2.md`).
- Pi supervises: 20:37 review of `9ca0cc5`; 20:55 "give me a PRD for just Slice 2".

### Sat 20 Sep — slices 2–3, live skills, goal run
- `03a6fb8` slice 2 (secure preview + navigation), `a5e1a5d` slice 3 (explicit editing + bounded file ops) — TDD PRDs (`docs/PRD_SLICE2.md`, `docs/PRD_SLICE3.md`).
- Pi: 07:46 review of PR #1; 16:01 builds the reusable `team-prd` skill; 17:47 starts the live-skills work.
- Outcome-brief experiment at 18:04: structured JSON brief ("Evolve the existing fixture listing…", session `7c3fdd0c`).
- Long-running goal: session `f1e52842` (18:23 → 21 Sep 05:37) runs `Continue @docs/PROGRESS_LIVE_SKILLS.md`; a `/loop` session (`05873909`) watches the project directory. `dceb4a7` starts live-skills (config registry + location contract). PR #1 (slice-3 branch) merged (`b6a7ba8`).

### Sun 21 Sep — live skills land, first workflow runs, effort comparison
- `4b4c4f6` live Pi and Claude skills merged (`docs/HANDOFF_LIVE_SKILLS.md` has red/green evidence).
- Pi: 05:40 "Produce a rich, interactive explanation of a code change as a single self-contained HTML file" — the lineage of the run viewer; 08:00 "create a workflow following these instructions with LangGraph".
- **First workflow runs:** `interactive-20260921-114713` (smoke of two lanes, 11:47); **`project-workflows-001`** 14:33–15:52 — Projects viewer + registry API, approved 15:42, *including an intentional verification-branch failure drill at 15:32* (`events.jsonl`: "Intentional lab drill: verification branch failure").
- **`review-smoke-001`** 19:53–20:00 — first native reviewer; verdict **blocked** with a real P1 (reuse-evidence rendering, Section 6).
- `287486e` adds `PRD_REVIEW_VISIBILITY` (slices A–C).
- **Effort comparison** (18:53–19:00 start): same PRD to `/effort high` (session `6d369cb3`), `opus` model (session `2694b1a3`), and `/effort ultracode` (session `9ef1cac0`, runs to 22 Sep 19:50). Costs: ≥$7.67 / $22.57 / $241.84 (corrected 5 Oct). Ultra's branch is the one that landed (`feature-ultra`, merged `af119c7` on 23 Sep).
- PR #2 merged (`e9be57a`).

### Mon 22 Sep — worker lanes, the auto-update outage, parallel reviewers
- `2cb6770` PRDs for configurable workflow (worker lanes + parallel reviewers). `feature-ultra` completes review visibility + run inputs (`43f44de`).
- **`worker-lanes-001`** 20:00–21:34 — live Claude Code auto-update deleted the binary mid-run (`[Errno 2] No such file or directory: 'claude'` at 20:10); ui verification failed twice, passed at 21:24; candidate passed. Review verdict **blocked** (P1, legacy-run export degradation). Merged as `eb20082`.
- **`parallel-reviewers-001`** 22:55 → 23 Sep 00:22 — adapter lane blocked by quota at 23:00 ("No billing/provider fallback"); candidate blocked three times; no review reached.
- Pi: 22:45 "How do I run loops inside pi" → the monitor schedules; `80a9217` "feat: pi schedule" (pi-subagent schedules live in `md-manager/.pi/subagents/schedules/`). `md-manager-ctl` copy active; PR #2 merged (`e9be57a`).

### Tue 23 Sep — the heavy day: five runs, grilling, guardrails
- **`parallel-reviewers-002`** 00:25–00:37 — approved (72e84c4).
- **`workflow-audit-001`** 06:39–07:04 — audit worker writes `docs/audit/WORKFLOW_AUDIT.md` (749 lines, `path:line` citations); two reviewers approve.
- **`viewer-clarity-001`** 07:43–09:03 — approved on attempt 1, both reviewers. Three-way review comparison in `~/dev/md-manager-reviews/viewer-clarity-001-three-reviews-compared.md` (Claude loop: 15 passes ≈ 25 findings; one-time reviewers: 7 findings, 4 overlapping).
- **`viewer-clarity-002`** 17:05 — operator-interrupted after 6 minutes; workers stopped, branch discarded, nothing lost (run dir + supervisor interrupt event kept).
- **`portable-workflow-001`** 17:39–18:32 — controller lane, approved; PRD `PRD_PORTABLE_WORKFLOW` pinned the slice-2 design (`e9c6883`).
- Grill session 16:56: PRD_PORTABLE_WORKFLOW interview → `features/workflow-guardrails/decisions.md` (2026-09-23).
- **`workflow-guardrails-001`** 19:32–20:27 — guardrails feature (outcome briefs, decisions, design challenge, completion 1.1.0, worker questions). Live auto-update outage again (19:33–20:03, four controller blocks, then the retry fix proven live); verify_controller failed once, passed at 20:18; **candidate blocked twice** (20:24, 20:27) on the browser-evidence rule (exactly one `screenshot:` attachment per scenario). No approval. Live issue log: `~/dev/md-manager-reviews/workflow-guardrails-001-issues.md`.
- Evening fix storm: 23 Sep commits (retry `claude` calls `cc35452`, exit 75 `aee3b68`, `--settings` autoupdater-off `3854e1e`, attach reconnects, lane repair `26b5e83`…).

### Wed 24 Sep — round-3 review fixes; Day-5 capstone prepared
- Round-3 review findings closed on `main` (20 commits: review re-entry `5912872`, confirmed stops `b1cc68b`, answer typing `6db7d62`, challenge resume `83e845a`, …).
- **Capstone:** `~/dev/project-B` (Pirate Sea Race) — spec (`docs/spec.md` from `spec.docx`, `b1ddfb4`), `CLAUDE.md`, skeleton feature at `feature.json` **2.2.0** with `decisions.md` from the 24 Sep grill (`313eb87`). Not yet launched — runs will go to `~/.local/state/agent-workflows/project-B/`.
- [SCREENSHOT: project-B grill session / decisions.md]

## 4. Workflow run table

All runs live under `~/.local/state/md-manager-workflows/<feature>/<run>/`; each has `plan.json`, `events.jsonl` (timeline), completion files, verification packets with screenshots, `review.json`/`automatic-review*.json`, and `run-state.json` (export) + `report.html` (viewer).

| Run | Window (UTC) | Workers | Verdict | Notable |
| --- | --- | --- | --- | --- |
| interactive-20260921-114713 | 21 Sep 11:47 | ui, adapter | smoke | first interactive two-lane run |
| project-workflows-001 | 21 Sep 14:33–15:52 | ui, adapter | **approved** | Projects viewer + registry; intentional verification-failure drill; first native reviewer |
| review-smoke-001 | 21 Sep 19:53–20:00 | — (reviewer only) | **blocked** | reviewer smoke test caught P1 |
| worker-lanes-001 | 22 Sep 20:00–21:34 | ui, adapter | **blocked** (review) | live auto-update outage recovered; P1 in export |
| parallel-reviewers-001 | 22 Sep 22:55 → 23 Sep 00:22 | ui, adapter | no review (adapter quota-blocked) | controller refused fallback correctly |
| parallel-reviewers-002 | 23 Sep 00:25–00:37 | ui | **approved** | follow-up alignment run |
| workflow-audit-001 | 23 Sep 06:39–07:04 | audit | **approved** | cited audit doc, two reviewers |
| viewer-clarity-001 | 23 Sep 07:43–09:03 | ui, adapter | **approved** | all gates pass on attempt 1; 3-review comparison |
| viewer-clarity-002 | 23 Sep 17:05–17:11 | ui, adapter | interrupted (operator) | stopped cleanly; evidence preserved |
| portable-workflow-001 | 23 Sep 17:39–18:32 | controller | **approved** | portable target resolution |
| workflow-guardrails-001 | 23 Sep 19:32–20:27 | controller, ui | candidate **blocked** ×2 | auto-update outage #2; browser-evidence rule hit at candidate |

Integration model: every approved run fast-forwards its feature branch into `main` (all candidate commits verified as ancestors of `main`); nothing pushes.

## 5. Cost log (measured)

Source: `cost-state` lines in `~/.claude/projects/*/​*.jsonl` (Claude Code session transcripts). Pi/Codex usage is subscription-bundled and not metered here.

| Category | Cost (USD) |
| --- | ---: |
| Dev sessions (`-home-agentops-dev-md-manager`, 20 sessions) | 434.89 |
| Effort experiment — `/effort ultracode` (`-md-manager-ultra`) | 241.84 (corrected) |
| Effort experiment — opus model session | 22.57 (corrected) |
| Effort experiment — `/effort high` session | ≥7.67 (corrected) |
| Slice-1 alternatives (graph 38.49, compact 18.87, classic 17.47, gallery 13.70) | 88.53 |
| Workflow lanes — all worker + reviewer worktrees (25 dirs) | 498.64 |
| Scratchpad perm/attachment checks | 9.46 |
| **Total measured Claude spend (md-manager work)** | **1,799.16** (overstated: summed repeated cost-state lines; see the correction note at the top) |

Per-lane examples: worker-lanes adapter $53.59, project-workflows adapter $52.47, parallel-reviewers-001 adapter $64.83 (quota-blocked), workflow-guardrails controller $21.89, viewer-clarity-001 ui $15.82. Reviewer sessions are cheap: $2–28 each.

Course's two-plan question: the $241.84 ultra run produced the accepted implementation of `PRD_REVIEW_VISIBILITY` — but at about 11× the `opus` session with no measured acceptance-rate gain. `TODO(you)`: add your Pi/ChatGPT-Pro spend observation and quota notes here.

## 6. Failures caught (the "escaped defects" log)

1. **Smoke reviewer, 21 Sep** — verdict blocked, P1: reuse-evidence panel inoperative end-to-end (`normalizeEvents` hardcodes `reused_from_attempt: null`, `NodeDetail.tsx` keys off `result_reused` events that are never emitted). Caught by the first native reviewer against a real run bundle. Evidence: `smoke/review-smoke-001/review.json`.
2. **worker-lanes reviewer, 22 Sep** — verdict blocked, P1: any CLI reporting path other than `export` degrades runs recorded before configured lanes (LangGraph channel drop). Evidence: `worker-lanes/worker-lanes-001/review.json`.
3. **workflow-guardrails candidate, 23 Sep** — blocked twice: the verifier's browser rule (exactly one `screenshot:<id>` attachment per required scenario) was invisible to lanes until the frozen candidate. Fixes: `check-report` command sharing the verifier's rule (`c245a9a`, `710ae43`), worker-phase gating, and `workflow repair` for frozen lanes (`26b5e83`, `a6d47f1`). Evidence: `~/dev/md-manager-reviews/workflow-guardrails-001-issues.md`; `events.jsonl` 20:24/20:27.
4. **Claude auto-update outages, 22–23 Sep** — the updater deleted/swapped the binary mid-run (worker-lanes-001, guardrails-001: `ENOENT`/`ENOEXEC` at 19:33–20:03). Fixes: retry wrapper on every `claude` call (`cc35452`), `DISABLE_AUTOUPDATER=1` for all controller-started processes (`3854e1e`), exit 75/69 semantics (`aee3b68`, `ae3d274`), preflight stale-session warnings.
5. **parallel-reviewers-001, 22 Sep** — adapter lane quota-blocked; the controller recorded the block and refused any billing/provider fallback instead of pretending completion. Evidence: `events.jsonl` 23:00:10.
6. **viewer-clarity three-review comparison** — the one-time reviewers caught what the rolling review missed (captured Markdown loads remote images) and vice versa (runtime risks only visible mid-run); 4 findings overlapped. Evidence: `~/dev/md-manager-reviews/viewer-clarity-001-three-reviews-compared.md`.
7. **Web3 track (vea, real repo)** — AI review of a human-written validator-cli branch found a **P0** (cross-chain block number on `arbToGnosis`) and a **P1** (silent heartbeat regression). Evidence: `~/dev/vea_validators/review-validator-dev-vs-fix.md`, `tasks/`, `overnight-tasks.md`.

## 7. Course cross-check (what maps to which exercise)

| Course requirement | Where the evidence lives |
| --- | --- |
| Project brief (one page) | this file (Sections 1–2) + `README.md` |
| Acceptance/evidence list | Section 4 gates; per-run `verification/` packets; app suites |
| Run-and-cost log | Sections 4–5 |
| Next-step note | Section 10 |
| Rediscovery / two-attempt comparison | `attempt-a/b/c` branches (19 Sep); outcome brief session `7c3fdd0c` |
| Grilling (3 directions) | `PRD_GRILL_DAY2.md`, `PRD_CHALLENGE_DAY2.md`; grill transcripts 21–24 Sep; `features/*/decisions.md` |
| Independent verification that can fail | the failure drill in `project-workflows-001`; two blocked review verdicts plus two candidate-blocked runs (Section 6) |
| Interface alternatives (2–3, isolated) | four slice-1 branches/worktrees (19 Sep), graph chosen |
| Development mode (R32 matrix) | `TODO(you)`: one line on how you classified the app vs workflow-controller changes |
| One tested skill | `workflow-grill` (shipped, linked in `~/.claude/skills/`); `team-prd` Pi skill (20 Sep) |
| Bounded goal run + recovery | `f1e52842` overnight goal (live skills); `viewer-clarity-002` interrupted-and-recovered |
| Graph with two workers + integrator | the entire workflow lab; runs table Section 4; failure drill + repair path |
| Effort comparison (measured) | ultra/high/opus on `PRD_REVIEW_VISIBILITY`; costs in Section 5 |
| Routine (repeatable, idempotent) | pi schedules (`md-manager/.pi/subagents/schedules/`: `parallel-reviewers-001-monitor`, `pr-review-watch`); workflow CLI as the Day-5 wrapper |
| Multitasking decision | two lanes + parallel vea review stream; Herdr layout `~/.config/herdr/session.json` |
| Capstone with fresh evaluator | project-B prepared (24 Sep); **pending run** |
| Final cleanup | `TODO(you)`: confirm no leftover schedules/credentials; see Section 10 |

## 8. Screenshots

Paste your screenshots below (the workflow also captured its own Playwright evidence PNGs, e.g. `challenge-node-page.png`, `decisions-shown.png` under each run's `verification/` dirs).

- [SCREENSHOT: Day 1 — first running slice]
- [SCREENSHOT: grilling session / decisions.md]
- [SCREENSHOT: Herdr layout with two worker panes]
- [SCREENSHOT: run timeline in the supervisor pane]
- [SCREENSHOT: Projects viewer showing a run graph]
- [SCREENSHOT: reviewer verdict / blocked candidate]
- [SCREENSHOT: cost/usage meter]
- [SCREENSHOT: project-B capstone]

## 9. Personal operating plan

`TODO(you)` — fill in, then delete this line.

- **Provider allocation:** Claude Code (primary implementation) + Pi/Codex (supervision/review). Same-provider exception: none requested.
- **Routing:** fable-5-1 for routine edits; opus-5-5 high for workflow lanes; opus-5 xhigh for review-sensitive work; ultracode only for a single substantive task, with a cost cap.
- **Acceptance evidence required:** executed checks + artifacts, never a summary; worker completions carry `untested`, `falsifying_check`, `verify_yourself`.
- **Concurrency limit:** 2 worker lanes + at most 1 background review stream; clear the review queue before launching the next run.
- **Weekly maintenance:** inspect failed runs, unique reviewer findings and usage; remove stale instructions.
- **Next plan review date:** `TODO(you)`.

## 10. Next steps and open items

1. Rerun `workflow-guardrails-001` (or a fresh run) now that the browser-evidence rule is worker-phase gated and `check-report` exists.
2. Launch the project-B skeleton run (`workflow launch skeleton --live --automatic …` per its `CLAUDE.md`), including its first design challenge.
3. `TODO(you)`: plan tiers and quota observations; Pi spend estimate; screenshots; R32 classification; cleanup check of schedules/worktrees/credentials.
