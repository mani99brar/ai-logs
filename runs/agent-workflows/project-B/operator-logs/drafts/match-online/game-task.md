# Task: game

## Goal

Make a match **winnable end to end**: this is §18 stage 2's exit.
- Players gather in a lobby, the host starts, clients preload during a 20 s countdown, and control starts with 45 s of departure protection and a 35:00 timer.
- The first player to hold every rubbing type is told the exact route to the final island, and everyone learns its sector.
- Ships converge, and the holder stops inside the treasure circle and holds E for 10 s, while rivals try to grapple them.
- The match ends with a winner, or with no winner at the deadline.
- Everyone sees a results screen with the winner and each player's accomplishments.

This is the moment the whole race builds up to, so the reveal, the claim's risk and the results must feel dramatic and clear.

## Context

- Read `docs/spec.md` §2 (phases, timer, results), §5 (all of it: the reveal, the claim sequence, counterplay, same-tick ordering), §3 (the final island is one of the hidden sockets), §12 (abandoned and aborted matches) and §16 (hidden information).
- Read `docs/match.md` (the pure match lifecycle: `stepMatch`, phases, endings, results), `docs/claim.md` (`stepClaim`: the channel, interrupts, the deadline), `docs/intel.md` (reveals: the final-island sector to all, the route to the full-set holder, minute-20 and minute-28 broadcasts), the final-island sockets in `packages/content/src/seaMap.ts` (`finalSockets`, `chooseFinalSocket(map, secret)`), `docs/encounters.md` (spawn protection, `protectionEndedBy`), `docs/objectives.md` (`holdsAllTypes`, the ledger) and `docs/architecture.md`.
- Read the room and client as `rubbings-theft` left them: `apps/server/src/MatchRoom.ts`, `schema.ts`, `apps/web` (`main.ts`, `seaScene.ts`, `hud.ts`), `packages/test-tools` and `tests/integration`.
- The verifier runs `npm ci`, then `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run build` and `npx --no-install playwright test --config=tests/e2e/playwright.config.ts`.
- **This machine is shared by several runs. Never stop processes by name pattern (`pkill -f`, `killall`, and so on). Stop only the PIDs you started.**

## Constraints

- Owned paths as in `policy.json`. The pure modules (`match`, `claim`, `intel`, `encounters`, `objectives`, `duel`) and their content aren't owned: use them through their exports, and report `blocked` naming the gap if one truly needs a change. Keep the structure, names and patterns. Server authoritative, zod-validated messages, protocol version bump. One Phaser game per page.
- **Tick order (§5):** encounters (accepted reservations) → claim channel → match flow → intel reveals, each world tick. Document the order in `docs/architecture.md`.
- Hidden information (§16):
  - the final island's exact position goes only to a player who holds every type;
  - its sector goes to everyone at the first full set;
  - the socket choice comes from a server secret drawn with `node:crypto`, never from the match code or a public seed.
- Tests drive input like players do.

## Design (settled)

- **Lobby.** Private matches now open in a **lobby**: the code, the players, a Start button for the host (enabled at 2 or more players). Only private matches exist today; public queues come later. **Reconcile the two private minimums:** `privateMatch.minPlayers` in `packages/content/src/rules.ts` isn't owned, so the room uses the match module's `PRIVATE_MIN_PLAYERS` (2) as the single source. Document it, and report the stale constant for a later content cleanup. Late joiners after the lobby are refused at admission, with a clear message.
- **Ready → departure.** A 20 s countdown during which the arena and sea assets preload. Then `control-started`: the room passes the tick to the claim config (the deadline) and to the encounter rules (45 s spawn protection for every player). The HUD shows **the 35:00 timer**, from `remaining()`. The timer's duration must equal the claim config's deadline: build both from one config, and assert it in a test.
- **Reveals** (through the intel module, which is wired only for its reveal messages here; rumors and the journal come later in `intel-online`):
  - at the first full set, a banner for everyone with the final island's **sector**, and a compass arrow plus a minimap marker for the holder with the exact island;
  - minute 20 and minute 28 broadcasts as banners;
  - losing a type makes the holder's route inactive.
- **The claim** (the claim module): inside the treasure circle, stopped, holding every type, unprotected (starting a claim ends protection) and not reserved, holding E runs the 10 s channel. The UI shows the progress and an explicit risk line ("Any rival in range can interrupt you"). Moving, a lost type, a disconnect or a duel reservation resets it, with the reason shown. On completion, the match ends with the winner, and outcomes freeze (§5).
- **Endings** (the match module): `claim`, `deadline` (no winner), `abandoned` (everyone left), `aborted` (a server fault). The room validates player ids before `stepMatch`, because it throws on unknown ids.
- **Results screen.** Everyone sees the winner or "No winner (time ran out)", and each player's accomplishments: rubbings collected, thefts, losses, duels won, lost and drawn, gold, caches claimed, islands visited. The room feeds these from ledger and encounter events. The results stay until players leave; a "Back to lobby" button returns them to the landing page.
- **Seeds (must-fix from earlier reviews).** The room draws **one private master secret** per match with `node:crypto`, and derives an **independent seed per system** from it: the ledger deal, the final-socket choice, and later the ruins and the fruit deal. Use a documented keyed derivation (for example `hashState({ secret, system })`, or an HMAC). Refactor `rubbings-theft`'s ledger seed onto it. Never pass one raw seed to two systems, and never derive anything from the match code. A test shows the derived seeds differ per system and don't depend on the code.
- **Carry-forward from the rubbings-theft review:** ignore key auto-repeat (`event.repeat`) in the theft-choice key handler; fix the stale "Phaser.AUTO" comment in `tests/e2e/seaDuel.spec.ts` (the match game is CANVAS); assert the per-tick invariant in `seaDuelHarness.test.ts`; unit-test the dock-reuse branch of `sourceSites`.
- **Test-only settings** (documented, off by default, never read by the production entry):
  - pin the final-socket secret;
  - shorten the match and ready durations;
  - pin the source layout (from `rubbings-theft`);
  so tests can play a whole match in seconds.

## Acceptance

Each item names the test that proves it. Integration tests use headless clients through the real room.

1. **Lobby and start:** 2 or more players can start and 1 can't; the host starts; late joiners are refused; the ready countdown; `control-started` gives every player spawn protection; the timer HUD shows the remaining time and ends at the claim deadline. Integration and web unit tests.
2. **Reveals:** the first full set sends the sector to all and the exact position only to the holder (raw-message test); a lost type deactivates the route; the minute-20 and minute-28 broadcasts arrive (with test-only short durations). Integration tests.
3. **The claim:** a full-set holder stopped in the circle claims in 10 s and wins; each interrupt (moving, losing a type, a grapple reservation on the same tick, a disconnect) resets it; a claim on the deadline tick wins; after the win, inputs change nothing. Integration tests.
4. **Endings and results:** each ending with exact results numbers; `abandoned` when everyone leaves; `aborted` through a test-only fault hook. Integration tests.
5. **Browser scenario `full-match`** (with test-only short durations, a pinned secret and a pinned layout):
   - two browsers;
   - the host starts from the lobby, and both see the countdown and the timer;
   - the host collects both types (moored at two islands), sees the reveal banner and the route arrow, sails to the claim tile, and holds E for 10 s;
   - both browsers show the results with the host as the winner.
6. The existing scenarios still pass: update their setup to start through the lobby.
7. `docs/architecture.md` (the lobby, the tick order, reveals, the claim, results) and `README.md` updated within about a page.
8. `npm ci` then each of the five policy checks passes from a clean checkout, with all browser scenarios. The integration suite stays well inside its time budget.

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
- After three hours of work, any required check still fails and you cannot name the next fix.

Report `question` only for a choice that would change this acceptance.
