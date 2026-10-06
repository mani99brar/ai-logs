---
name: portable-workflow-plan
description: PRD_PORTABLE_WORKFLOW (2026-09-23) — 3 slices: portability+trim, guardrails from user's prompt templates, project-B skeleton from a spec PDF
metadata:
  type: project
---

docs/PRD_PORTABLE_WORKFLOW.md on main. Slice 1 (portable-workflow-001) integrated 2026-09-23 plus follow-ups (parallel runner `python -m workflow.run_tests`, registry lock/symlink fixes) at bdeefec. Slice 2 feature `features/workflow-guardrails` (lanes controller+ui) committed e9c6883, design pinned in PRD 4.3–4.8; not yet launched as of writing.

- Slice 1: --repo/cwd target, feature scanning, bundled schemas + builtin briefs, registry auto-registration, `workflow init`, trimming (1.0.0 feature.json, observer.py, standalone interactive flow, four finished feature dirs, five docs folded into README+RUNBOOK). Its run doubles as the first live print-transport smoke.
- Slice 2 (guardrails apply only to feature.json 2.2.0; old 2.1.0 features keep working): enforce the user's templates — outcome-brief headings Goal/Acceptance/Stop, workflow-grill skill writing decisions.md (≤5 questions), mid-run `question` status + `workflow answer` with paused deadline (max 3), pre-worker `challenge` print node that pauses on P0/P1 (`resume`, `--accept-challenge`), completion 1.1.0 with untested/falsifying_check/verify_yourself.
- Slice 3: ~/dev/project-B skeleton from the spec the user shared (it arrived as a .docx, not a PDF).

**Why:** user wants the workflow modular and usable across projects, with their prompting rules enforced by the workflow itself.
**How to apply:** build slices in order on latest main; see [[workflow-live-run-lessons]].

- Live launches now auto-register into ~/.config/md-manager/projects.json unless MD_MANAGER_PROJECTS_CONFIG is set; the viewer server has NO default registry path (it serves an empty Projects root unless MD_MANAGER_PROJECTS_CONFIG is set). Since 2026-09-24 the dev servers in Herdr pane w5:p1Z run with MD_MANAGER_PROJECTS_CONFIG=~/.config/md-manager/projects.json, which is the file launches write to, instead of the old scratchpad copy.
- Deferred: candidate-phase reuse of worker-phase check results for single-lane runs (own slice after slice 2).

- 2026-09-24: slice 2 finished by hand (not rerun, per the user) plus the run-issue fixes; next is slice 3 (project-B skeleton from the spec PDF the user will share).

- 2026-09-24 slice 3 handed over: the user runs it from a Claude session inside ~/dev/project-B, not from md-manager. Done here:
  - seed commit b1ddfb4 (docs/spec.docx plus docs/spec.md, a Markdown conversion the agents read, and .gitignore);
  - uncommitted `features/skeleton` (one lane `game`, five checks, browser scenarios join-private-match and two-ships-sync, ports 2593/5393, @playwright/test pinned to 1.63.0 to match the installed Chromium) and CLAUDE.md with an operator section;
  - grill Q1 answered (walking skeleton), recorded in decisions.md; the rest is TODO for `/workflow-grill skeleton` there;
  - the grill skill is linked into ~/.claude/skills;
  - `~/.local/bin/workflow` wraps md-manager's venv `python -m workflow`, and its target defaults to the cwd repo.
- 2026-09-24 08:39: the user launched skeleton-001 from pane w5:p7 and pressed Ctrl-C during the design challenge, after the stale-session warning. That warning named pid 1107463, the md-manager Claude session itself, and 1185157 in vea. Resume with `workflow automatic <run> --live`.

- 2026-09-24 ~09:15 UTC skeleton-001 viewer/verifier issues (branch fix/viewer-live-worker-state in ~/dev/md-manager: commits 7576a28, a046c2c, 1a39ddb, 780b7ff (registry hot-reload), 8508930 (controller exports after every graph step); not merged to main, not pushed): (1) viewer showed "Awaiting approval" + launch node "succeeded" while the worker coded: the handoff's `worker_handoff` interrupt was projected as a decision; fixed in projectSnapshot (launch nodes running while it is open; automatic handoff pending/own event). (2) viewer never auto-refreshed: added 5 s background polling (useResource pollToken, usePoll). (3) verifier's text_test_counts did not parse vitest ("Tests  70 passed (70)") -> identical failures on verify_game; added vitest_counts. The user's project-B session meanwhile applied lane repair 1 (a vitest reporter printing a TAP-style summary) and verify_game passed at attempt 3. The controller runs this checkout, so working-tree edits to workflow/*.py go live for new controller processes.
- Known follow-ups from the 2026-09-24 review (stale export fixed by 8508930): a slow projection (>5 s) never settles under polling; the final events of a just-finished run can miss the last poll. skeleton-001 ended with the independent reviewer blocking the candidate (09:32).
- 2026-09-24 10:14: skeleton-fixes-001 (a separate feature for skeleton-001's review findings) approved by both reviewers and fast-forwarded project-B branch feature/skeleton-fixes/skeleton-fixes-001 to ee74298 (no push).
