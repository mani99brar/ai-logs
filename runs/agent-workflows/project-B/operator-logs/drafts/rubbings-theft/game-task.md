# Task: game

## Goal

Close the loop that makes the game a race: **collect → fight → steal → recover**. A captain moors at an island and holds E to take its rubbing. At sea they grapple a rival and win the duel, and within 5 s they pick which of the loser's types to steal (the gold follows). A player who quits or drops for too long leaves a visible recovery cache at a dock, which others can moor at and claim. The ledger (on `main`, fully tested) holds all the rules. This feature wires it into the match room and gives players a clear, readable UI for it. After this, a match can be played for rubbings; the treasure claim follows in `objectives-endgame`.

## Context

- Read `docs/spec.md` §4 (all of it: ownership, theft, the 5 s choice and its default, transfer invariants), §6 ("Return to the world"), §11 (PvP gold, the repeated-win window), §12 (disconnect in the world: 60 s seat reservation; expiry and quit leave a recovery cache at a dock or shoreline; caches are claimed 6 s per rubbing by a player missing that type), §16 (enemy inventories are hidden) and §18 stage 2.
- Read `docs/objectives.md` (the ledger: `createLedger`, `addPlayer`, `startCollect`/`progressChannel`/`cancelChannel`, `startCacheClaim`, `reserveDuel`, `reportDuelResult`, `chooseTheft`, `advanceLedger`, `disconnectPlayer`/`reconnectPlayer`/`expireReservation`/`quitPlayer`, `checkLedger`), `docs/encounters.md` (how duel reservations and results map onto the ledger), `docs/architecture.md` and `docs/duel.md`.
- Read the room and client as `encounters-online` left them: `apps/server/src/MatchRoom.ts` (the encounter step, `DuelMachine`, duel reports that today send the end and the settlement on one tick), `schema.ts`, `apps/web` (`seaScene.ts`, `hud.ts`, `main.ts`, `keyboard.ts`), `packages/test-tools` and `tests/integration/seaDuel*.ts`.
- The verifier runs `npm ci`, then `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run build` and `npx --no-install playwright test --config=tests/e2e/playwright.config.ts`.
- Other features may run at the same time in `packages/simulation/src/intel` and `packages/content/src/intel`. Never touch those paths. The ledger (`packages/simulation/src/objectives`, `packages/content/src/objectives`) and the duel (`packages/simulation/src/duel`, `packages/content/src/moves`) are not owned; use them through their exports. If a ledger change is truly needed, report `blocked` with the exact gap.
- **This machine is shared by several runs. Never stop processes by name pattern (`pkill -f`, `killall`, and so on). Stop only the PIDs you started.**

## Constraints

- Owned paths as in `policy.json`. Keep the structure, names and patterns. The ledger is the only writer of rubbings and gold. The room never moves a rubbing or gold itself, and it asserts `checkLedger` in development and tests.
- Server authoritative, zod-validated messages, and a protocol version bump.
- Hidden information (§16):
  - a player's inventory and gold go only to that player;
  - an island's sealed rubbing types go only to players moored at that island;
  - caches appear, like ships, only within sight (a marker, with no contents until moored at it);
  - the theft-choice options go only to the winner.
- One Phaser game per page. Tests drive input like players do: hold and tap keys, and wait on what a player sees.

## Design (settled)

- **The ledger per match.** A `slice` ledger is created with the match. Its sites are each regular island's dock positions: `sourcesPerIsland` (2) per island, taken from that island's docks in id order, reusing a dock if the island has fewer. The ledger's seed comes from the room's own randomness, not the public match code. **Until the ruins are wired (`objectives-endgame`), every source is unlocked at match start** (documented; the ruins feature will lock them).
- **Collecting.** Moored at a dock of island *i*, holding E runs the ledger's 6 s collection on island *i*'s first eligible source: sealed, of a type the player lacks, in the fixed type order. "Hold E to dock, keep holding to collect" is one gesture. Casting off, releasing E, entering a duel or disconnecting interrupts it, and progress resets (the ledger's rule). The HUD shows the island's sealed types (moored players only), a progress bar, and the result.
- **Duels feed the ledger.** A reservation calls `reserveDuel`. The fight's end calls `reportDuelResult` (win, draw or cancelled). **Settlement is no longer same-tick.** On a win with an eligible type, the winner gets a 5 s choice UI (the eligible types; keys 1 and 2 or a click) that sends a `choose-theft` message (validated; the winner only). `advanceLedger` applies the default at the deadline. Only when the ledger settles does the room report `settled` to the encounter rules, which starts the return. The loser sees what was taken, and both see the gold change. A draw moves nothing.
- **Disconnect and quit** (§12):
  - A player who drops outside a duel keeps their seat for 60 s (`disconnectPlayer`, Colyseus `allowReconnection`). Their ship stays in the world and can be grappled (the encounter rules already allow it).
  - Coming back reattaches the same player (`reconnectPlayer`).
  - At expiry (`expireReservation`), or on a consented leave (`quitPlayer`), their rubbings go into a cache at a dock: the respawn dock the encounter rules would choose for an expiry, or the nearest dock by sea for a quit. The ship leaves the world.
  - Inside a duel, today's forfeit rules stand, and the ledger's duel forfeit handles the rubbings.
- **Caches.** A cache is a marker at its dock, visible within sight. A player moored at that dock sees its contents (types) and holds E to claim one missing type in 6 s (`startCacheClaim`, then progress). An empty cache disappears.
- **Carry-forward from the encounters-online review** (fold in):
  - **Hidden info:** a grapple telegraph's `defenderId` is blanked for viewers who can't see the defender. An integration test proves it on the raw message.
  - **Integration budget:** bring `npm run test:integration` well under 150 s. Either run files in separate processes in parallel (for example `pool: "forks"` with `fileParallelism: true`, if each file starts its own server on a free port), or shorten the long absence and ready waits through test-only config constants. Show the before and after durations.
  - **Tests:**
    - a room-level test that a moving ship stops on reservation;
    - a timing assertion for the both-not-ready cancel (at 10 s, not at the countdown's end);
    - a web unit test that the duel marker is drawn at its position with its elapsed time;
    - the `sea-duel` scenario holds attack keys, as its acceptance says.
  - **Arena renderer:** the match game's arena keeps the 4 ms DuelClient tick responsive on machines without a GPU. Use the canvas renderer for the arena, or show by a measured test that the tick isn't starved. Update `docs/architecture.md` "Rendering".

## Acceptance

Each item names the test that proves it. Integration tests use headless clients through the real room.

1. **Collection:**
   - a moored player holding E collects the island's eligible rubbing in 6 s;
   - releasing, casting off, entering a duel or disconnecting resets it;
   - a player never gets a second rubbing of a type;
   - the HUD shows the island's types only when moored there.
   Integration and web unit tests.
2. **Theft:**
   - the winner of a sea duel gets the choice and takes the chosen type; with no choice in 5 s, the default applies;
   - with no eligible type, only the gold moves;
   - a draw moves nothing;
   - the repeated-win window suppresses gold, not theft;
   - the return happens only after settlement;
   - `checkLedger` holds after every step.
   Integration tests.
3. **Disconnect and quit:**
   - a reconnect within 60 s resumes the same player with the same rubbings;
   - an expiry and a quit each create a cache at the stated dock with exactly the leaver's rubbings;
   - a disconnected ship can be grappled and robbed.
   Integration tests.
4. **Caches:** a player missing a type claims one rubbing in 6 s at a cache's dock; a player holding every type in the cache can't; an empty cache disappears; markers appear only within sight. Integration tests.
5. **Hidden information** on raw messages:
   - another player's inventory, gold and theft options never reach a client;
   - island types reach only moored players;
   - cache contents reach only players moored at the cache;
   - the telegraph's `defenderId` is blank for viewers who can't see the defender.
   Integration test.
6. **Browser scenario `theft-loop`:**
   - two browsers, each placed moored at a different island, hold E and each collects a different type (the HUD shows it);
   - the host grapples the guest at sea, wins with held attack keys, and picks the guest's type within 5 s;
   - the host's HUD shows both types and more gold, and the guest's shows the loss.
7. The carry-forward items above, each with its named test or measurement. Integration runs under 150 s on the candidate (report the duration).
8. `docs/architecture.md` (the ledger in the room, messages, visibility, the settlement order) and `README.md` updated within about a page.
9. `npm ci` then each of the five policy checks passes from a clean checkout, with all eight browser scenarios (the seven existing plus `theft-loop`).

Browser checks: each scenario id appears in exactly one test title as `[scenario:<id>]`. That test, when it passes, attaches exactly one image/png named `screenshot:<id>` (other attachments are fine). The verifier refuses anything else. Before completing, run the spec files you changed with a JSON report:

```bash
WORKFLOW_VERIFICATION_PHASE=worker PLAYWRIGHT_JSON_OUTPUT_FILE=<tmp>/report.json \
  npx --no-install playwright test --config=tests/e2e/playwright.config.ts --reporter=json <spec files>
```

Then check the report with the verifier's own rules: run the exact `check-report` command the controller appends to this task when it pins it.

## Stop

Report `blocked` instead of continuing when any of these happens:

- `npm ci` or an install fails twice for reasons outside the repository (registry, network).
- A ledger or duel change outside the owned paths is truly required. Name the missing operation.
- A check can pass only by changing a path outside the owned paths.
- After three hours of work, any required check still fails and you cannot name the next fix.

Report `question` only for a choice that would change this acceptance.
