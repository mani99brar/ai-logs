# Review log: duel-core-001 and world-sea-001 (parallel)

- duel-core-001: `~/.local/state/agent-workflows/project-B/duel-core/duel-core-001` (source `~/dev/project-B`, lane `duel`)
- world-sea-001: `~/.local/state/agent-workflows/project-B-world/world-sea/world-sea-001` (source `~/dev/project-B-world`, lane `world`)
- Base for both: `main` at `b8f4c37`/`30f49b4` (the feature files are identical in both).

## Timeline

- 11:07:05 duel-core challenge attempt 1 started.
- 11:07:34 world-sea challenge attempt 1 started.
- 11:08:54 duel-core challenge attempt 1 **paused**: P1, the build smoke step can't prove the new subpath exports (the `scripts/smoke-build.ts` export list is hard-coded, and `scripts/` isn't owned), plus six P2s.

## Decisions taken for the operator (asleep; standing instruction "keep it running and finish")

1. **duel-core P1 → `postbuild` self-checks** in `packages/simulation/package.json` and `packages/content/package.json` (owned) that import the new subpaths from `dist/` without the source condition. It isn't solved by owning `scripts/` because `resume` can't change the policy (a new run would be needed) and `world-sea` owns `scripts/`.
2. **`test-tools/replay` dropped for now.** The replay is a pure `replayDuel` in `simulation/duel`, with the log's zod schema in `content/moves`. `test-tools` depending on `simulation` would change the lockfile, which `world-sea` owns. This departs from §17's "test-tools: replay runner" until `duel-online`.
3. Adopted the challenge's simpler collision data: one hitbox per move, one hurtbox per stance.
4. Same-frame rules decided (the spec leaves them open): detect against start-of-frame state and apply together; throw vs throw breaks both; an active strike beats a throw in startup or active; stamina from start of frame; a mirrored symmetry test.
5. The duel input carries held-direction bits, so the step resolves left+right → neutral; baseline timings come from `baselineFrameBudgets`; `MOVESET_VERSION` goes in the state.
6. After both runs are approved, I plan to merge both into `main` (fast-forward the first, merge the second, resolving any `smoke-build.ts` list conflict by adding the duel subpaths). No push.
- 11:10:37 world-sea challenge passed (7 P2); worker launched 11:10:41. P2s worth noting at merge time: the lane may refactor simulation modules duel-core imports; the map scale implied by travel times; playerCount becomes 'visible ships' under StateView.
- 11:12:57 duel-core challenge attempt 2 passed (8 P2); worker launched.
- 11:37:26 duel-core worker handed off (revision 7282786, ~24 min); verify_duel attempt 1 running. Review subagent started on the diff 2618056..7282786.
- 11:38:36 verify_duel attempt 1 passed.
- 11:38:36 verify_duel passed: unit 183, integration 14; `postbuild` self-checks load `simulation/duel` and `content/moves` from `dist/`. 11:39:47 candidate `a23b8a2` passed; reviewers general `f8f4d26c` and coverage `a005ee3d` running.

### Subagent review of duel diff `2618056..7282786`: approve after two P1 fixes (both confirmed in the code)
- **P1 throw input**: `step.ts:363-369` starts a jab as soon as `light` is buffered alone, so J then K 1–2 frames later is a jab and never a throw (the subagent reproduced it). The buffer helps only while the fighter can't act. Fix: hold a lone light or heavy on a free fighter for a 1–2 frame chord window; test J→K at 1 and 2 frames.
- **P1 whiff beats throw**: `step.ts:73-74` uses `strikeActive` (`step.ts:196-201`, "whether or not it reaches"), so a jab facing away cancels a connecting throw (reproduced). Fix: cancel the grab only when the strike's contact is a hit or block; test a facing-away or out-of-range active strike.
- P2: `separate()` tie-break keyed to slot 0 when x and facing are equal (`step.ts:417`); `MOVESET_VERSION` hand-maintained (`"duelist-1"`), so a hash is better; `restoreDuel` checks only the top-level shape; `DuelMove` types duplicated beside the zod schemas with `as` casts; three `as unknown as Pair` casts; the symmetry test doesn't assert that its trade happened; `docs/duel.md` doesn't mention the counter slash's invulnerability or same-frame J+K.
- Strong: the punish test is at maximum reach (corner and midscreen, exact 1343 limit); start-of-frame detection with results applied together; no phantom dependencies (no zod in simulation); real `postbuild`; only `Math.max/min/abs`; every §7 rule tested; the deep-freeze no-mutation test; replay refuses a foreign moveset or start frame.

**Decision 7**: the two P1s go into a follow-up feature `duel-core-fixes` (like `skeleton-fixes`) launched after this run finishes, so they're verified and reviewed, instead of hand-editing reviewed code. If the official reviewers block on them first, the same follow-up applies.
- 11:45:16 **duel-core-001 approved by both official reviewers and integrated** (`feature/duel-core/duel-core-001` → `a23b8a2`). They missed both P1s above but flagged: the `separate()` slot tie-break, shallow `restoreDuel`, a guard break *setting* stamina to 30 (§7 says "restores 30"), the opening-hit validator ignoring `advance`, a weak guard-break test, and the untested `postbuild` failure path.
- **Decision 8**: fast-forwarded `main` to `a23b8a2` (duel-core only; no push).
- **Decision 9**: committed `features/duel-core-fixes` (`3e40bcf` on `main`) with 11 findings (2 P1 + 9 P2) and launched duel-core-fixes-001 from `~/dev/project-B`. Throw input is fixed by **converting** a just-started light/heavy into a throw when the partner button arrives within a 1–2 frame chord window, which keeps §8's startups; I rejected delaying the lone button because it would add 1–2 frames to every jab. A guard break *adds* 30 stamina, capped.
- 11:50:41 duel-core-fixes challenge passed (7 P2); worker launched 11:50:44.
- 11:52:40 world-sea worker handed off (revision 509e888, ~42 min); verify_world attempt 1 running. Review subagent started on b8f4c37..509e888 with a merge-risk check against duel code already on main.
- 11:54:50 verify_world attempt 1 passed.
- 11:54:50 verify_world passed: unit 131, integration 21, browser 4/4 (`join-private-match`, `two-ships-sync`, `sail-and-dock`, `out-of-sight`). 11:56:59 candidate `4301c77` passed; reviewers general `7545a864` and coverage `dc531d72` running.

### Subagent review of world diff `b8f4c37..509e888`: approve, no P0/P1
- **Merge risk: none.** Duel code imports only `canonicalize`, `hashState`, `nextInt`, `clampInt`, `divTrunc`, `baselineFrameBudgets`, `moveTimingSchema`, `MoveTiming`, `formatIssues` and `ValidationResult`; the world diff leaves all of them unchanged (it only appends `privateMatch` to `rules.ts` and `export *` lines to the barrels). `git merge-tree a23b8a2 509e888` is conflict-free (tree `7e257d0`), and the merged tree typechecks and passes unit 228/228 and integration 21/21 (run on a scratch `git archive` copy).
- Visibility: `ships: t.map(ShipSchema).view()`, a `StateView` per client, `updateViews` after every mirror; the integration test checks decoded state, views **and raw WebSocket bytes**. The player count moved to a public `players` field, so the HUD, admission tests and smoke test still mean players.
- Map: Tiled `.tmj` → `scripts/build-map.ts` (with `--check`) → `content/src/maps/sliceSea.ts`; the drift test uses Vite `?raw` imports, so no `fs`. Measured neighbours 22–23 s, longest crossing 54 s; integer octile Dijkstra with no corner cutting.
- Sailing: a literal quarter-cosine heading table (64 headings, fits uint8), an axis-separated sweep with no tunnelling (tested at 5 tiles/step and with a random helm).
- Tests: closed-loop e2e (`sailTo` steers from the HUD readout); test placement via `POST /__test/place`, only in `dev.ts` behind `PIRATE_SEA_RACE_TEST_PLACEMENT=1`, 404 on production (tested). Protocol 2 → 3; admission untouched.
- P2s: **the map is 224×208 tiles and 99.2% sea** (four small islands in the corners, because 5 tiles/s was kept), so ships will rarely meet with a 10-tile sight radius; §3 says to remove empty stretches. This is **a design issue for the next world slice** (faster ships or a denser layout). The dock snap skips the collision sweep and can cut a diagonal corner; `testPlacement` hard-codes `max(63)`; the validator hard-codes 256/362; the smoke test repeats `/__test/place`; `§` became `§` in `apps/server/package.json`; `headlessClient` wraps an SDK internal (`connection.events.onmessage`).
- 11:59:56 **world-sea-001 blocked by the coverage reviewer.** P1: nothing proves the client draws the tile map (`SeaScene.createTerrain` is never read back). P2: the fog is checked only once, at spawn. The general reviewer was stopped before a verdict (the first block decides), so **the world code never got a general review**.
- **Decision 10**: `world-sea-fixes` starts from world base `b8f4c37`, and the worker restores snapshot `509e888` (`refs/workflow/e467a18ef3280d1e/world`) as step one. The new reviewers therefore see the whole world diff plus the fixes (unlike `skeleton-fixes`), because no general review ever covered the world code. Scope: the coverage P1 and P2 plus my subagent's six P2s. The map scale stays and is deferred as a design issue. Committed as `548ce94` on `world/base` in `~/dev/project-B-world` and launched about 12:05.
- 12:03:39 world-sea-fixes challenge passed (6 P2); worker launched 12:03:42.
- 12:07:06 duel-core-fixes worker handed off (revision 2de63c0, ~16 min, 14 files +684/-212). Checked by hand: `chordThrow` converts a started light/heavy into the throw within `throwChordFrames` (frames carried over, so §8 startups keep); a grab is cancelled only by `strikes(contact)` (hit or block); the version is derived in `content/moves/version.ts`; `restoreDuel` validates every field. verify_duel attempt 1 running.
- 12:08:04 verify_duel (fixes) passed; 12:09:01 candidate `7fad3f2` passed; 12:13:41 **duel-core-fixes-001 approved by both reviewers and integrated.** Open P2s, none blocking: the validator doesn't check the throw's own startup against the chord window (an edge case); `z.infer` types lost `readonly`; `restoreDuel` range coverage is partial; a full tie leaves pushboxes overlapping (accepted and documented, the cost of slot-neutrality).
- **Decision 11**: fast-forwarded `main` to `7fad3f2`. **Slice 1 (duel core) is done on `main`.**
- 12:18:10 world-sea-fixes worker handed off (revision 2af7b75, ~15 min). On top of snapshot 509e888: 15 files +247/-34, including real canvas-pixel terrain checks (`tileColourShare` at land, shoal and dock tiles), minimap fog pixels from a screenshot (`minimapShows`), a shared `palette.ts`, a dock snap sweep with a test, the heading limit tied to HEADING_COUNT, derived tile costs, the route constant, § restored, the SDK hook guarded. The full review diff is 59 files (the whole world feature plus fixes). verify_world attempt 1 running.
- 12:20:25 verify_world (fixes) passed; 12:22:33 candidate `474f0e4` passed (a read-only `merge-tree` with main was conflict-free); 12:26:24 **world-sea-fixes-001 approved by both reviewers (a full general review of the world code this time) and integrated.** Open P2s: the smoke script hard-codes the env name `PIRATE_SEA_RACE_TEST_PLACEMENT` instead of `TEST_PLACEMENT_ENV`; the SDK-hook guard's failure branch is untested.
- **Decision 12**: merged `feature/world-sea-fixes/world-sea-fixes-001` into `main` with `--no-ff` (`ad38447`); no conflicts.
- **Decision 13**: added `@pirate-sea-race/content/moves` and `@pirate-sea-race/simulation/duel` to `scripts/smoke-build.ts` and widened its dist check to subdirectories (the old regex would have rejected `dist/duel/index.js`). Committed `e9fd862` on `main`.
- **Final check on merged `main` (`e9fd862`)**: `npm ci`, typecheck, unit **271/271**, integration **21/21**, build (smoke: 8 exports from `dist/`, match created, no test placement in production), browser **4/4**. All green. Nothing pushed.

## Done: slices 1 and 2 are on `main`

Follow-ups for the operator:
- **World map is 99.2% empty sea** (224×208 tiles at 5 tiles/s): ships rarely meet with a 10-tile sight radius. Decide ship speed or map density before `encounters-theft`.
- Open P2s across the runs (none blocking): the duel validator doesn't check the throw's own startup against the chord window; duel types lost `readonly`; `restoreDuel` range coverage is partial; the smoke env-name literal; the SDK-hook guard's failure test; the duel replay isn't in `test-tools` yet (`duel-online`).
- `docs/architecture.md` (world-owned) doesn't list the duel packages yet; `docs/duel.md` covers them.
- Cleanup when convenient: the branches `feature/*` (6), `skeleton/candidate-001` and `world/base`; the worktree `~/dev/project-B-world` (`git worktree remove`); the old run workspaces under `~/.local/state/agent-workflows/`.
