# Decisions: encounters-online

From the overnight session of 2026-09-24/25. The operator is asleep and asked the assistant to decide, record each decision, and use the workflow for the code.

## Decisions

- Slice 4's second half. The pure rules (`encounters-core`) are on `main`. This feature wires them into `MatchRoom` together with the online duel. Theft and rubbings follow in `rubbings-theft`, so this feature stays a size one lane can finish, and fighting at sea can be played on its own first.
- The duel runs inside `MatchRoom` as a simulation object (§14): one `DuelAuthority` per duel, fed by the same netcode as the standalone duel. The standalone `DuelRoom` stays as the practice arena and for private 1v1s, and keeps its tests.
- One server class holds the duel machine (countdown, probes and input delay, forfeits, bundles, reconnection). `DuelRoom` and `MatchRoom` both use it, so the two can't drift (the lesson of `DuelInputGate`).
- The web duel client gets a transport seam, so one client works over either room.
- One Phaser game per page, with sea and arena scenes, so a duel never leaks a second game.
- J is the grapple, as in §8. It is latched like E, so a tap counts.
- Duel markers follow the same sight rule as ships (§16). Only fighters receive duel traffic.
- Absence in a duel is handled as in the standalone duel: neutral after 250 ms, forfeit after 10 s, a quit forfeits at once. Outside a duel, leaving still removes the ship; the 60 s seat reservation comes with `rubbings-theft`.
- The browser check's timeout rises to 1,200 s for the added `sea-duel` scenario.

## Assumptions

- Encounter tuning stays as `encounters-core` set it (6-tile grapple, ±22.5° hit area, 6 s miss cooldown) until a playtest.
- With no rubbings yet, a duel's settlement happens at the fight's end.

## Deferred

- Theft, gold, the theft-choice UI, collecting rubbings, and the world seat reservation: `rubbings-theft`.
- Fruit kits in duels (pedestals, eating, the arena drawing): `fruit-kits-online`.
- Walking on islands and the island challenge: `objectives-endgame`.
