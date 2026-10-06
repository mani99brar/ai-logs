# Task: game

## Goal

Give captains something to chase besides the obvious (§3, §11). Every player starts the match with a rumor pointing at a sealed rubbing: an island, or a sector with a recovery cache. The journal keeps each lead until it goes stale, and then replaces it. Losing a rubbing in a duel gives a free fresh rumor, the comeback lead of §11. At a dock, a captain can pay 25 gold for a targeted rumor about a type they're missing. When nothing else is left, a delayed carrier sighting says roughly where another captain was seen with that type. The pure rules are on `main` (`packages/simulation/src/intel`, `docs/intel.md`). `match-online` already delivers the reveals: the final sector, the route, the minute-20 sector reveal and the minute-28 carrier reports. This feature delivers the rest (rumors, sightings, stale leads and purchases) and builds the journal.

## Context

- Read `docs/spec.md` §3 ("Rumors and the journal"), §11 (comeback leads, the 25-gold rumor), §13 (the journal screen: known islands, collected types, current rumors, power descriptions) and §16 (hidden information).
- Read `docs/intel.md` (all of it: leads and their tiers, stale leads and replacements, sightings and their delay and cap, `targetedRumorAvailability`, `freeCoverage`, the messages and what they may never carry), `docs/objectives.md` (Economy: `purchase` of a `rumor`, request ids per player, and the "Rumor flow" paragraph that fixes the order: check availability, then `purchase`, then deliver), `docs/architecture.md`, and the room as `fruit-kits-online` left it: `revealOf` in `MatchRoom.ts` drops every kind but the reveals, and that's where this feature starts.
- The verifier runs `npm ci`, then `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run build` and `npx --no-install playwright test --config=tests/e2e/playwright.config.ts`.
- **This machine is shared by several runs. Never stop processes by name pattern (`pkill -f`, `killall`, and so on). Stop only the PIDs you started.**

## Constraints

- Owned paths as in `policy.json`. The pure modules and their content aren't owned: use them through their exports, and report `blocked` naming the gap if a change is truly needed.
- Server authoritative, zod-validated messages, protocol version bump. Tests drive input like players do.
- Hidden information: every rumor, sighting and journal update goes only to its player. No message carries a player id, a rubbing id, or a source's, cache's or ship's position, except the `final-route` point that `match-online` already sends. The integration test reads raw frames.

## Design (settled)

- **Delivery:** the room delivers every intel message kind to its recipients. `revealOf` grows into a full mapping, with rumors, sightings, stale notices and `no-lead` added. Each player's journal (their active leads with their entry numbers, stale marks and reasons) is part of their private status, so a reconnecting player gets it back.
- **Journal:** **Tab** opens and closes the journal panel (readable DOM text). It shows your current rumors: the type, the island name or the sector name, and why you got it (start, fresh, targeted, replacement, sighting). Stale rumors are greyed out with their replacement. It also shows the islands you know (unlocked or not, and whether you solved the ruin), your collected types, and your kit with its §9 description. A short toast announces each new lead.
- **Sectors on the sea:** faint 3 × 3 sector borders on the sea, with the sector's name shown when you enter it. The borders only show while the journal is open or a sector lead is active, so the sea stays clean.
- **Targeted rumor:** moored at any dock, the journal offers "Buy a rumor (25 gold)" for each type you're missing that has an available lead (`targetedRumorAvailability`). Types with free coverage show "covered" and can't be bought. The flow follows `docs/objectives.md`'s order exactly: availability, then `purchase` with the client's request id, then deliver. A retry with the same id never pays twice. A refusal (`insufficient-gold`, in a duel, disconnected) is shown and costs nothing. The dockside shop in `economy-online` will later add this same purchase next to the tonic.
- **Keys:** Tab doesn't clash with E, R, F, J, U or I. The panel key rules apply: no key events are taken from text fields, and the helm goes neutral only while a panel that needs it is open (the journal doesn't).

## Acceptance

Each item names the test that proves it. Integration tests use headless clients through the real room.

1. **Start rumors** (integration): at control start every player gets a start rumor naming an island with a sealed source, or a sector with a cache, of a type they lack. It never names a carrier.
2. **Fresh and replacement leads** (integration): losing a type in a settled theft gives the loser a free fresh rumor. A journal rumor whose source gets collected goes stale and is replaced. Entering a duel isn't a loss.
3. **Targeted purchase** (integration):
   - buying with 25 gold delivers one targeted rumor and deducts 25;
   - a retry with the same request id is replayed without charging again;
   - a covered type is refused without charge, and so is a purchase with too little gold;
   - a purchase while in a duel is refused;
   - the gold identity holds (`checkLedger`).
4. **Sightings** (integration, with test-only short timings): when every copy of a missing type is carried by others, the lead is a carrier sighting delayed by the configured interval, at most one per player per snapshot.
5. **Hidden information on raw messages** (integration): across a scripted match, no frame to a player carries another player's id, a rubbing id or a hidden position, and no player receives another player's rumor.
6. **Reconnect** (integration): a player who reconnects gets their journal back unchanged.
7. **UI** (web unit): the journal model (entries, stale marks, reasons, islands, types, kit), the purchase button states (available, covered, too little gold, not at a dock), the toast, and the sector-border visibility rule.
8. **Browser scenario `rumor-journal`:**
   - two browsers start a private match;
   - the host opens the journal with Tab and reads its start rumor (a type and an island or sector name) from the page;
   - it sails to a dock, moors, buys a targeted rumor and sees its gold drop by 25 and a new journal entry marked "targeted";
   - the guest's page never shows the host's rumors.
9. **The existing scenarios still pass**, including the full match and the ruin, fruit and theft loops.
10. **Carried from `fruit-kits-online`'s approving reviews:**
    - the fruit panel stays open long enough to show the `reserved` and cast-off interruption reasons, which it closes too early to show today (a web unit test plus a room-level status test);
    - an auto-repeated F keydown (`event.repeat`) from the press that opened the panel never starts eating; only a fresh press does (web unit test);
    - `receiveOpenRuin` checks `island === null` before calling `openRuin`, matching its `island: number` type, instead of relying on the pure module's runtime check;
    - the fruit hidden-information test takes its marks before the players join, so it also covers the first syncs;
    - an integration test shows that a duel fought after a lost duel starts with the eater's kit (duel diagnostics or the lobby `kits`).
11. **The branch table:** `docs/intel-online-coverage.md` has one row for each room-level and UI branch this feature adds or changes: the file and function, the branch, and the test that fails when the branch is deleted.
    - Build it by deleting each branch on a scratch copy, running the deletions in parallel batches. Don't commit those edits.
    - A branch with no failing test gets a new test. A branch that can't change the outcome is marked `equivalent`, with a one-line reason. Dead code is removed.
    - There are no `unreachable` or `untested` rows, and the completion report's `untested` list is empty.
12. `docs/architecture.md` gains an "Intel in the room" section of at most half a page.
13. `npm ci` then each of the five policy checks passes from a clean checkout, with all browser scenarios. The integration suite stays well inside its time budget; report its duration.

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
