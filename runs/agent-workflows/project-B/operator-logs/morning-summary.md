# Morning summary: the overnight run (2026-09-24 20:00 → 2026-09-25)

Kept current through the night. The details are in `overnight-log.md` (every event) and `decisions-overnight.md` (every decision, numbered).

## On `main` now (everything reviewed by both workflow reviewers and merged; nothing pushed)

| Area | What it gives the game | Features (runs) |
|---|---|---|
| **Compact sea** | 111 × 111 map, ships at 3 tiles/s, 24 px tiles, a central hub where routes cross; docking that works from any angle (press E at or beside a dock); E taps register | sea-compact → sea-compact-fixes → docking-feel |
| **Duels at sea** | Press J near a ship: a 1 s telegraphed grapple (escapable) → 3 s countdown → the duel inside the match room → the winner returns with protection, the loser respawns at a safe dock | encounters-core, encounters-online |
| **Fruit kits (pure)** | The Ember (flame bolt, rising flare) and Smoke (feint dash, smoke screen) kits in the duel simulation, fair against the Duelist | fruit-kits-core (+fixes) |
| **Ruins (pure)** | Puzzles guarding each island: a three-symbol sequence with relational hints, or a 4 × 4 navigation grid; the first solve unlocks the island for everyone | ruins-core |
| **Intel (pure)** | Sectors, rumors, journal, stale leads, delayed carrier sightings, the reveals at the first full set, minute 20 and minute 28; paid rumors never charge for free info | intel-core (+4 fixes rounds) |
| **Economy (pure)** | Ruin and supply-cache gold, shop purchases with retry-safe ids, sail tonics; an exploit-proof gold invariant | ledger-economy (+fixes) |
| **Final island (map)** | Four hidden islets (two per sector), one secretly chosen per match | final-island |
| **Rubbings loop (online)** | Hold E at an island dock to collect a rubbing; win a sea duel and pick which of the loser's types to steal within 5 s; the gold follows; quitters and long disconnects leave a cache that others can claim | rubbings-theft (+fixes) |
| **Fruit acquisition (pure)** | Pedestals (2 per kit), 3 s eating, a contested fruit goes to one player, the kit is kept for the match | fruit-pedestals |
| **Winnable match (online)** | A lobby where the host starts a private match, a 20 s ready check, the 45 s departure, the match timer, the full-set reveal with the route to the treasure, a 10 s claim by holding E on the final island, and a results screen for claim, deadline, abandoned and aborted endings | match-online (+2 fixes rounds) |
| **Ruins (online)** | Every island's rubbings start locked; press R at a dock to read the ruin's clue (6 tablets, or a 4 × 4 grid) and answer; the first solve unlocks the island for everyone, and every solver earns 40 gold | ruins-online |
| **Fruit kits (online)** | Pedestals at island docks: F inspects, holding F for 3 s eats; the kit goes into every sea duel; the arena draws bolts, smoke and the feint | fruit-kits-online |
| **Intel (online)** | M opens the journal: rumors (start, fresh after a loss, stale → replaced), carrier sightings, known islands, your kit; a 25-gold targeted rumor at docks | intel-online (+review rerun after the usage limit) |
| **Economy (online)** | Holds survive 750 ms network gaps; 4 supply crates at sea (25 gold, first ship); B opens the dockside shop (tonic 30, rumor 25); T drinks a tonic (top speed 39 → 43 for 12 s) | economy-online |
| **Match lifecycle (pure)** | Lobby → 20 s ready → 45 s departure → exploration → end (claim, deadline, abandoned, aborted) plus per-player results | match-flow |

Main's last full check (341f1be): typecheck, unit 1,352, integration 124 (181 s), build smoke, browser 14/14.

## Running at the time of writing

- Nothing. **The §18 stage-2 slice is complete** (main 99139b5). Paused before the polish phase until the operator decides the pacing (the weekly usage limit was hit on 2026-09-25, decision #59).

## Next in the queue (sequential, each touches the room and the web client)

1. `ruins-online` → 2. `fruit-kits-online` → 3. `intel-online` → 4. `economy-online`.

## Needs you

- **Playtest** when `rubbings-theft` and ideally `match-online` land: sail, grapple (J), fight, steal, recover.
- **Decisions to confirm** (the list is in `decisions-overnight.md`). The most gameplay-relevant:
  - encounter tuning (6-tile grapple, ±22.5° hit, 6 s miss cooldown) (#5);
  - docking at any speed within reach (#10, #21, #26);
  - the Ember/Smoke frame data and the "jump the bolt is a read" balance flag (#19);
  - ruins: the first solve unlocks for everyone (#23);
  - the final island as 4 islets, two per sector (#34);
  - the canvas renderer for the match (#43).
- **md-manager note** (not changed, per your rule): the controller waits on `state` in `claude agents --json`, and finished sessions sometimes stay at `working`. I nudged them through their panes (see memory `stale-agent-state`).

## Housekeeping for later

- Many worktrees (`~/dev/project-B-{enc,kits,ruins,intel,econ,final,flow,fruit,ledger}`) and `feature/*` branches can be pruned once you've looked.
- `main` is checked out in `~/dev/project-B-ledger`. `~/dev/project-B` is on the current run's branch.
