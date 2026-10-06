# Task: kits

## Goal

Give the duel its first two Devil-fruit kits, **Ember** and **Smoke** (§9), in the pure duel simulation and its move data. Eating a fruit replaces the Duelist's two specials. Normals, throw, guard and Haki stay the same. The kits must feel distinct and fair:
- **Ember** controls space with a flame bolt and punishes jumps with a rising flare, but misses are punished hard.
- **Smoke** changes spacing and hides intent with a feint dash and a smoke screen, but it hits softly and its reappearance is readable.

The fruitless Duelist must stay a real choice against both. This feature builds and proves the kits. `fruit-kits-online` then brings pedestals, eating and the arena drawing.

## Context

- Read `docs/spec.md` §7 (fighting rules), §8 (U and I are the specials; frame budgets) and §9 (all of it: the kits table and "Constraints on powers"). Read `docs/duel.md`.
- Read the duel simulation and data: `packages/simulation/src/duel` (`state.ts`, `step.ts`, `boxes.ts`, `snapshot.ts`, `replay.ts` and their tests) and `packages/content/src/moves` (`schema.ts`, `duelist.ts`, `input.ts`, `moves.test.ts`, `version.ts`), plus `packages/content/src/frameBudgets.ts`.
- The verifier runs `npm ci`, then `npm run typecheck`, `npm run test:unit`, `npm run test:integration` and `npm run build`.
- Another feature (`encounters-online`) runs at the same time and owns the server, the web client, the netcode tests and the integration tests. It uses the duel only through its exports. Stay inside your owned paths.
- **This machine is shared by several runs. Never stop processes by name pattern (`pkill -f`, `killall`, and so on). Stop only the PIDs you started.**

## Constraints

- Owned paths only: `packages/simulation/src/duel`, `packages/content/src/moves` and `docs/fruit-kits.md`. Keep the structure, names and patterns.
- **Backward compatible.** A duel created without kits is exactly today's Duelist-vs-Duelist duel, and existing callers compile unchanged (`createDuelState(config, { seed })`, `DuelAuthority`, `DuelClientSession`, the replay and snapshot helpers). Every existing test in the repository keeps passing. The moveset version changes because the data changes. Anything outside the owned paths that pins a moveset version or a hash must still pass; if one can't, report `blocked`.
- Integer, deterministic and rollback-safe: every new entity (projectiles, the smoke screen) lives in `DuelState`, is covered by `hashState`, snapshot and restore, and replays identically.
- Frame data comes from content (zod-validated), not constants in step code. §8's frame budgets apply to the new specials.
- Honour §9's "Constraints on powers":
  - no permanent intangibility;
  - no uncounterable invisibility: smoke can't hide the health bar, and the fighter keeps visible tells (the simulation exposes what the renderer must still show);
  - no unavoidable screen-wide damage;
  - no automatic stun loops.
- Out of scope: pedestals, eating, choosing a kit in a room, drawing (`fruit-kits-online`), and Spring, Stone, Gale and Beast.

## Acceptance

Each item names the test that proves it. Tests live beside the code they cover.

1. **Kit data.** `@pirate-sea-race/content/moves` exports the Duelist, Ember and Smoke kits: each kit's two special commands and its moves, validated by the schema. A duel is created with one kit per fighter (default Duelist). Content tests:
   - each kit validates;
   - each new special is within §8's budgets;
   - an invalid kit (an unknown move, a special without a hurtbox) is refused.
2. **Ember** (U: flame bolt, I: rising flare).
   - The flame bolt is a projectile entity: it travels, is blocked or hits, dies on hit, at the arena wall or at the end of its life, and at most one is alive per fighter.
   - The rising flare beats a jump-in (anti-air) but has long recovery on a whiff.
   - Scripted duel tests:
     - the bolt hits at range and is blockable;
     - a jump-in is beaten by the flare;
     - a whiffed flare and a whiffed bolt are punishable by a Duelist heavy.
3. **Smoke** (U: feint dash, I: smoke screen).
   - The feint dash is a short, cancellable dash with a readable end.
   - The smoke screen is a timed zone entity. It deals no damage, and the simulation marks the fighters inside it so the renderer can obscure their startup animations while still showing position and health.
   - Scripted tests:
     - the feint changes spacing and can cancel into a normal;
     - the screen expires on time;
     - Smoke's damage per hit is lower than the Duelist's equivalents;
     - the reappearance after a feint is at least N frames long (a named constant).
4. **Matchups.** For each pair (Duelist vs Ember, Duelist vs Smoke, Ember vs Smoke):
   - a scripted exchange shows each kit's stated advantage and vulnerability from §9's table;
   - a seeded random-input property test over at least 1,800 frames never breaks the duel invariants (health and stamina bounds, one action per fighter, at most one bolt each), and replays to the same hash.
5. **Rollback.** Snapshot and restore mid-projectile and mid-smoke-screen, then replay, gives the same hash as the straight run (the existing rollback test pattern).
6. **Docs.** `docs/fruit-kits.md` (about a page): the kits, their frame data, the new entities, and what the renderer must show.
7. `npm ci` then `npm run typecheck`, `npm run test:unit`, `npm run test:integration` and `npm run build` pass from a clean checkout.

## Stop

Report `blocked` instead of continuing when any of these happens:

- `npm ci` or an install fails twice for reasons outside the repository (registry, network).
- A check can pass only by changing a path outside the owned paths.
- After two and a half hours of work, any required check still fails and you cannot name the next fix.

Report `question` only for a choice that would change this acceptance.
