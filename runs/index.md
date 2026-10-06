# Workflow run index

Generated from `plan.json` + review files. **55 run dirs.**

| When | Run | Workers | Verdict | Findings | Notable | Completions |
|---|---|---|---|---|---|---|
|  | `md-manager-workflows/interactive-20260921-114713` |  | **** | 0 |  |  |
| 2026-09-21T14:33 | `md-manager-workflows/project-workflows/project-workflows-001` |  | **approved** | 6 |  | ui: Added a read-only Projects root beside Pi and Claude (roots nav strip; /projects routes for project -> workflo; adapter: Imple |
| 2026-09-21T14:33 | `md-manager-workflows/smoke/review-smoke-001` |  | **blocked** | 7 |  | review:  |
| 2026-09-22T20:00 | `md-manager-workflows/worker-lanes/worker-lanes-001` |  | **blocked** | 4 |  | ui: Viewer half of PRD_WORKER_LANES slice A. Changed: src/projects/ReviewDetail.tsx (findings grouped by the run's; review:  |
| 2026-09-22T22:55 | `md-manager-workflows/parallel-reviewers/parallel-reviewers-001` | ui,adapter | **** | 0 |  | ui: Viewer half of PRD_PARALLEL_REVIEWERS slice B. src/projects/ReviewDetail.tsx now renders the review result fro; adapter: Imple |
| 2026-09-23T00:25 | `md-manager-workflows/parallel-reviewers/parallel-reviewers-002` | ui | **approved** | 1 |  | ui: Aligned the viewer with the landed 1.4.0 reviewers contract. Changed files: src/projects/reviewers.ts (STATUS_; review:  |
| 2026-09-23T06:39 | `md-manager-workflows/workflow-audit/workflow-audit-001` | audit | **approved** | 16 |  | review-resilience: ; review-safety:  |
| 2026-09-23T07:43 | `md-manager-workflows/viewer-clarity/viewer-clarity-001` | ui,adapter | **approved** | 7 |  | ui: Implemented the ui half of PRD_VIEWER_CLARITY. The changes are in src/projects and tests/project-workflows onl; review-coverag |
| 2026-09-23T17:05 | `md-manager-workflows/viewer-clarity/viewer-clarity-002` | ui,adapter | **** | 0 |  |  |
| 2026-09-23T17:39 | `md-manager-workflows/portable-workflow/portable-workflow-001` | controller | **approved** | 5 |  | controller: Implemented portable-workflow slice 1. launch.py: target = --repo, else cwd's git root when it has features/,  |
| 2026-09-23T19:32 | `md-manager-workflows/workflow-guardrails/workflow-guardrails-001` | controller,ui | **** | 0 |  | controller: Implemented the controller half of PRD_PORTABLE_WORKFLOW slice 2. New: workflow/guardrails.py (outcome-brief h; ui: Im |
| 2026-09-24T08:39 | `agent-workflows/project-B/skeleton/skeleton-001` | game | **blocked** | 4 |  | game: Built the §17 walking skeleton as npm workspaces: apps/web (Phaser client with landing page, HUD, keyboard ada |
| 2026-09-24T09:42 | `agent-workflows/project-B/skeleton-fixes/skeleton-fixes-001` | game | **approved** | 3 |  | game: Findings 1-11 fixed (9 needed no change). F1: three admission layers. (a) authorizeEntry refuses neither/both ; review-cover |
| 2026-09-24T11:07 | `agent-workflows/project-B-world/world-sea/world-sea-001` | world | **blocked** | 2 |  | review-coverage: ; world: Built the §3 sea. Map: Tiled source assets/source/maps/slice-sea.tmj (documented subset in packages/cont |
| 2026-09-24T11:07 | `agent-workflows/project-B/duel-core/duel-core-001` | duel | **approved** | 6 |  | review-coverage: ; review-general:  |
| 2026-09-24T11:46 | `agent-workflows/project-B/duel-core-fixes/duel-core-fixes-001` | duel | **approved** | 4 |  | review-coverage: ; review-general:  |
| 2026-09-24T12:02 | `agent-workflows/project-B-world/world-sea-fixes/world-sea-fixes-001` | world | **approved** | 2 |  | review-coverage: ; review-general:  |
| 2026-09-24T14:22 | `agent-workflows/project-B/duel-online/duel-online-001` | duel | **blocked** | 5 |  | review-coverage: ; duel: Built the combat spike. Protocol v4 (packages/protocol/src/duel.ts): the batched duel-input message (last |
| 2026-09-24T14:55 | `agent-workflows/project-B-claim/claim-channel/claim-channel-001` | claim | **approved** | 5 |  | claim: Built the pure §5 claim rules. packages/content/src/claim: claimRules (channelTicks 200 = 10 s x 20, deadlineT; review-cove |
| 2026-09-24T14:55 | `agent-workflows/project-B-ledger/objectives-ledger/objectives-ledger-001` | ledger | **approved** | 8 |  | review-coverage: ; review-general:  |
| 2026-09-24T16:04 | `agent-workflows/project-B/duel-online-fixes/duel-online-fixes-001` | duel | **approved** | 2 |  | review-coverage: ; review-general:  |
| 2026-09-24T17:13 | `agent-workflows/project-B/sea-compact/sea-compact-001` | world | **blocked** | 9 |  | review-coverage: ; review-general:  |
| 2026-09-24T20:03 | `agent-workflows/project-B/sea-compact-fixes/sea-compact-fixes-001` | world | **blocked** | 3 |  | review-coverage: ; review-general:  |
| 2026-09-24T20:05 | `agent-workflows/project-B-enc/encounters-core/encounters-core-001` | encounters | **approved** | 7 |  | encounters: Added the pure §6 encounter rules as @pirate-sea-race/simulation/encounters (geometry.ts: supercover LOS, bear; review |
| 2026-09-24T20:16 | `agent-workflows/project-B-kits/fruit-kits-core/fruit-kits-core-001` | kits | **blocked** | 3 |  | kits: Added the Ember and Smoke kits to the pure duel. Content: DuelMoveset.kits, an explicit move `effect` (strike/; review-cover |
| 2026-09-24T21:27 | `agent-workflows/project-B-kits/fruit-kits-core-fixes/fruit-kits-core-fixes-001` | kits | **approved** | 1 |  | kits: Restored fruit-kits-core-001's snapshot (aa906a2) with the given git restore; the diff check against refs/work; review-cover |
| 2026-09-24T21:32 | `agent-workflows/project-B/docking-feel/docking-feel-001` | world | **approved** | 11 |  | review-coverage: ; review-general:  |
| 2026-09-24T21:34 | `agent-workflows/project-B-intel/intel-core/intel-core-001` | intel | **blocked** | 2 |  | intel: Built the pure intel rules. packages/simulation/src/intel has the config, a 3x3 sectorOf, a world view that do; review-cove |
| 2026-09-24T21:34 | `agent-workflows/project-B-ruins/ruins-core/ruins-core-001` | ruins | **approved** | 7 |  | review-coverage: ; review-general:  |
| 2026-09-24T21:56 | `agent-workflows/project-B-econ/ledger-economy/ledger-economy-001` | ledger | **approved** | 6 |  | review-coverage: ; review-general:  |
| 2026-09-24T22:18 | `agent-workflows/project-B-intel/intel-core-fixes/intel-core-fixes-001` | intel | **blocked** | 2 |  | intel: Restored intel-core-001's snapshot (9c1861e) excluding features/; git diff --stat against the snapshot printed; review-gene |
| 2026-09-24T22:22 | `agent-workflows/project-B-econ/ledger-economy-fixes/ledger-economy-fixes-001` | ledger | **approved** | 3 |  | review-coverage: ; review-general:  |
| 2026-09-24T22:44 | `agent-workflows/project-B-intel/intel-core-fixes-2/intel-core-fixes-2-001` | intel | **blocked** | 4 |  | intel: Restored intel-core-fixes-001's snapshot (2309421), which changed nothing outside the owned paths. P1: step.ts; review-cove |
| 2026-09-24T22:48 | `agent-workflows/project-B/encounters-online/encounters-online-001` | game | **approved** | 8 |  | game: Duels at sea inside the match room. Protocol v5: Buttons.Grapple (J, latched like E), duel-ready message, 'can; review-cover |
| 2026-09-24T23:00 | `agent-workflows/project-B-final/final-island/final-island-001` | world | **approved** | 4 |  | review-coverage: ; review-general:  |
| 2026-09-24T23:11 | `agent-workflows/project-B-intel/intel-core-fixes-3/intel-core-fixes-3-001` | intel | **blocked** | 6 |  | intel: Restored intel-core-fixes-2-001's snapshot (a18265e) without features/; the diff check printed nothing and eve; review-cove |
| 2026-09-24T23:49 | `agent-workflows/project-B-intel/intel-core-fixes-4/intel-core-fixes-4-001` | intel | **approved** | 3 |  | intel: Restored snapshot 037c658 (git diff --stat vs refs/workflow/ab4108408f3548e5/intel printed nothing; only owned; review-cove |
| 2026-09-25T00:22 | `agent-workflows/project-B/rubbings-theft/rubbings-theft-001` | game | **blocked** | 3 |  | game: Wired the objective ledger into MatchRoom (apps/server/src/MatchRoom.ts, new objectives.ts). A slice ledger is; review-cover |
| 2026-09-25T00:48 | `agent-workflows/project-B-flow/match-flow/match-flow-001` | flow | **approved** | 4 |  | flow: Built the pure §2 match lifecycle. packages/content/src/match has matchRules (400-tick ready check, 900-tick d; review-cover |
| 2026-09-25T01:49 | `agent-workflows/project-B/rubbings-theft-fixes/rubbings-theft-fixes-001` | game | **approved** | 4 |  | game: Restored rubbings-theft-001's snapshot (a9b0961) except features/; `git diff --stat` against it was empty befo; review-cover |
| 2026-09-25T01:54 | `agent-workflows/project-B-fruit/fruit-pedestals/fruit-pedestals-001` | fruit | **approved** | 5 |  | fruit: Built §9 fruit acquisition as pure integer rules. packages/content/src/fruits: FRUIT_EAT_SECONDS=3 (eatTicks 6; review-cove |
| 2026-09-25T02:33 | `agent-workflows/project-B/match-online/match-online-001` | game | **blocked** | 3 |  | game: Wired the pure match, claim and intel modules into MatchRoom so a private match can be played and won end to e; review-cover |
| 2026-09-25T03:54 | `agent-workflows/project-B/match-online-fixes/match-online-fixes-001` | game | **blocked** | 3 |  | game: Restored match-online-001's snapshot (2a47271, features/ excluded; diff --stat against it was empty before edi; review-cover |
| 2026-09-25T05:09 | `agent-workflows/project-B/match-online-fixes-2/match-online-fixes-2-001` | game | **approved** | 2 |  | game: Restored match-online-fixes-001's snapshot (ac3a5e8, owned paths only; git diff --stat against it was empty be; review-cover |
| 2026-09-25T11:25 | `agent-workflows/project-B/ruins-online/ruins-online-001` | game | **approved** | 5 |  | game: Wired the pure ruins into MatchRoom (protocol v8). Every source now starts locked (the rubbings-theft unlock-a; review-cover |
| 2026-09-25T13:43 | `agent-workflows/project-B/fruit-kits-online/fruit-kits-online-001` | game | **approved** | 5 |  | game: Wired §9's fruit into MatchRoom. pedestalSites puts one pedestal on each regular island at its highest-id dock; review-cover |
| 2026-09-25T15:51 | `agent-workflows/project-B/intel-online/intel-online-001` | game | **blocked** | 0 |  | game: intel-online in the room and the page. Server: apps/server/src/intel.ts (intelMessageOf: every intel kind mapp |
| 2026-09-26T08:05 | `agent-workflows/project-B/intel-online-review/intel-online-review-001` | game | **approved** | 3 |  | game: Restored intel-online-001's verified snapshot (bc53558, refs/workflow/cf66e7124fc568c7/game) into the worktree; review-cover |
| 2026-09-26T08:51 | `agent-workflows/project-B/economy-online/economy-online-001` | game | **approved** | 6 |  | game: Implemented economy-online in the worktree (uncommitted, as instructed). (0) Hold grace: WORLD_HOLD_GRACE_FRAM; review-cover |
| 2026-09-27T08:42 | `md-manager-workflows/viewer-ux-panels-lists/viewer-ux-panels-lists-001` | panels,lists | **** | 0 |  |  |
| 2026-09-27T08:51 | `md-manager-workflows/viewer-ux-panels-lists/viewer-ux-panels-lists-002` | panels,lists | **** | 0 |  |  |
| 2026-09-27T08:57 | `md-manager-workflows/viewer-ux-panels-lists/viewer-ux-panels-lists-003` | panels,lists | **approved** | 8 |  | review-coverage: ; review-general:  |
| 2026-09-28T08:16 | `agent-workflows/kleros-v2/shutter-reveal-justification/shutter-reveal-justification-001` | web | **approved** | 2 |  | web: Shutter/Reveal.tsx: removed the unused justification state and its two TODOs, and omitted justification from t; review-covera |
| 2026-09-28T10:25 | `agent-workflows/vea/veashi-vea-addresses/veashi-vea-addresses-001` | main | **** | 0 |  |  |
| 2026-09-28T10:32 | `agent-workflows/vea/veashi-vea-addresses/veashi-vea-addresses-002` | main | **approved** | 8 |  | main: Added testnet Vea addresses to @kleros/veashi-sdk, with the operator's design-challenge note applied. New: vea; review-cover |
