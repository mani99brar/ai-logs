# Task: game

## Goal

Make fights happen at sea. A captain sails within range of a rival, presses J, and after a telegraphed one-second grapple windup the target can still escape. On a hit, both players see a three-second countdown, fight the online duel from the combat spike **inside the match room**, and return to the sea. The winner sails on with escape protection. The loser respawns at a safe dock 15 s later with longer protection. Everyone else sees a duel marker on the sea. This is the first time the two halves of the game meet, so it has to feel good: readable telegraphs, a fair escape, a tense countdown and a clean return.

## Context

- Read `docs/spec.md` §6 (all of it), §8 (J grapples in the world), §12 (disconnect in a duel: neutral inputs after 250 ms, forfeit after 10 s absent; both absent), §14 ("Match and duel boundaries": duels are simulation objects inside the match room; fighters receive their arena stream, others only an encounter marker), §15 and §16 (hidden information).
- Read `docs/architecture.md`, `docs/duel.md` and `docs/encounters.md`. Then read the code they map:
  - `packages/simulation/src/encounters`: the pure encounter rules this feature wires in, `stepEncounters` and its events.
  - `packages/simulation/src/netcode`: `DuelAuthority`, `DuelClientSession`, `inputDelayFromSamples`, `linkStats`.
  - `apps/server/src/DuelRoom.ts`: the standalone duel's countdown, probes, input delay, forfeits and practice dummy.
  - `apps/server/src/MatchRoom.ts`, `inputGate.ts`, `duelInputGate.ts` and `schema.ts`.
  - `apps/web`: `main.ts`, `seaScene.ts`, `duelClient.ts`, `arenaScene.ts`, `duelHud.ts`, `keyboard.ts`, `devLatency.ts`.
  - `packages/test-tools` (`HeadlessClient`, `HeadlessDuelClient`, `ImpairmentProxy`) and `tests/integration/duelHarness.test.ts`.
- The verifier runs `npm ci`, then `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run build` and `npx --no-install playwright test --config=tests/e2e/playwright.config.ts`. Playwright's Chromium for `@playwright/test` 1.63.0 is installed and shared read-only; never run `playwright install`.
- Another feature (`fruit-kits-core`) runs at the same time in `packages/simulation/src/duel`, `packages/content/src/moves` and `docs/fruit-kits.md`. Never touch those paths. Use the duel simulation only through its existing exports.
- **This machine is shared by several runs. Never stop processes by name pattern (`pkill -f`, `killall`, and so on). Stop only the PIDs you started.**

## Constraints

- Owned paths as in `policy.json`. Keep the existing structure, names and patterns. Reuse rather than copy:
  - Extract the standalone duel's machine (countdown, probes and input delay, forfeits, bundles, reconnection bookkeeping) from `DuelRoom` into one server class that both `DuelRoom` and `MatchRoom` use. `DuelRoom`'s behaviour, messages and tests stay the same.
  - The web `DuelClient` gets a transport seam, so the same client and the pure `DuelClientSession` run over either room.
- The encounter rules come from `@pirate-sea-race/simulation/encounters`. Never re-implement them in the room. The room builds each world tick's snapshot and applies the events.
- The server stays authoritative. Zod-validated messages. Change the protocol version: J is a new world input button, and there are new messages.
- Hidden information (§16): a client receives another player's attempt telegraphs, duel markers and ships only within its sight radius, through the existing `StateView` path. Only the two fighters receive a duel's frames, probes and state. Grapple targets are chosen by the rules, never named by the client.
- One Phaser game per page. The sea and the arena are scenes of that game. A duel never creates a second game.
- Tests drive input like players do: hold and tap keys, wait on what a player sees.
- Out of scope: rubbings, theft, gold and the theft-choice UI (`rubbings-theft`); fruit kits (`fruit-kits-online`); walking on islands; the world-disconnect seat reservation of 60 s (players who leave outside a duel are removed as today).

## Acceptance

Each item names the test that proves it.

1. **Grapple input.** J in the sea keyboard sets a grapple button (latched like E, so a tap counts), and the input message carries it. Web unit test.
2. **Telegraph and escape.** The windup is visible:
   - the attacker sees its aim;
   - the target sees an incoming-grapple warning with the direction;
   - other players in sight see the telegraph.

   The HUD shows the J cooldown after a miss. **Integration tests with headless clients:**
   - a hit reserves both ships (they stop and ignore sailing input);
   - a target that sails out of range or out of the aim during the windup escapes, and the attacker's cooldown starts;
   - a press with nobody in range does nothing;
   - a protected target can't be grappled.
3. **Transition and duel inside the match room.**
   - Both fighters get a 3 s countdown, during which the room measures the round trip and picks the input delay, as the standalone duel does. The duel starts once both clients report ready (their arena is loaded).
   - One client not ready at 10 s forfeits; both not ready cancels.
   - The fight runs the same netcode as the standalone duel: batched inputs, frame bundles, hash checks.
   - **Integration tests:**
     - two headless fighters grapple, fight and reach a KO with scripted inputs;
     - a third client in sight receives the duel marker but no duel messages, and one out of sight receives neither;
     - the harness at 80 ms / 20 ms / 1 % loss reports 0 desyncs over at least 175 hash checks for a duel inside the match room.
4. **Absence and forfeit** (§12). A fighter who drops gets neutral inputs after 250 ms and forfeits after 10 s absent. Reconnecting within 10 s resumes the same fight. A fighter who quits forfeits at once. Both absent on the same frame cancels. Integration tests for each.
5. **Return.**
   - The winner's ship resumes at its encounter position with 8 s of protection.
   - The loser's ship disappears from the sea and respawns 15 s after the fight's end at the dock the rules choose, with 20 s of protection.
   - A draw returns both to separate nearby points with 8 s of protection.
   - The HUD shows protection time left and the respawn countdown.
   - Integration tests assert positions, docks and protection timing.
6. **The world goes on.** Other players keep sailing during a duel, and a duel marker (crossed swords and elapsed time) shows at the encounter position to players in sight. Browser scenario **`sea-duel`**:
   - two browsers are placed in range; the host sails toward the guest and presses J;
   - both see the countdown and the arena;
   - the host wins with held attack keys, or the guest quits (choose one and assert it);
   - the host returns to the sea with the protection indicator, and the guest sees the respawn countdown and then its ship at a dock.
7. **The standalone duel still works.** `duel-practice` and `duel-online` and all their tests pass unchanged. The landing page keeps Practice, Create duel and Join duel.
8. `docs/architecture.md` and `docs/duel.md` describe the duel inside the match room, the shared duel class, the message routing and the visibility rules, within about a page and a half each.
9. `npm ci` then each of the five policy checks passes from a clean checkout, with all seven browser scenarios (the six existing plus `sea-duel`). The integration suite stays well inside its 300 s check timeout (split the harness if needed).

Browser checks: each scenario id appears in exactly one test title as `[scenario:<id>]`. That test, when it passes, attaches exactly one image/png named `screenshot:<id>` (other attachments are fine). The verifier refuses anything else. Before completing, run the spec files you changed with a JSON report:

```bash
WORKFLOW_VERIFICATION_PHASE=worker PLAYWRIGHT_JSON_OUTPUT_FILE=<tmp>/report.json \
  npx --no-install playwright test --config=tests/e2e/playwright.config.ts --reporter=json <spec files>
```

Then check the report with the verifier's own rules: run the exact `check-report` command the controller appends to this task when it pins it.

## Stop

Report `blocked` instead of continuing when any of these happens:

- `npm ci` or an install fails twice for reasons outside the repository (registry, network).
- Colyseus 0.18 can't send a message to only some clients of a room, or can't filter a map per client, so hidden information can't hold.
- A check can pass only by changing a path outside the owned paths.
- After three hours of work, any required check still fails and you cannot name the next fix.

Report `question` only for a choice that would change this acceptance.
