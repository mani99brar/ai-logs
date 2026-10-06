# Review log: skeleton-fixes-001

Run: `~/.local/state/agent-workflows/project-B/skeleton-fixes/skeleton-fixes-001`
Base: `0cebfa1` (skeleton-001 candidate `50b14b3` + feature files `a8e132c` + challenge revision). Lane `game`.
Watched by a Monitor on `events.jsonl`; newest entry last.

## Timeline

- 09:46:51: feature files revised after challenge attempt 1 (P1: code-less HTTP joins reserve seats before any room check), committed as `0cebfa1`.
- 09:52:07: challenge attempt 2 passed with 8 P2s; the `game` worker launched.

## Challenge attempt 2 P2s, checked against the installed Colyseus 0.18.16

1. `setMatchmaking` merges metadata? **No, it replaces it.** `Room.mjs` documents "`metadata` is always REPLACED (not merged) by setMatchmaking()/setMetadata()", so a `createToken` copied into metadata by `filterBy` is dropped when `onCreate` sets `{ code, custom }`. Still worth a test.
2. The "`joinOrCreate` with a token never lands in an existing match" test is meaningful only if it reuses the creator's real token. **Watch the worker's test for this.**
3. The static `onAuth` can't tell `join` from `joinOrCreate`, so `join {createToken}` fails with Colyseus's generic `MATCHMAKE_INVALID_CRITERIA`. **Watch the expected messages.**
4. `crypto.randomUUID()` has only 122 random bits and exists only in secure contexts; plain-http LAN hosts would lack it. **Expect `crypto.getRandomValues` (16 bytes, available on http too).**
5. New SDK error shapes (room error after the socket opens, `MATCHMAKE_INVALID_ROOM_ID`); `refusalMessage` tests shouldn't hand-build impossible error objects. `instanceof TypeError` for an unreachable server depends on the SDK not wrapping fetch errors.
6. The smoke script must kill its child explicitly; `SIGTERM` goes through Colyseus `gracefullyShutdown`, which can wait. `@colyseus/sdk` is not a root dependency (it resolves via hoisting). **Watch for a phantom dependency in `scripts/`.**
7. `protocolMismatchMessage(undefined)` is 106 bytes ("…vundefined…"), over the 100-byte rule. Under layer (a) a malformed short code becomes 400 instead of 404.
8. Is `setFixedTimestep(cb, 60)` a rate or ms? **It's a rate**: `setFixedTimestep(step, tickRate)` with `stepMs = 1e3 / tickRate`. The base runs at 60 Hz, and finding 6's clock test should confirm it.

## 10:07: worker handed off (snapshot `33c4947`, 21 files, +736/−44); verification attempt 1 running

**Finding 1 (admission), implemented as decided**
- Layer (a): `authorizeEntry` refuses `hasCode === hasToken` (neither or both) with 400 `MALFORMED_MATCH_REQUEST_MESSAGE`, validates the token with zod, and keeps 426/404/409 in the static check (challenge-1 P2 honoured: "No match with that code" still comes from here).
- Layer (b): `filterBy(["code", "createToken"])`. `onCreate` refuses a create without a valid token (so a `joinOrCreate` whose match vanished can't create a tokenless room) and replaces the metadata. `MatchMetadata.createToken?: never` documents in the type that no listing ever holds one.
- Layer (c): `admit()` in `onJoin` accepts the stored token once (then clears it), otherwise requires `code === state.code` (404 for another code, new 403 `CodeRequired` otherwise).
- Token: `CREATE_TOKEN_BYTES = 16`, 32 lowercase hex characters, `crypto.getRandomValues` in the browser (works on plain http, so challenge-2 P2 #4 is handled) and `node:crypto` `randomBytes` in test-tools. `formatCreateToken` is a pure hex encoder in `protocol`; the randomness stays outside the pure packages.
- `PROTOCOL_VERSION` 1 → 2. `protocolMismatchMessage` echoes the client version only if it's a safe integer (else "?"), so the message is bounded under 100 bytes (challenge-2 P2 #7 handled).
- Tests (`tests/integration/admission.test.ts`, 224 lines): every method × {no code, wrong code, code+token} with exact `{code, message}` pairs. Sixteen concurrent code-less or `joinById` attempts leave `clients === 1` and the listing unlocked, then seven players with the code fill it to 8. The creator's **real** token is checked: it's absent from the listing JSON, `matchMaker.query({ createToken })` is empty, a reuse via `joinById` is refused, and `joinOrCreate` with it lands in a new match (challenge-2 P2 #2 handled). There's also a test of the race for the last seat.
- Remaining gap, documented in `architecture.md`: a raw HTTP `joinById` carrying *any* token passes layer (a) and holds a seat until `seatReservationTime` if it never connects. That needs the room id, which only current or former members know. The squatting test goes through the SDK, which connects (so `onJoin` frees the seat); the raw HTTP-only case isn't exercised. It's acceptable as documented.

**Finding 2 (build output)**
- `npm run build` = `npm run build --workspaces && npm run smoke:build`, which runs `node scripts/smoke-build.ts` (Node 24 runs TypeScript directly via type stripping, so no tsx is needed).
- Beyond the ask: it first resolves every workspace export *without* the source condition and asserts each lands in `dist/…js` and exports something. That's the most direct proof of the `default → ./dist` wiring the coverage reviewer worried about.
- Then it spawns `apps/server/dist/main.js` with `PORT=0`, parses the port from the "listening" line, polls `/__healthcheck` (1 s per request, 10 s total), creates a match through `HeadlessClient` (the dist build of test-tools, 15 s) and checks the code shape and one ship. Overall limit 90 s. `finally` → SIGTERM, then SIGKILL after 5 s; `process.on("exit")` SIGKILL as a last resort; SIGINT/SIGTERM handlers. Challenge-2 P2 #6 is handled.
- `@colyseus/sdk` reaches the script through `@pirate-sea-race/test-tools`' own dependency, not hoisting (the P2 #6 phantom-dependency worry is avoided). Root `tsconfig.json` now includes `scripts/**/*.ts`, so the script is typechecked.

**Other findings**
- 3: `refusalMessage` maps `MATCHMAKE_INVALID_CRITERIA` → "That match is full or no longer exists". An unreachable server is `TypeError` **or** an SDK `MatchMakeError` without a numeric code (the SDK wraps fetch errors, which the worker handled, per challenge-2 P2 #5). New `apps/web/src/connection.test.ts` (60 lines).
- 6: `architecture.md` says "An integration test measures both rates on a running room" (added to `match.test.ts`).
- 8: the purity test and architecture list `sqrt`, `cbrt`, `hypot`, `pow`, `exp`, `log*` and trigonometric functions.
- 11: `step.ts` changed (the `headingOf` table hoisted); `seaScene.ts` −4/+4 (`cssColor`).

## 10:09–10:14: verified, reviewed, integrated

- 10:09:02 `verify_game` passed on attempt 1: unit 86, integration 14, browser 2/2 with screenshots. The build smoke step ran in the clean worktree: 6 exports loaded from `dist/`, the built server listened on port 43827, and match `0L5Z4J` was created.
- 10:10:12 candidate `ee74298` passed. Native reviewers `general` (`a8e3ee2a`) and `coverage` (`972ceba4`) ran in their own panes.
- 10:14:07 **both approved**. `integrate` fast-forwarded `feature/skeleton-fixes/skeleton-fixes-001` to `ee74298`; no push, `main` untouched (still `313eb87`).
- Remaining P2s, none blocking:
  - general (open): the 426 text changed from "this client speaks vX, the server speaks vY" to "client vX, server vY" (for the 100-byte rule); integration tests match only `/Protocol version mismatch/`.
  - general (accepted): residual `joinById` seat squatting by someone who knows a room id, 15 s `seatReservationTimeout`; Colyseus 0.18 has no public listing route.
  - coverage (open): the squatting test goes through the SDK, which connects after reserving, so the raw-HTTP reserve-and-never-connect case isn't exercised (the same gap noted at 10:07).
