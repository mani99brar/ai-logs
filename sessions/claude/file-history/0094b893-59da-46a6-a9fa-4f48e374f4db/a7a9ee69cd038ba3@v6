# Review log: skeleton-001

Run: `~/.local/state/agent-workflows/project-B/skeleton/skeleton-001`
Worker worktree: `worktree-game` (lane `game`, session `756cafa6`)
Base: `313eb87`. Checked every ~6 minutes; newest entry last.

## Watch list (from the design challenge, attempt 3: passed with 8 P2)

The worker prompt does not include these concerns, so each tick checks whether the code runs into them.

1. **filterBy with a server-generated code**: the listing field must be set in `onCreate` (`this.listing.code`/`setMetadata`), no `setPrivate()`. Distinct errors needed for an unknown code and a full room.
2. **Resolution without a build**: workspace `exports`/`main` must not point only at `dist/`, because typecheck, unit, integration and Playwright run before `build` in a clean worktree.
3. **Colyseus versions move as a set**: `colyseus`, `@colyseus/schema` and `@colyseus/sdk` must share a major line; no mixed 0.16/0.17.
4. **Schema decorators vs `useDefineForClassFields`**: field initialisers can silently kill patches; prefer `schema()`/`defineTypes`, or check the tsconfig and transform.
5. **Purity enforcement**: `types: []` in the pure packages' tsconfig, plus a source scan for `Math.random`, `Date.now`, `performance`, timers (not imports only).
6. **Spawn/clamp flakiness**: spawn slots well inside the map; tests move toward the centre; the determinism "one-input change" must land on a world step.
7. **"Both ships drawn on the canvas"**: needs a test hook or Canvas renderer, not WebGL pixel reads.
8. **Playwright `reuseExistingServer`** on fixed ports can test stale servers.

## Ticks

### 08:52 UTC: tick 1

- State: challenge passed 08:50:49; worker launched 08:50:53, `working`. Controller PID 3242976 supervising.
- Worktree: no commits, no files yet beyond the base. The worker has read `CLAUDE.md`, the spec sections §1–2, §8, §14–18, the feature files and `../policy.json`, and is checking the npm registry for current versions.
- Nothing to review yet.

### 08:59 UTC: tick 2

- State: worker `working`, no commits. Untracked: `.npmrc`, root `package.json`, `package-lock.json`, six workspace `package.json` files. `npm install` has run. No source files, tsconfigs or scripts yet.
- Pins (all exact, `save-exact=true`): TypeScript `7.0.2`, Vite `8.3.0`, Vitest `5.0.1`, Phaser `4.2.1`, `colyseus` `0.18.8`, `@colyseus/sdk` `0.18.4`, `@playwright/test` `1.63.0`, `zod` `4.6.5`, `tsx` `4.23.15`, `@types/node` `24.13.6`.
- Good:
  - Workspaces match §17 exactly, scoped `@pirate-sea-race/*`, all `private`, all ESM (`"type": "module"`).
  - Watch 3 is fine: server and SDK are both on the 0.18 line (the spec's §20 note asks for 0.18+).
  - `zod` for protocol and content validation is the "use existing tooling" decision in practice.
  - `.npmrc` has `engine-strict`, `audit=false` and `fund=false`, which keeps `npm ci` quiet and deterministic.
- Watch:
  - **TypeScript 7 (the native Go compiler)**: check that the options the code relies on still exist there (legacy `experimentalDecorators` for Colyseus `@type()`; watch 4). Prefer `schema()`/`defineTypes`.
  - **The `colyseus` meta-package** pulls in a large tree (`@better-auth/*`, `playground`, `monitor`, `redis-driver`, `redis-presence`, `uwebsockets-transport`). The skeleton needs only `@colyseus/core`, `@colyseus/ws-transport` and `@colyseus/schema`. This is a heavier `npm ci` and a bigger attack surface; it's a minor finding unless install time matters.
  - **A likely phantom dependency**: `apps/server` doesn't declare `@colyseus/schema`, which it will import for state. It resolves only through hoisting. Declare it explicitly with the same pin the lockfile resolves.
  - **Watch 2 is still open**: no `exports`/`main` in any workspace yet.
  - `packages/test-tools` declares no dependencies yet. A headless client will need `@colyseus/sdk` and `@pirate-sea-race/protocol`.

### 09:06 UTC: tick 3

- State: worker `working`, still no commits. The three pure packages, their tests, `tests/unit/purity.test.ts` and the root configs are written (about 1,100 lines). The `apps/server` and `apps/web` sources and `packages/test-tools` aren't written yet.

**File structure**
- Each package has `src/` with one file per concept (`config`, `fixed`, `random`, `input`, `state`, `step`, `hash`), a barrel `index.ts`, one colocated `*.test.ts`, and `tsconfig.json` (typecheck, `noEmit`) plus `tsconfig.build.json` (emit to `dist`, tests excluded). This layout is consistent across all packages.
- Dependency direction: `simulation → content`; `protocol` and `content` are leaves. Server → all three. There are no cycles.
- One odd placement: `privateMatch` (players 1–8, custom) lives in `content/src/sea.ts`, and the shared `ValidationResult` and `formatIssues` live in `rules.ts` and are imported by `frameBudgets.ts`. A `match.ts` and a `validation.ts` would read better. It's minor.

**Watch list**
- **Watch 2 (build-free resolution) is solved well.** Every workspace exports a custom condition `"@pirate-sea-race/source": "./src/index.ts"` ahead of `types`/`default` (dist). `tsconfig.base.json` sets `customConditions`, `vitest.config.ts` adds the condition for client and SSR, and the server's `dev`/`start:source` pass `--conditions` to `tsx`. The build tsconfigs reset `customConditions: []`, so `dist` compiles against built `.d.ts` files. That means `npm run build` must build packages in dependency order; the workspace list is already in topological order. Still to check: `apps/web/vite.config.ts` must add the same condition, and Playwright must use `start:source`/`dev`, not `start`.
- **Watch 5 (purity) is solved.** `types: []` in the base and every pure tsconfig, `lib: ["es2024"]` with no DOM, and the test checks this. The test also scans imports, manifests and globals (`Math.random`, `Date.now`, `new Date`, `performance.now`, timers, DOM globals, `crypto` randomness) with comments and strings stripped, and it has a self-test of samples. Gaps: it's regex-based, so it misses aliasing (`Math["random"]`, `globalThis.setTimeout`) and bare references (`const t = setTimeout;`). The standard tool for this is ESLint's `no-restricted-imports`/`-globals`/`-properties`, but no lint check exists in the policy, so this is acceptable as is.
- **Watch 6 (spawn/clamp flakiness) is partly open.** Slots sit 3–4 tiles from the edges (for example `(3,16)` is 896 sub-units from the left edge). At 64 sub-units per world step, a ship hits the edge after 0.7–0.9 s of holding toward it. The unit test for "one input changes the hash" is safe (vx/vy are in the state, so the hash differs even if a ship is clamped). The e2e `two-ships-sync` test must move toward the centre or for well under 0.7 s.
- **Watch 3**: still fine. `apps/server` now declares `@colyseus/schema` `5.0.34`, so the tick-2 phantom dependency is fixed.

**Code quality**
- `packages/simulation` is written as a pure reducer: `step(config, state, inputs) → state`, with config injected (no module globals) and no mutation (tested). All numbers are integers, enforced at hash time: `canonicalize` throws on any non-safe-integer. Diagonals use `isqrt` (Newton's method), and the RNG is mulberry32 with its state kept in `MatchState.rng`. This matches the fixed-point decision exactly.
- `hashState` is 64-bit FNV-1a over a canonical, key-sorted serialisation using `BigInt`. That's slow per character, but it's used only in tests and replays.
- Protocol: zod `strictObject` schemas are the single source of types (`z.infer`). Validation returns a tagged result (`oversized | malformed | stale-sequence | future-frame`) rather than throwing, and size is checked before parsing. The constants follow the spec: `MAX_INPUT_LEAD_FRAMES = 30`, `INPUT_HOLD_FRAMES = 15` (§15's 250 ms), and refusal codes 4101–4104 with readable messages, including a distinct `MatchFull`, which addresses watch 1's error part.
- Content: `as const satisfies` data tables validated by zod with cross-field `superRefine` rules. Rubbings must equal islands × sources and divide evenly by type; on-block disadvantage can't exceed active + recovery. §8 and §18 are covered faithfully.

**Recurring patterns**
- Tagged `{ ok: true, … } | { ok: false, … }` results at trust boundaries; `RangeError`/`Error` for programmer errors inside the simulation. The split is consistent.
- Doc comments cite spec sections (§2, §8, §15–18), which gives good traceability.
- ESM with `.js` import suffixes, `verbatimModuleSyntax`, `import type`, `noUncheckedIndexedAccess` (hence the `!` after `free[...]` and `spawnSlots[...]`).

**Findings (minor)**
1. **Off-by-one at the map edge**: `mapBounds` makes positions inclusive up to `widthTiles * subUnitsPerTile`. A ship clamped to `maxX` then has `tileX === widthTiles`, one tile outside the map. It should be `… - 1`.
2. **`headingOf` builds its lookup object on every call**, for every ship on every world step. Hoist it to a module constant or index an 8-entry array.
3. **Axis handling differs by layer**: the protocol rejects axes outside [-1, 1], while `quantizeAxis` clamps. That's fine as defence in depth, since both are tested.
4. **`maxPlayers` is defined twice**: `privateMatch.maxPlayers` and `rulesPresets.*.maxPlayers`. The server should read one of them.
5. **`MAX_INPUT_MESSAGE_BYTES` measures the re-encoded JSON of an already decoded message.** A huge raw frame is still decoded by Colyseus first. Check whether the server also caps the transport payload (for example the ws `maxPayload`).

### 09:14 UTC: tick 4

- State: worker `working`, still no commits. Everything is now written: `apps/server` (8 files), `apps/web` (10 files, plus `index.html` and `style.css`), `packages/test-tools/headlessClient.ts`, `tests/integration/match.test.ts` (8 cases) and `tests/e2e/{playwright.config,private-match.spec}.ts`, about 1,550 new lines. It hasn't produced a `README.md`, `docs/architecture.md`, the `assets/` and `infra/` READMEs or the root npm scripts yet.

**Watch list, all eight now addressed**
- **Watch 1, filterBy with a code generated in `onCreate`.** `onCreate` calls `setMatchmaking({ metadata: { code, custom } })`, and the room is registered with `defineRoom(MatchRoom).filterBy(["code"])`. I checked `@colyseus/core` 0.18.16 `matchmaker/LocalDriver/Query.mjs`: `applyFilter` falls back to `room.metadata[field]` when the listing has no top-level field, so this works with the local driver. A Redis or other driver may not do this; that's deferred with deployment. For full versus unknown, the static `onAuth` → `authorizeEntry` queries the listing first and throws a distinct `MatchFull` (4103) or `NoSuchMatch` (4102) with readable text. Two players racing for the last seat can still get Colyseus's generic `MATCHMAKE_INVALID_CRITERIA`, which the client maps to "No match with that code". That's rare but misleading.
- **Watch 4, decorators.** Solved by using `schema({...}, "Ship")` with `t.int32()` and similar; there are no decorators, so TS 7 and `useDefineForClassFields` don't matter.
- **Watch 7, "both ships drawn".** The scene writes what it actually drew to `data-drawn-ships` each frame. The e2e test also takes a Playwright element screenshot of `#game canvas` and checks pixels. That's a compositor capture, so it works under WebGL without `preserveDrawingBuffer`. It's a good two-layer design.
- **Watch 8, stale servers.** `reuseExistingServer: false` on both web servers.
- **Watch 2, no prior build.** The server starts via `start:source` (tsx with the source condition). The web client runs `vite build && vite preview`, a real production bundle built inside the web server command. `/__healthcheck` exists in `@colyseus/core` `router/index.mjs`, so the readiness URL is valid.
- **Watch 6, clamp flakiness.** e2e sails toward `MAP_CENTRE_X` and polls with `expect.poll` for more than one tile of movement. The integration test holds `moveX: 1` for 600 ms (about 768 sub-units). From the rightmost slot `(44,16)` the edge is 896 sub-units away, so it passes, but only by a small margin. It should also pick a direction toward the centre.
- **Tick 3's finding 5 (transport cap) is resolved**: `WebSocketTransport({ maxPayload: 4096 })`, plus `maxMessagesPerSecond = 240` as the disconnect ceiling above `InputGate`'s drop-at-60 cap.

**File structure**
- Server: `MatchRoom.ts` (room and `authorizeEntry`), `inputGate.ts` (per-client validation, rate cap and hold, unit-tested), `schema.ts`, `matchCode.ts`, and `server.ts` (`startGameServer({ port: 0 })` for tests) separate from `main.ts` (the process entry). Separating the testable factory from the entry point is the right pattern.
- Web: one module per concern: `connection` (SDK), `keyboard` (input adapter), `inputSender` (sequencing and frame estimate), `interpolation` (`SnapshotBuffer`), `matchView` (client model), `hud` (DOM), `seaScene` (Phaser) and `main` (wiring). Phaser is confined to `seaScene.ts`, and everything else is unit-testable without a canvas.
- Coupling: `apps/web` and `packages/test-tools` list `@pirate-sea-race/server` as a devDependency for `import type { MatchStateSchema } from "@pirate-sea-race/server/schema"` (a type-only import; the SDK decodes by reflection). This follows the decision that Schema lives in the server, but it makes the client depend on the server app at typecheck time. If the schema grows, moving `schema.ts` into its own small package (`packages/state-schema`) would avoid that. That package isn't pure, because it imports `@colyseus/schema`.

**Code quality**
- `InputGate` is a clean state machine: rate window in match frames (not wall-clock), validation delegated to `protocol`, the held input quantised once, lapsing to neutral after `INPUT_HOLD_FRAMES`, and `dropped` counters per reason for tests.
- `MatchRoom.mirror()` updates the Schema in place: it creates missing ships, updates x/y/heading, and deletes departed ones. Colyseus then sends minimal deltas. `patchRate` is 50 ms (20 Hz) and the simulation runs on `setFixedTimestep(…, 60)`.
- Client: `InputSender` sends on change plus every 100 ms while held (inside the 250 ms hold), and tags frames with `patchedFrame + elapsed`, capped at half of `MAX_INPUT_LEAD_FRAMES`. `KeyboardAxes` implements §8's "both directions = neutral", ignores keys while typing and clears on `blur`. `SnapshotBuffer` interpolates 100 ms behind without extrapolating.

**Recurring patterns (new this tick)**
- Dependency injection for testability: `generateMatchCode(pick = randomInt)`, `InputChannel` for the sender, `now` passed in rather than read, `startGameServer({ port: 0 })`.
- `data-testid` attributes on every HUD field plus `data-*` readouts, so tests read semantic hooks rather than text or pixels alone.
- Every loop that needs to wait uses polling (`HeadlessClient.waitFor`, `sleep(20)`). That fits a library that doesn't depend on Vitest, but the integration tests could use `vi.waitFor` or `expect.poll` directly, as the e2e test does with `expect.poll`.

**Findings**
1. *(minor, duplication)* `seaScene.ts` rebuilds the colour string by hand (`` `#${slotColor(...).toString(16).padStart(6, "0")}` ``) although `matchView.ts` exports `cssColor()` for exactly that.
2. *(minor)* `renderHud` rebuilds every `<li>` on every state change (20 Hz). That's fine for 8 ships, but a keyed update would avoid churn and keep focus stable.
3. *(minor)* `main.ts` polls the keyboard with a 60 Hz `setInterval` alongside Phaser's own loop. Driving `sender.update` from `SeaScene.update` would use one clock.
4. *(low risk)* `allocateCode` has a check-then-set gap: two rooms created at once could draw the same code between `matchMaker.query` and `setMatchmaking`. With 36⁶ codes this is negligible for now.
5. *(test robustness)* The integration movement test should move toward the centre, as the e2e test does (see watch 6).
6. *(unrelated to this code)* `MatchRoom.droppedInputs()` is a test-only accessor on the production class. It's harmless, but the `dropped` counters could equally be reached through the gate.

### 09:22 UTC: tick 5. Worker finished; verification BLOCKED by the controller's test-output parser

- Timeline: the worker completed (commit `5c1a734` "Workflow skeleton-001: game"), and the freeze stopped it and captured snapshots at 09:19:13. `verify_game` attempts 1 and 2 both came back `blocked` with "unit: no passing test evidence or failed tests; integration: no passing test evidence or failed tests". Because the failures were identical, the supervisor stopped at 09:21:32 as "not transient". The packet is `verification/worker/game/2/packet.json`.
- **The code passes everything.** In the verifier's clean worktree, `check-1.log` shows Vitest `unit`: 6 files, **70 passed**; `check-2.log` shows `integration`: **8 passed**. `typecheck` and `build` passed. `browser` passed 2/2 with both scenarios and screenshots (`join-private-match`, `two-ships-sync`). The block is purely about evidence: `tests: null` for unit and integration.
- **Root cause**: `~/dev/md-manager/workflow/checks.py` `text_test_counts()` understands only Python unittest (`Ran N tests … OK`) and Node's built-in test runner summary (`# tests N`, `# pass N`, `# fail N`, `# skipped N`, or the same with `ℹ`). RUNBOOK line 198 documents this: "Unsupported/custom test reporters produce missing test evidence and block rather than infer success". Vitest prints `Tests  70 passed (70)`, and even Vitest's built-in `tap` reporter prints only `1..N` and `ok` lines without that summary. Nothing in `game-task.md` told the worker about this format, so a Vitest-based feature was bound to fail this way.
- **Lessons for future features**: a task that names a test runner must also say which summary format the verifier needs. Or the controller should support the runners it will actually meet (Vitest and Jest are the obvious ones for TypeScript).

**Final review of the rest of the delivery**
- Docs: `README.md` (39 lines). `docs/architecture.md` (27 lines, within the one-page limit) maps each workspace to its §14 component, lists the rules the code keeps (purity, integers, one clock, server-only writes, joining, rendering) and the toolchain. It says no package fell back to a previous major. The `assets/source`, `assets/exported` and `infra` READMEs each say what will go there.
- `CLAUDE.md`: only the commands line changed, as the task required. `.gitignore` adds `*.tsbuildinfo`.
- The refusal codes changed since tick 3 to HTTP-like values (`BadRequest 400`, `NoSuchMatch 404`, `MatchFull 409`, `ProtocolMismatch 426`), and `architecture.md` agrees.
- The root scripts are conventional: `typecheck` runs the root `tsc` plus every workspace; `build` runs `npm run build --workspaces` (in topological order); `dev` uses `concurrently` for server and web; `test:e2e` is an alias for the policy's browser command.
- An operational note the worker recorded: `colyseus` pulls `uWebSockets.js` from GitHub as a peer dependency, so `npm ci` needs github.com as well as the registry. That's another reason to depend on `@colyseus/core` and `@colyseus/ws-transport` rather than the `colyseus` meta-package (tick 2).
- The earlier minor findings are still open: the map-edge off-by-one, `headingOf` building its table on every call, the duplicated `cssColor`, and the integration movement direction. None of them blocks the run.
