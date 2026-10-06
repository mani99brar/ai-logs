# Decisions: match-online

From the overnight session of 2026-09-25. The operator is asleep and asked the assistant to decide, record each decision, and use the workflow for the code.

## Decisions

- This is §18 stage 2's exit: a match that can be played and won end to end (explore, engage, steal, recover, claim). It wires the pure match lifecycle, the claim channel, the intel reveals and the final-island sockets into the room, on top of the rubbings loop.
- The lobby is private-only for now: the host starts at 2 or more players. The match module's `PRIVATE_MIN_PLAYERS` (2) is the single source, and the older `privateMatch.minPlayers` (1) is stale and reported for a later content cleanup.
- The tick order is §5's: encounters (reservations) → claim → match → intel reveals.
- Only the reveal messages of the intel module are delivered in this feature (the sector banner, the holder's route and compass, the minute-20 and minute-28 broadcasts). Rumors and the journal come in `intel-online`.
- The claim UI shows its risk explicitly, and the results screen shows accomplishments even with no winner (§2).
- One private master secret per match, with an independent keyed seed per system (the ledger deal and the final socket now; ruins and fruit later). This fixes the correlation the ruins and fruit reviewers flagged.
- Test-only settings (a pinned secret, short durations, a pinned layout, a fault hook) let the `full-match` browser scenario play a whole match in seconds. They are off by default, and the production entry never reads them.
- The browser check's timeout rises to 1,800 s for the `full-match` scenario.

## Assumptions

- The claim circle's radius (4 tiles) and the 10 s channel stay as the claim module defines them. They get tuned after the playtest.

## Deferred

- Rumors and the journal (`intel-online`), ruins gating (`ruins-online`), fruit in duels (`fruit-kits-online`), shops and tonics (`economy-online`).
- Public matchmaking and queues.
