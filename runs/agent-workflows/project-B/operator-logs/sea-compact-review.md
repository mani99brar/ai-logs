# Review log: sea-compact (plus direct ledger/claim fixes)

## Operator answers (2026-09-24 ~17:05)
- Duel playtest: "works and it's good, can be smoother": combat spike passes; smoothness tuning deferred.
- Sea: "denser map and reduce the scale". Ledger defaults confirmed. Duel placement: assistant's choice, which is §14's duel-as-object inside MatchRoom for encounters-theft (DuelRoom stays as practice).

## Setup
- Stopped the dev servers (bgmcvx0rg); removed worktrees ~/dev/project-B-claim and ~/dev/project-B-world; ~/dev/project-B back on main; ~/dev/project-B-ledger reused on branch fix/ledger-claim.
- 90e9df4 on main: features/sea-compact plus CLAUDE.md (no pkill by pattern; acceptance items name their tests).
- 17:13 launched sea-compact-001 in its own Herdr tab (pane w5:p36).

## sea-compact-001
- 17:16 challenge attempt 1 paused (1 P1 + 5 P2). P1: turnRate is already the integer minimum (1 heading unit/step, 64 headings), so the turning circle can't be rescaled with speed. P2s: 3 tiles/s is 38.4 sub-units/step (not an integer); nothing checked that routes meet; the density metric and edge handling were unspecified; out-of-sight's 16-tile gap may fall off the canvas at 24 px; braking at a stop reverses the ship.
- Revised: maxSpeed 39 (3.05 t/s); 256 sub-units, 64 headings and turnRate 1 unchanged; handling judged on screen; a squared-Euclidean density validator (edge not counted); a `hub` point that every neighbour route passes within sight of; out-of-sight 12–13 tiles apart where the camera isn't clamped; the dock approach creeps with taps and releases keys at the hint; an optional sketch-to-.tmj script.
- Mistake: I committed the revision myself; resume refused ("moved past the run's base"). Soft-reset to 90e9df4 and resumed; resume committed f6b276d. **Lesson: edit the feature files but leave the commit to `workflow resume`.**
- 17:19:32 challenge attempt 2 running.

## Direct fixes (branch fix/ledger-claim, 4dbcf1c, on c1d1914)
- Ledger §12: a forfeit win never commits within its own tick (with nothing eligible, the window is 1 tick), so the opponent leaving on the same tick turns it into `cancelled` in either order. Before, the first leave named the winner and, with no eligible type, moved gold. Tests cover both orders and both cases (equal hashState), plus a later-tick leave still settling as a win.
- Claim: createClaimConfig refuses a non-positive subUnitsPerTile; duel-ended-without-theft lists players in id order (test input reversed to prove it); docs/claim.md signature.
- freshRumors clearing is left for the rumor system (no consumer yet).
- Typecheck OK; unit 532/532.
- Fast-forwarding main to it was denied by the auto-mode classifier ("merge without review"), so it waits for the operator.
- 17:23:17 challenge attempt 2 paused (1 P1 + 4 P2). P1: the sea keyboard (`KeyboardHelm`) polls held keys every 16.7 ms, so a quick E tap can be lost, **for players too**; the duel keyboard already records taps. P2s: a hub radius of 10 doesn't guarantee sight between routes (use sight/2); checking one rebuilt shortest path misses tied paths and other dock pairs (block the disc in Dijkstra for every dock pair); e2e helpers hard-code 16 px and speeds up to 64; rescaling the dock reach would shrink it below a tile; plan the out-of-sight clear row into the layout.
- Revised (no commit; resume committed 22e9eb0): the sea keyboard records taps (web unit test); sail-and-dock holds ahead+E on the dock's axis (an already-tested rule), no timed taps; hub disc sight/2 with a blocked-disc Dijkstra over every inter-island dock pair; helpers take numbers from TILE_PIXELS and shipTuning; waypoint legs checked for a clear line; dock reach ≥ 384.
- 17:23:53 challenge attempt 3 running.
- Operator: "workers should run on med effort with opus 5.5". md-manager had no effort option (the model comes from ANTHROPIC_MODEL; no --effort). Interrupting the running challenge to change it was denied by the auto-mode classifier, so I asked the operator.
- 17:27:52 challenge attempt 3 paused (1 P1 + 3 P2), which made the interrupt unnecessary. P1: docking on the dock's axis only moors when exactly aligned; off-axis the ship slides along the coast at full speed or grounds beside the dock with a corner-crossing path (so dockInReach fails). Adopted the challenge's alternative: aim into a shore corner at a fixed heading tilted toward the land, plus a unit test sweeping lateral offsets. P2s: decisions.md contradicted item 8 (fixed); the out-of-sight row runs parallel to a wall with turning room; hub sight stated for tile centres.
- md-manager (uncommitted): `WORKFLOW_WORKER_EFFORT` → `--effort <level>` on worker `--bg` sessions only (sessions.worker_effort; unknown levels refused; preflight requires --effort in `claude --help` when set). Tests: test_sessions (env parsing), test_interactive (worker gets it, reviewer doesn't). Both pass.
- 17:39:40 resumed with WORKFLOW_WORKER_EFFORT=medium; resume committed e2a80af; challenge attempt 4 running.
- Player-facing note from attempt 3: a player arriving at a dock diagonally with ahead+E held slides along the coast above dockMaxSpeed and never moors. Worth a later docking-feel fix (not in this feature's scope).
- 17:45:11 challenge attempt 4 **passed** (4 P2): the corner approach needs the hull to start on the open side with room to drift (the sweep should cover sailTo's real arrival band and speeds); keep today's handling numbers as a named baseline in the test; one hand-built layout carries many coupled constraints (generate it from a quadrant sketch).
- 17:45:11 worker `world` launched; its claude process runs with `--effort medium` (verified in /proc cmdline), model from ANTHROPIC_MODEL=claude-opus-5-5.
- Operator approved; merged fix/ledger-claim into main with --no-ff (c4c3e81, in ~/dev/project-B-ledger, which now has main checked out). Typecheck OK, unit 532/532. sea-compact touches none of these files.
- 19:13:48 worker handed off after ~88 min at medium effort (revision dc6d996); verify_world attempt 1 running. Worker report: 111×111 tiles from a mirrored ASCII quarter (sketch.ts → .tmj), midline shoal walls open only in the hub disc; neighbours 26.4 s, longest crossing 39.3 s, first dock ≤ 7.3 s, largest obstacle distance 9.9 tiles, 90.7 % open sea (was 99.2 %). Tuning: maxSpeed 39, accel 3, braking 3, drag 1, dockMaxSpeed 15, dockRadius 384; handling within 25 % of the old at 16 px; a docking sweep always moors. TILE_PIXELS 24 as a content constant; the sea keyboard latches E taps; createTestPlacementSchema(bounds) replaces the fixed schema. Worker-run checks: unit 548, integration 37, build, browser 6/6, sea.spec ×5 10/10 at load 6–8.
- Worker's observed-not-fixed note: a page stall over 250 ms lapses input to neutral, which resets mooredThrottle, so a moored ship casts off if ahead stays held after E is released. **Player-facing docking issue for a later fix.**
- Untested (by the worker's own account): the E tap latch with real DOM events in a browser.
- 19:20:08 verify_world attempt 1 passed (≈6 min, load ~3 after the operator's other workflow finished); browser and build deferred to the candidate.
- 19:26:09 candidate 8328920 passed (build + browser 6/6). Reviewers launched at 19:26 and finished in about 3 min each.
- 19:29 **general approved** (P2s: the tap unit test bypasses DOM events and blur doesn't clear the latched tap; sketch.ts has no drift check against the .tmj; the >250 ms stall cast-off). **Coverage blocked** with 2 P1s, both test-only:
  1. Nothing tests the ≤ 112 × 112 map ceiling.
  2. simulation.test.ts:339 `dockRadius >= BEFORE.dockRadius` is vacuous (BEFORE spreads the current config), so nothing pins the ≥ 384 reach.
  Coverage P2s: map:build printing untested; the tap test skips keydown/keyup dispatch; the 5-repeat stability is only the worker's claim; visibility.test.ts:83 still uses `3 * 64` (old speed).
- Controller: "Non-retryable graph failure", exit 1 (the normal ending for a review block). My background watcher's match missed these events, so the report was about 25 min late.
- Logs moved here from the retired session scratchpad.
- 19:58 /loop monitoring started at the operator's request (Monitor bsl39leuf watches every project-B run's events.jsonl, new runs included). Current: sea-compact-001 blocked at review since 19:29; waiting for the operator: direct fix or sea-compact-fixes.
