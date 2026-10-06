# Task: game

## Goal

Complete the slice's small economy (§11), so gold creates route choices. Floating **supply crates** at sea pay 25 gold to the first ship that reaches each one. A **dockside shop** at every island sells a **sail tonic** (30 gold) and the targeted rumor that `intel-online` already sells. A tonic, drunk at sea, gives +10% sailing speed for 12 s. You can carry at most two tonics and only one works at a time; you can't drink one while grappled or in a duel, and a lost duel doesn't take your tonics. With this feature the §18 stage-2 slice is complete. The pure rules are on `main` (`packages/simulation/src/objectives`: `grantGold`, `purchase`, `useTonic` and the tonic state; `docs/objectives.md` "Economy"). This feature wires them in.

## Context

- Read `docs/spec.md` §11 (all of it), §3 (loot) and §16 (idempotent purchases).
- Read `docs/objectives.md` (Economy: grants with keys, `purchase` with per-player request ids and kept refusals, tonics and their limits, the gold identity `checkLedger`), `docs/architecture.md` (the room, test hooks and timings, and the intel purchase flow that `intel-online` added), the sailing step (`packages/simulation/src/step.ts`, `sailing.ts` in content) and how the web client draws the sea and HUD.
- The verifier runs `npm ci`, then `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run build` and `npx --no-install playwright test --config=tests/e2e/playwright.config.ts`.
- **This machine is shared by several runs. Never stop processes by name pattern (`pkill -f`, `killall`, and so on). Stop only the PIDs you started.**

## Constraints

- Owned paths as in `policy.json`. The pure ledger module and its content aren't owned: use them through their exports, and report `blocked` naming the gap if a change is truly needed. The sailing step is owned (`packages/simulation/src/step.ts`, `state.ts`, `config.ts`), and the tonic's speed change goes there, kept pure and integer (for example 110/100 of the speed, rounded down, in sub-units).
- Server authoritative, zod-validated messages, protocol version bump. Tests drive input like players do.
- Determinism: the tonic multiplier is part of the simulation state and the replay hash, so client prediction and the server agree.

## Design (settled)

- **Supply crates:** 4 crates at fixed navigable sea points, chosen by a pure function `supplySites(map)` in `apps/server/src`: points along the routes between islands, away from docks, spawns and each other, and unit-tested for navigability and spacing. Each crate is a ledger supply cache id. A ship whose hull touches a crate claims it (`grantGold`, reason `supply`, key the crate id): 25 gold once, for the first ship. Two ships on the same tick go to the lower id, per the ledger's ordering. A claimed crate disappears for everyone in sight. Crates are visible to ships in sight, like other markers.
- **Shop:** moored at any dock, **B** opens the shop panel. It lists the sail tonic (30 gold, "you carry N of 2") and the targeted rumor per missing type, the same purchase the journal offers, through the same room flow. Purchases use per-player request ids, so a retry never pays twice. Refusals (`insufficient-gold`, `tonic-limit`, in a duel, disconnected, not at a dock) are shown and cost nothing. The server checks "moored at a dock" on the tick it processes the purchase. The shop is a brief interaction, not a safe zone: grappling a moored ship still works, and it closes the panel.
- **Tonic:** **T** drinks a tonic at sea. It gives +10% sailing speed for 12 s, and the HUD shows a timer. It's refused while moored, grappled (reserved), in a duel, or while a tonic is active. Tonics are kept through a lost duel.
- **HUD:** gold, tonic count and the active tonic timer. The shop and journal share the panel key rules (no key events from text fields; Esc closes).

## Acceptance

Each item names the test that proves it. Integration tests use headless clients through the real room.

0. **Holds survive short network gaps (operator playtest bug, first priority).** Over a real connection, holds (E collect or cache claim, F eat, E treasure claim) sometimes cancel while the key is still held. The client resends a held input every 100 ms (`inputSender.ts`). The server's `InputGate` lapses it to neutral after `INPUT_HOLD_FRAMES` (15 frames, 250 ms). The room then cancels the channel, and the ledger's `progressChannel` only counts consecutive ticks. So one gap over ~150 ms of jitter resets a 6 s or 10 s hold. The fix:
   - A held **world hold button** (interact, fruit and claim) survives input gaps up to **500 ms** (`WORLD_HOLD_GRACE_FRAMES` = 30, in the protocol). During the grace window the room keeps treating the last received buttons as held, so progress continues on consecutive ticks. An explicit release (an accepted message without the button) ends the hold at once, as now.
   - Movement axes and duel input keep the 250 ms lapse, so ships and duels stay responsive and §12's "a stalled client is neutral" holds for steering.
   - Room counters (per player: gaps bridged, holds lapsed) appear in the room's diagnostics, and a lapse after the grace window is logged, so the next playtest can show whether gaps remain.
   - **Player-realistic tests** (memory rule: gameplay tests hold and tap keys like players): an integration test holds E through a full 6 s collect while the headless client's transport withholds input messages for 300–450 ms twice mid-hold, and the collect completes. The same test with a 700 ms stall cancels it (reason `released`). An explicit key-up mid-hold cancels at once. Also a browser test that holds E with a throttled or paused send for 400 ms mid-collect.
   - Document the rule in `docs/architecture.md`.

1. **Crates:** `supplySites` gives 4 navigable, well-spaced points on the slice sea (unit). A ship touching a crate gets 25 gold once and the crate vanishes for everyone; a second ship gets nothing; two ships on one tick resolve by id; `checkLedger` holds (integration).
2. **Shop purchases** (integration):
   - buying a tonic deducts 30 and adds one;
   - a third tonic is refused (`tonic-limit`) at no cost;
   - a retry with the same id is replayed without charging again;
   - a purchase after casting off is refused `not-at-dock`;
   - a purchase in a duel or with too little gold is refused at no cost;
   - the shop's rumor purchase is the same flow as the journal's.
3. **Tonic** (unit and integration): drinking gives exactly 110/100 speed for 240 ticks, in both the simulation and the prediction replay (the hash matches). It's refused moored, reserved, in a duel, or while one is active. Tonics are kept through a lost duel.
4. **Hidden information** (integration): a player's gold, tonics and purchases go only to that player; crates are shown only in sight.
5. **UI** (web unit): the shop model (items, prices, owned count, button states and refusal texts), the tonic HUD timer, and crate markers.
6. **Browser scenario `shop-and-tonic`:**
   - one browser sails over a supply crate and sees its gold rise by 25;
   - it moors at a dock, opens the shop with B and buys a tonic (gold −30, "1 of 2");
   - it casts off and drinks it with T, and the HUD shows the tonic timer;
   - the ship's speed readout (or its measured distance over 2 s) is higher than without the tonic.
7. **The existing scenarios still pass.**
8. **Carried from `intel-online`'s approving reviews:**
   - targeted rumor requests still pending when the match ends are answered with a refusal (`match-ended`), so no client waits on its 5 s timeout (integration test);
   - a retried request id that names a different type than the decided one is refused `duplicate`, matching the ledger's contract, rather than replaying the earlier type's lead (unit and integration);
   - the raw-frame privacy test in `tests/integration/intel.test.ts` also scans every frame for the sources', caches' and unseen ships' exact coordinates, not only for ids.
9. **The branch table:** `docs/economy-online-coverage.md` has one row for each room-level and UI branch this feature adds or changes: the file and function, the branch, and the test that fails when the branch is deleted.
   - Build it by deleting each branch on a scratch copy, running the deletions in parallel batches. Don't commit those edits.
   - A branch with no failing test gets a new test. A branch that can't change the outcome is marked `equivalent`, with a one-line reason. Dead code is removed.
   - There are no `unreachable` or `untested` rows, and the completion report's `untested` list is empty.
10. `docs/architecture.md` gains an "Economy in the room" section of at most half a page.
11. `npm ci` then each of the five policy checks passes from a clean checkout, with all browser scenarios. The integration suite took 192 s of its 300 s budget after intel-online. Keep it at or below 210 s: use the existing test hooks and short timings rather than real-time waits, run new files concurrently where they don't share a server, and report the duration.

Browser checks: each scenario id appears in exactly one test title as `[scenario:<id>]`. That test, when it passes, attaches exactly one image/png named `screenshot:<id>` (other attachments are fine). The verifier refuses anything else. Before completing, run the spec files you changed with a JSON report:

```bash
WORKFLOW_VERIFICATION_PHASE=worker PLAYWRIGHT_JSON_OUTPUT_FILE=<tmp>/report.json \
  npx --no-install playwright test --config=tests/e2e/playwright.config.ts --reporter=json <spec files>
```

Then check the report with the verifier's own rules: run the exact `check-report` command the controller appends to this task when it pins it.

## Stop

Report `blocked` instead of continuing when any of these happens:

- `npm ci` or an install fails twice for reasons outside the repository (registry, network).
- A pure module or content change outside the owned paths is truly required. Name the missing operation.
- A check can pass only by changing a path outside the owned paths.
- After two hours of work, any required check still fails and you cannot name the next fix. The worker deadline is three hours; leave time for the branch table and the final checks.

Report `question` only for a choice that would change this acceptance.
