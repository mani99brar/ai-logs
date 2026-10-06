# Decisions: rubbings-theft

From the overnight session of 2026-09-25. The operator is asleep and asked the assistant to decide, record each decision, and use the workflow for the code.

## Decisions

- This is slice 4's final part, and it completes the "collect, fight, steal, recover" loop of §18 stage 2 (the claim follows in `objectives-endgame`). It wires the tested ledger into the room. The ledger is the only writer of rubbings and gold.
- Sources sit at each island's docks (2 per island in the slice). "Hold E to dock, keep holding to collect" is one gesture. **Until the ruins are wired, every source starts unlocked.** The ruins feature will lock them behind the puzzles.
- Settlement now waits for the ledger: the winner gets the 5 s choice UI, the default applies at the deadline, and only then do the encounter rules start the return.
- §12 in the world: a 60 s seat reservation (the ship stays and can be robbed); expiry and quit leave a visible cache at a dock (the respawn dock for an expiry, the nearest dock for a quit). Caches are claimed by mooring and holding E.
- Hidden information: inventories, gold and theft options are private; island types are shown only to players moored there; cache contents only to players moored at the cache.
- The encounters-online review items are folded in: the telegraph's `defenderId` hidden-info fix, the integration budget under 150 s, the room-level stop test, cancel timing, the marker drawing test, held keys in `sea-duel`, and an arena renderer that keeps the duel tick responsive on GPU-less machines.
- The browser check's timeout rises to 1,500 s for the added `theft-loop` scenario. The feature also owns `vitest.config.ts`, for integration parallelism.

## Assumptions

- The ledger's seed comes from the room's own randomness, never from the public match code (§3, §16).
- With two rubbing types in the slice, keys 1 and 2 are enough for the theft choice.

## Deferred

- Ruins (puzzles, gating, ruin gold), rumors and the journal, the final island and the claim, match phases and results, shops and tonics: `objectives-endgame` (likely split).
- Fruit kits in sea duels: `fruit-kits-online`.
