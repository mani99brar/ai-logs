## TL;DR

Reviewed `03a6fb8...a5e1a5d`, focusing on the server and its tests against `docs/PRD_SLICE3.md`.
Found **four reproducible P2 issues**; no P0/P1 findings.
New server tests pass **30/30**. Full server tests pass **64/65**; the failure reflects the user’s existing fixture edit, not this PR.

## Change map

- **HTTP contracts** — `server/app.ts:83–170`: adds bounded JSON requests, guarded saves, and mutation routing.
- **Save pipeline** — `server/files.ts:203–245`: serializes mutations and stages hash-checked replacements.
- **Filesystem operations** — `server/mutations.ts:112–228`: implements create, copy, rename, move, and delete.
- **Regression coverage** — `server/write.test.ts`, `server/mutate.test.ts`: adds 30 tests.

## Grouped walkthrough

- Saves check the current hash, write a sibling temporary file, recheck the original, and rename over it (`server/files.ts:214–237`). This implements PRD §6.1.
- Mutations share the save queue and validate source/destination paths. File relocation uses exclusive hard-link creation followed by unlink; folder relocation uses rename (`server/mutations.ts:140–169`).
- Ordinary collision, stale-hash, and static symlink rejection paths are covered and passed. The findings below concern untested edge and failure paths.

## Decisions & assumptions

- Temporary names include the **entire original basename**, assuming sufficient remaining filesystem name capacity (`server/files.ts:221`).
- Permission mode is applied **before writing**, assuming subsequent writes preserve all mode bits (`server/files.ts:224–225`).
- Create/copy write directly into their final destinations, with close-only failure handling (`server/mutations.ts:115–116,180–184`).
- The final save recheck assumes unavailable targets arrive as `PathError`, although several open failures remain raw filesystem errors (`server/files.ts:165–167,229–232`).

## Risks & findings

### P2 — Valid long filenames cannot be saved

**Location:** `server/files.ts:221–222`

The temporary basename adds 22 bytes to the original basename. On a filesystem with a 255-byte component limit, a valid Markdown basename of **234–255 bytes** therefore cannot be saved.

**Reproduction**
1. Create a file named `'a'.repeat(231) + '.md'` containing `old`.
2. PUT `new` with the SHA-256 of `old`.
3. Observed: **500 `WRITE_FAILED`**, original bytes unchanged. The original basename is 234 bytes; the temporary basename is 256.

This affects otherwise valid, readable files and names the create API accepts.

**Fix:** Use a bounded temporary basename independent of the full target name. Add coverage near `NAME_MAX`, including multibyte names.

### P2 — Deletion during staging returns 404 instead of entering conflict recovery

**Location:** `server/files.ts:229–232`

If the original disappears during staging, `openRegularFile()` throws raw `ENOENT`. This catch converts only `PathError`; the outer filesystem handler subsequently converts `ENOENT` to **404 `NOT_FOUND`**, not **409 `HASH_CONFLICT`**.

**Reproduction**
1. Start with `removed.md = old`.
2. Using the existing staging-injection pattern from `server/write.test.ts:254–260`, unlink the original immediately after the exclusive temporary-file open.
3. PUT `new` using the original hash.
4. Observed: **404 `NOT_FOUND`**; the temporary file is cleaned up.

The PRD explicitly requires detected changes during staging to abort as conflicts (`docs/PRD_SLICE3.md:182`). Returning an ordinary error bypasses the client’s conflict-only Save/Revert lock (`src/document/editSession.ts:70–73`).

**Fix:** Normalize unavailable-target errno values inside the recheck before mapping them to conflict. Test deletion and symlink replacement during staging. This is **before** the final recheck, not the excluded final external-writer race.

### P2 — Failed create/copy leaves a truncated final Markdown file

**Locations:** `server/mutations.ts:115–116`, `server/mutations.ts:180–184`

After exclusive destination creation, failure handling closes the descriptor but never removes the incomplete destination.

**Reproduction**
1. Copy a source containing `complete source text` to an absent destination.
2. Inject a destination `writeFile` that writes its first four bytes, then throws `ENOSPC`.
3. Observed: **500 `MUTATION_FAILED`**, but the destination remains a regular Markdown file containing `comp`.
4. Retry the identical request: **409 `DESTINATION_EXISTS`**.
5. The same probe reproduces this for `create-file`.

The partial document remains discoverable as an ordinary document, and retry requires manually deleting it. Source bytes remain intact; this is not evidence of source-data loss.

**Fix:** Clean up the newly created destination on handled write/chmod failures, or publish a completed staged file with an exclusive primitive. Add failure-injection tests; current mutation failure coverage only injects `mkdir` failure (`server/mutate.test.ts:475–487`).

### P2 — Successful saves silently clear special permission bits

**Location:** `server/files.ts:224–225`  
**Same ordering:** `server/mutations.ts:182–183`

On Linux, an unprivileged write can clear setuid/setgid bits. Applying the original `0o7777` mode before writing therefore does not preserve that mode.

**Reproduction**
1. As the normal server user, create `mode.md = old` and chmod it to `06755`.
2. PUT `new` using the correct hash.
3. Observed: **200**, but mode changes from **6755 → 755**.

This contradicts permission-mode preservation (`docs/PRD_SLICE3.md:184`). Existing tests cover only ordinary permission bits and mask with `0o777` (`server/write.test.ts:153–159`).

**Fix:** Restore the intended mode after writing and before sync/publication. Test the complete `0o7777` mode under an unprivileged account.

## What was NOT done

- No workspace edits, staging, commits, or GitHub posting.
- No frontend acceptance review or browser tests.
- No finding raised for the documented final external-writer race.
- The user-owned `fixtures/pi/skills/review.md` modification was left untouched.

## What to verify

- [ ] Add regression tests for all four reproduced cases.
- [ ] Run `node --import tsx --test server/write.test.ts server/mutate.test.ts`.
- [ ] Confirm long valid basenames save successfully.
- [ ] Confirm disappearance during staging returns `409 HASH_CONFLICT`.
- [ ] Confirm failed destination writes do not leave truncated final documents.
- [ ] Confirm mode preservation tests include special bits.
- [ ] Run full server tests against pristine fixtures separately; do not reset the user’s edit.

## Understanding check

- **Are app saves and mutations serialized?** Yes, through the shared root mutation queue.
- **Do passing tests cover these failure paths?** No; targeted temporary-directory probes exposed them.
- **Is the full-suite failure a PR regression?** No. `server/file.test.ts:39` expects committed fixture text, while that fixture contains the user’s edit.