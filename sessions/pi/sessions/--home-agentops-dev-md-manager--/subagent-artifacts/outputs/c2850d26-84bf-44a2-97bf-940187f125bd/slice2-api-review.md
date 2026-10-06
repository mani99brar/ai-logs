## TL;DR

Two actionable API findings: filesystem confinement is vulnerable to concurrent symlink replacement, and filesystem errors receive inconsistent HTTP statuses. The content/hash implementation passed a read-only, single-buffer probe. No files were modified.

## Change map

- Validation and content hashing: new `server/files.ts`.
- Endpoint and error handling: `server/app.ts:95–109`.
- API coverage: new `server/file.test.ts`; registered in `package.json`.

## Grouped walkthrough

- Paths undergo lexical containment checks and component-by-component `lstat`, followed by a separate pathname read (`server/files.ts:54–86`).
- Content and SHA-256 derive from the same buffer (`server/files.ts:86–91`).
- The route distinguishes `PathError` from other exceptions (`server/app.ts:105–108`).

## Decisions & assumptions

- **Inferred:** filesystem components remain unchanged between validation and reading. The implementation does not enforce this assumption.
- All `lstat` failures are treated as unavailable targets, regardless of their error codes (`server/files.ts:66,71`).

## Risks / findings

### P1 — Concurrent replacement can bypass symlink rejection

**Evidence:** `server/files.ts:66–76,85–86`; contract: `docs/PRD_SLICE2.md:143,257`.

Validation checks filesystem components but returns a pathname. The subsequent ordinary `readFile` resolves that pathname again and follows symlinks.

**Reproduction reasoning:**
1. Request an existing regular Markdown file.
2. After its component checks, replace the target with a symlink to an outside-source readable file.
3. The pathname read follows the replacement and returns outside-source content and its hash.

Replacing an already-checked ancestor directory creates the same problem. This requires concurrent local filesystem mutation; it is not a demonstrated remote-only attack.

**Coverage gap:** `server/file.test.ts:254–282` tests symlinks present before validation, not replacements between validation and reading. The race was established by code inspection, not exercised with filesystem mutations during this read-only review.

### P1 — Filesystem errors are misclassified in both directions

**Evidence:** `server/files.ts:66–72,86`; `server/app.ts:105–108`; contract: `docs/PRD_SLICE2.md:129–131`.

- An unexpected `lstat` error such as `EIO` becomes **404**, because every rejection is converted to `null`. This misrepresents an operational failure as a missing target.
- A file deleted after validation causes `readFile` to raise `ENOENT`, which becomes **500**, although missing files require **404**.

**Reproduction evidence:** Read-only Fastify injection probes produced:
- Mocked `lstat` throwing `EIO` → **404**, safe unavailable-file message.
- Existing fixture passing validation, injected reader throwing `ENOENT` → **500**, safe failed-read message.

**Coverage gap:** `server/file.test.ts:284–299` exercises only a generic failure from the reader. It does not cover metadata-operation failures or disappearance after validation.

No P0 findings identified.

## What was NOT done

- No edits, staging, fixes, or browser tests.
- Full automated suites, lint, and build were not rerun.
- UI changes were outside this focused API review.
- Existing hash tests use UTF-8 string fixtures (`server/file.test.ts:56–79`); they do not guard against hashing re-encoded text instead of original non-round-trippable bytes. Current code passed that additional in-memory probe.

## What to verify

- [ ] Concurrent replacement of the target, intermediate directory, and source root never discloses outside-source bytes.
- [ ] Metadata `EIO` returns safe **500**; disappearance before reading returns **404**.
- [ ] A retained regression test verifies one read and raw-byte hashing with BOM, CRLF, and invalid UTF-8 bytes.
- [ ] Rerun `npm run test:unit` after follow-up changes.

## Understanding check

- **Does the existing symlink test establish race safety?** No; links exist before the request.
- **Does the current hash use decoded text?** No; it hashes the original buffer (`server/files.ts:91`).