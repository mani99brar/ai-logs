# AI Roadmap — Master Report (md-manager + project-B)

Course: *AI driven development — 36h30 study program*, 16 September 2026 edition (`roadmap/AI_ROADMAP.pdf`).
Author: Mani Brar. Report assembled from machine artifacts, 2026-09-29. **Supersedes** `docs/AI_ROADMAP_REPORT.md` (written 24 Sep, before the project-B campaign).

> **Cost correction (5 Oct 2026).** Earlier versions of this report put the effort comparison at $15.34 / $45.15 / $707.16. Those figures added up repeated running-total `cost-state` lines from the same sessions. The last `cost-state` line of each session gives `/effort high` **$7.67** (only the resumed part of that session was logged), `opus` **$22.57** and `/effort ultracode` **$241.84**. `cost/cost-log.csv` and the category totals in Section 5 already used the last-line method and are unchanged.

> **How to read this file.** Section 1 is the course's short training report (400–700 words). Sections 2–8 are the full evidence log. Section 9 is the operating plan (`TODO(you)` markers). Everything cited is in this repo: run exports in `runs/`, raw session transcripts in `sessions/`, review docs in `reviews/`, PRDs and decisions in `docs/`, costs in `cost/cost-log.csv`, indexes in `runs/index.md` and `sessions/index.md`.

---

## 1. Short training report

The program turned a fixture-only Markdown viewer into a working tool plus a supervised multi-lane agent workflow, then drove a second product end-to-end through that workflow — with every feature landing through the same discipline: a written PRD, an interview, isolated worktrees, executed checks, independent review and explicit integration.

**Project and accepted result.** md-manager grew from a static fixture listing to folder navigation (19 Sep), preview and editing (20–21 Sep), live Pi/Claude skill directories, a Projects viewer over workflow runs (21 Sep), review visibility and run inputs (22–23 Sep, the ultracode-comparison branch), worker lanes, parallel reviewers, a portable controller, viewer clarity, a cited audit, workflow guardrails, and the Run Story viewer line (23–27 Sep). The workflow lab itself became the Day-5 wrapper. The capstone, project-B (a pirate sea-race game), was taken from spec to a winnable match in 40 supervised runs over 24–26 Sep, ending with `economy-online-001` completing the slice on 26 Sep. Evidence: merge history in `source/*-git-log.txt`, run exports in `runs/`, transcripts in `sessions/`.

**One rediscovery.** The Day-4 effort comparison was the clearest test of an inherited assumption. The same PRD (`PRD_REVIEW_VISIBILITY`) went to three fresh sessions: `high` (at least $7.67; only part of that session was logged), `opus` ($22.57) and `ultracode` ($241.84). Ultra produced the merged implementation, at about 11× the cost of the `opus` session, with no acceptance-rate gain to justify it for this task class. Default is now `high`/`xhigh`; ultracode is reserved for substantive single-shot work. I also retested the "two attempts" habit on the fixture-listing task (attempt-a/b/c, 19 Sep): the structured outcome brief won and became the house brief format.

**Current setup.** Two providers per course policy: Claude Code (subscription; fable-5-1 for ordinary work, opus-5-5 for lanes, opus-5 with xhigh effort for review-sensitive work; `sessions/claude/settings.json`) and Pi with Codex `gpt-6-astra` for supervision, review and planning (`sessions/pi/`). Herdr manages panes; every concurrent writer gets its own worktree. Measured Claude spend for all logged work: **$2,514.68** across 343 sessions (md-manager dev $1,416 incl. the ultra run, workflow lanes $248, project-B $820, vea/kleros $28). Pi spend is subscription-bundled and not metered per run.

**Process evidence.** Grilling: the `workflow-grill` skill interviewed the guardrails feature and the project-B skeleton; `decisions.md` files record answers with consequences (`docs/features/*/decisions.md`). Skill: `workflow-grill` ships (`sessions/claude/skills/`) and a `team-prd` Pi skill exists (`sessions/pi/skills/team-prd/`). Goal and recovery: an overnight goal run completed live-skills (`PROGRESS_LIVE_SKILLS.md`), and `viewer-clarity-002` was deliberately interrupted — the run dir records the stop and nothing was lost. Graph: 54 run dirs across md-manager (14), project-B (37), vea (2) and kleros-v2 (1); **32 approved, 16 blocked, 6 without review** — every blocked project-B run was resolved by a fixes run and merged. Design challenges were exercised in-run (`economy-online` twice, `duel-core`, the vea run). Routine: Pi schedules monitor run events (`config/pi-schedules/`); the workflow CLI is the Day-5 wrapper. Multitasking: two lanes per run plus a parallel vea/kleros review stream.

**Failure and next step.** Independent reviewers caught real defects every time they were pointed at real work: a P1 in reuse-evidence rendering (smoke, 21 Sep), a P1 degrading legacy-run exports (worker-lanes, 22 Sep), a P1 class of browser-evidence-rule surprises at the candidate gate (guardrails, 23 Sep), plus 16 blocked verdicts across the project-B campaign — including the intel subsystem failing review three times before `intel-core-fixes-4` passed. The reviewer is the highest-value component of the pipeline. Next month: merge the viewer-ux Run Story line into md-manager main, re-run `workflow-guardrails-001` under the fixed rules, and add a per-run cost line to the export so the cost log stops being manual.

## 2. Setup, providers and configuration

| Item | Value | Evidence |
| --- | --- | --- |
| Course doc | `AI_ROADMAP.pdf`, 110 pp, 16 Sep 2026 edition | `roadmap/AI_ROADMAP.pdf` |
| Primary harness | Claude Code, subscription | `sessions/claude/settings.json` |
| Models used | `claude-fable-5-1` (dev + first lanes), `claude-opus-5` (smoke reviewers, effort comparison), `claude-opus-5-5` (lanes from 23 Sep), `claude-haiku-4-5` | model lines in `sessions/claude/projects/*/​*.jsonl` |
| Effort settings | opus-5 `xhigh`; fable-5-1 and opus-5-5 `high`; default model `opus[1m]` | `sessions/claude/settings.json` |
| Second provider | Pi (OpenAI Codex), `gpt-6-astra` | `sessions/pi/sessions/` |
| Terminal manager | Herdr (workspace `notes`, pane layouts used across runs) | `config/session.json`, `config/config.toml` |
| Isolation | one Git worktree per worker lane; separate repo copies `md-manager-ctl`, `ctl2` for parallel streams | `source/*.bundle` |
| Machine | VPS, 4 cores / 7.9 GB — fits 3–4 worker lanes | project-B `CLAUDE.md` (in `source/project-B.bundle`) |
| Acceptance checks | app unit + e2e suites, workflow suite, contract schemas, per-run policy checks (build + Playwright browser scenarios with screenshots) | run dirs under `runs/` |
| Pi schedules / monitors | `parallel-reviewers-001-monitor`, `pr-review-watch` | `config/pi-schedules/` |
| Plan tier / quota | `TODO(you)`: state your Claude plan (Max 5x/20x) and ChatGPT Pro tier, plus the 22 Sep adapter quota block | — |

## 3. Timeline with evidence

### Week 1 — md-manager (Thu 18 – Wed 24 Sep)
- **18 Sep**: init project (`4304042`), sample files. Pi session `md-manager-a` starts.
- **19 Sep**: Slice-1 PRD into Claude session `13a450df`; four isolated alternatives (`slice1/compact-explorer`, `folder-gallery`, `graph-explorer`, `classic-folder-cards`; graph chosen); rediscovery experiments `attempt-a/b/c`; Day-2 grilling practice (`c52f58a`, `77dda06`); Pi reviews `9ca0cc5` and drafts the Slice-2 PRD.
- **20 Sep**: slices 2–3 land (`03a6fb8`, `a5e1a5d`); Pi reviews PR #1 and builds the `team-prd` skill; structured outcome-brief experiment (`7c3fdd0c`); overnight goal run `f1e52842` (18:23 → 21 Sep 05:37) completes live-skills; PR #1 merged (`b6a7ba8`).
- **21 Sep**: live skills merged (`4b4c4f6`); Pi produces the "rich interactive HTML explanation" that becomes the run viewer's lineage; first LangGraph workflow plans; **first runs**: `interactive-20260921-114713` (smoke), **`project-workflows-001`** (14:33–15:52, approved, with an intentional verification-failure drill at 15:32), **`review-smoke-001`** (19:53, blocked — first native reviewer catches a real P1); `PRD_REVIEW_VISIBILITY` written; **effort comparison** launched (high ≥$7.67 / opus $22.57 / ultracode $241.84); PR #2 merged.
- **22 Sep**: `feature-ultra` completes review visibility + run inputs; **`worker-lanes-001`** (20:00–21:34) survives a live Claude auto-update outage, review **blocked** (P1 legacy-run export); **`parallel-reviewers-001`** (22:55 → 00:22) — adapter quota-blocked, candidate blocked 3×, no review; Pi loops question → monitor schedules; `md-manager-ctl` copy active.
- **23 Sep**: the heavy day — **`parallel-reviewers-002`** (approved), **`workflow-audit-001`** (approved; 749-line cited audit), **`viewer-clarity-001`** (approved on attempt 1; three-review comparison in `reviews/viewer-clarity-001-three-reviews-compared.md`), **`viewer-clarity-002`** (operator-interrupted, recovered cleanly), **`portable-workflow-001`** (approved), grill for `PRD_PORTABLE_WORKFLOW`, **`workflow-guardrails-001`** (19:32–20:27; second auto-update outage; candidate **blocked twice** on the browser-evidence rule); evening fix storm (retry wrapper, exit 75/69, autoupdater off).
- **24 Sep**: round-3 review findings closed (20 commits on main); capstone prepared (project-B scaffolded, skeleton grilled, `feature.json` 2.2.0).

### Week 2 — the capstone campaign (Wed 24 – Mon 28 Sep)
project-B (`source/project-B.bundle`, 113 refs) is the Day-5 capstone: a pirate sea-race game, sliced from a spec (`docs/spec.md`), run exclusively through the workflow. 37 run dirs, most with two reviewers (`coverage` + `general`) and browser-verified scenarios. Merge log (abridged): 
- **24 Sep**: `skeleton` (blocked → `skeleton-fixes` approved), `world-sea` (blocked → fixes approved), `duel-core` (+ fixes), `duel-online` (blocked → fixes), `objectives-ledger`, `claim-channel`, `ledger-economy` (+ fixes), `encounters-core`, `ruins-core`, `final-island`, `sea-compact` (blocked → `sea-compact-fixes` blocked → `docking-feel` approved), `fruit-kits-core` (blocked → fixes), `intel-core` (**blocked 3×** → `intel-core-fixes-4` approved).
- **25 Sep**: `match-flow` (approved, pure lifecycle), `fruit-pedestals`, `intel-online` (blocked), `match-online` (blocked → fixes blocked → **`match-online-fixes-2` approved — "the first winnable match"**), `rubbings-theft` (blocked → fixes), `ruins-online`, `fruit-kits-online`.
- **26 Sep**: `intel-online-review` (approved), **`economy-online`** (approved after **two design-challenge attempts** — feature files revised after each) — "hold grace, supply crates, the dockside shop and sail tonics; completes the slice".
- **27 Sep**: back to md-manager — the Run Story viewer line: `viewer-ux-panels-lists-001/002/003` (003 approved; the pure triage model + panels/lists from the `feature/viewer-ux` branch line and `mdm-ux-s1..s5` worktrees).
- **28 Sep**: Web3 stream — **`shutter-reveal-justification-001`** (kleros-v2, approved, worker `web` + two reviewers) and **`veashi-vea-addresses-001`** (no review) → **`-002`** (approved).

## 4. Workflow run log

Full machine-readable index: **`runs/index.md`** (54 run dirs, generated from `plan.json` + review files). Every run dir contains `plan.json`, `events.jsonl`, per-worker completions (`*.completion.json`), verification packets with browser screenshots, review files and `run-state.json`.

| | Count |
| --- | ---: |
| Run dirs (md-manager 14 · project-B 37 · vea 2 · kleros-v2 1) | 54 |
| Approved (incl. automatic-review succeeded) | 32 |
| Blocked by review / candidate gate | 16 |
| No review (interrupted, quota-blocked or pre-review) | 6 |
| Blocked runs later resolved by a fixes run and merged | all 13 project-B blocked + guardrails fixes in main |

Notable runs:
- `project-workflows-001` (21 Sep) — first real run; **intentional verification-branch failure drill** at 15:32 (`events.jsonl`).
- `review-smoke-001` (21 Sep) — reviewer smoke test; blocked verdict with a P1 on its very first outing.
- `worker-lanes-001` (22 Sep) — live Claude auto-update outage recovered in-run; review blocked (P1).
- `parallel-reviewers-001` (22 Sep) — adapter quota-blocked; controller refused fallback; no review.
- `workflow-guardrails-001` (23 Sep) — second auto-update outage; candidate blocked twice on the browser-evidence rule; issues log in `reviews/workflow-guardrails-001-issues.md`.
- `viewer-clarity-001` (23 Sep) — approved on attempt 1; the three-review comparison is the method evidence (`reviews/viewer-clarity-001-three-reviews-compared.md`).
- `intel-core` (24 Sep) — blocked 3× before `intel-core-fixes-4` passed: the campaign's hardest subsystem.
- `economy-online-001` (26 Sep) — two design-challenge attempts, revised feature files each time, approved.
- `veashi-vea-addresses-002` (28 Sep) — the workflow driving a real, non-toy repo.

## 5. Cost log (measured)

Machine-readable: **`cost/cost-log.csv`** + `cost/cost-log.json` (343 Claude sessions; per-session cost, duration, models, first user message). Derived from `cost-state` lines in the raw transcripts. Pi/Codex usage is subscription-bundled and not metered.

| Category | Cost (USD) | Sessions |
| --- | ---: | ---: |
| md-manager dev sessions (incl. the $241.84 ultracode session) | 1,415.99 | 45 |
| workflow lanes (md-manager workers + reviewers) | 248.48 | 44 |
| project-B (dev, lanes, reviewers) | 819.60 | 191 |
| vea / kleros-v2 | 28.11 | 47 |
| other | 2.50 | 16 |
| **Total measured Claude spend** | **2,514.68** | **343** |

Effort comparison (21–22 Sep, same PRD `PRD_REVIEW_VISIBILITY`): `/effort high` **≥$7.67** (only the resumed part of the session was logged) · `opus` model **$22.57** · `/effort ultracode` **$241.84** (produced the merged implementation, about 11× the `opus` session). `TODO(you)`: add your Pi/ChatGPT-Pro spend observation and quota notes.

## 6. Failures caught (the "escaped defects" log)

1. **Smoke reviewer, 21 Sep** — blocked, P1: reuse-evidence panel inoperative end-to-end (`reused_from_attempt` never emitted). `runs/md-manager-workflows/smoke/review-smoke-001/review.json`.
2. **worker-lanes reviewer, 22 Sep** — blocked, P1: any CLI reporting path other than `export` degrades legacy runs (LangGraph channel drop). `runs/.../worker-lanes/worker-lanes-001/review.json`.
3. **workflow-guardrails candidate, 23 Sep** — blocked twice: the verifier's browser rule (exactly one `screenshot:` attachment per required scenario) was invisible to lanes until the frozen candidate. Fixes: `check-report` command, worker-phase gating, `workflow repair`. `reviews/workflow-guardrails-001-issues.md`.
4. **Claude auto-update outages, 22–23 Sep** — updater swapped the binary mid-run (worker-lanes-001, guardrails-001). Fixes: retry wrapper on every `claude` call, `DISABLE_AUTOUPDATER=1` in controller-started sessions, exit 75/69 semantics, preflight stale-session warnings.
5. **parallel-reviewers-001, 22 Sep** — adapter quota-blocked; controller recorded the block and refused any fallback instead of pretending completion.
6. **Three-review comparison, 23 Sep** — one-time reviewers caught what the rolling review missed and vice versa (4 findings overlapped). `reviews/viewer-clarity-001-three-reviews-compared.md`.
7. **project-B blocked verdicts, 24–26 Sep** — 13 blocked runs across skeleton, world-sea, duel-online, sea-compact (2×), fruit-kits-core, intel-core (3×), intel-online, match-online (2×), rubbings-theft — each with concrete findings, each resolved by a fixes feature and merged. The `intel-core` ×3 sequence is the clearest case of a reviewer repeatedly rejecting insufficient fixes.
8. **Web3 track (vea, real repo, ~16 Sep)** — AI review of a human-written validator-cli branch found a **P0** (cross-chain block number on `arbToGnosis`) and a **P1** (silent heartbeat regression). `docs/vea/review-validator-dev-vs-fix.md`, `docs/vea/tasks/`.

## 7. Course cross-check (what maps to which exercise)

| Course requirement | Where the evidence lives |
| --- | --- |
| Project brief (one page) | this file (Sections 1–2) |
| Acceptance/evidence list | `runs/index.md`; per-run `verification/` packets; app + workflow suites |
| Run-and-cost log | Section 4–5 + `runs/index.md` + `cost/cost-log.csv` |
| Next-step note | Section 9 |
| Rediscovery / two-attempt comparison | `attempt-a/b/c` branches (19 Sep); outcome-brief session `7c3fdd0c` |
| Grilling (3 directions) | `PRD_GRILL_DAY2.md`, `PRD_CHALLENGE_DAY2.md`; grill transcripts; `docs/features/*/decisions.md` |
| Independent verification that can fail | the failure drill in `project-workflows-001`; 16 blocked review verdicts + 2 blocked candidates (Section 6) |
| Interface alternatives (2–3, isolated) | four slice-1 branches/worktrees (19 Sep), graph chosen |
| Development mode (R32 matrix) | `TODO(you)`: one line on how you classified app vs workflow-controller changes |
| One tested skill | `workflow-grill` (shipped, `sessions/claude/skills/`); `team-prd` Pi skill (`sessions/pi/skills/team-prd/`) |
| Bounded goal run + recovery | `f1e52842` overnight goal (live skills); `viewer-clarity-002` interrupted-and-recovered |
| Graph with two workers + integrator | the workflow lab; Section 4; failure drill + repair path |
| Effort comparison (measured) | ultra/high/opus on `PRD_REVIEW_VISIBILITY`; Section 5 |
| Routine (repeatable, idempotent) | Pi schedules (`config/pi-schedules/`); workflow CLI as the Day-5 wrapper |
| Multitasking decision | two lanes + parallel vea/kleros review stream; Herdr layout `config/session.json` |
| Capstone with fresh evaluator | **done**: project-B, 24–26 Sep, 37 runs, slice complete at `economy-online` (26 Sep) |
| Final cleanup | `TODO(you)`: confirm no leftover schedules/credentials; see Section 9 |

## 8. Screenshots

Paste your own screenshots below. The workflow also captured Playwright evidence PNGs in every run's `verification/` dirs (kept in this repo).

- [SCREENSHOT: Day 1 — first running slice]
- [SCREENSHOT: grilling session / decisions.md]
- [SCREENSHOT: Herdr layout with two worker panes]
- [SCREENSHOT: run timeline in the supervisor pane]
- [SCREENSHOT: Projects viewer showing a run graph]
- [SCREENSHOT: reviewer verdict / blocked candidate]
- [SCREENSHOT: cost/usage meter]
- [SCREENSHOT: project-B capstone — the winnable match]

## 9. Personal operating plan

`TODO(you)` — fill in, then delete this line.

- **Provider allocation:** Claude Code (primary implementation) + Pi/Codex (supervision/review). Same-provider exception: none requested.
- **Routing:** fable-5-1 for routine edits; opus-5-5 high for workflow lanes; opus-5 xhigh for review-sensitive work; ultracode only for a single substantive task, with a cost cap.
- **Acceptance evidence required:** executed checks + artifacts, never a summary; worker completions carry `untested`, `falsifying_check`, `verify_yourself`.
- **Concurrency limit:** 2 worker lanes + at most 1 background review stream; clear the review queue before launching the next run.
- **Weekly maintenance:** inspect failed runs, unique reviewer findings and usage; remove stale instructions.
- **Next plan review date:** `TODO(you)`.

## 10. Next steps and open items

1. Merge the viewer-ux Run Story line into md-manager `main` (branches `feature/viewer-ux*` are unmerged; `viewer-ux-panels-lists-003` is approved).
2. Re-run `workflow-guardrails-001` under the fixed browser-evidence rule.
3. Add a per-run cost line to the workflow export so the cost log stops being manual.
4. `TODO(you)`: plan tiers and quota observations; Pi spend estimate; screenshots; R32 classification; cleanup check of schedules/worktrees/credentials.
