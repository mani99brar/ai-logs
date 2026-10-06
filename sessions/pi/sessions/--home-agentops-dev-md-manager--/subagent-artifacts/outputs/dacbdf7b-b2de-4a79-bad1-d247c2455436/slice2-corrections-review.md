# Slice 2 corrections review

## TL;DR

The original API and UI findings are substantially corrected: descriptor-confined reads, error classification, independent history origins, fresh reopening, loading announcements, and malformed direct links.

**One new P1 regression blocks sign-off:** refreshing after deletion in Outline can create a snapshot that throws when returning from a document.

**Slice 3 readiness: not yet.** Correct this defect and obtain independent validation. Historical all-behavior TDD compliance remains unestablished, now honestly documented.

Reviewed the dirty tree against `main` at `cec5fce`. No edits or browser tests were performed.

## Change map

- **Secure reads** — `server/files.ts`, `server/app.ts`, `server/file.test.ts`: descriptor traversal, safe statuses, race/capability tests.
- **History restoration** — `src/App.tsx`, graph layout/canvas/outline: session-local snapshots, viewport/scroll/focus restoration.
- **Document lifecycle/rendering** — `src/document/`: fresh requests, announcements, safe Markdown, retained rendered tab.
- **Serving and tests** — Vite/Playwright configuration and document specs: malformed direct/reload navigation, dev/preview coverage, isolated servers.
- **Documentation** — README, Slice 2 handoff, Slice 3 caution: approved Linux boundary and corrected TDD claims.

## Grouped walkthrough

### Secure reads and classification

Startup pins the fixture-root descriptor. Every source/intermediate component opens through its retained parent descriptor with `O_NOFOLLOW | O_DIRECTORY`. The final descriptor opens no-follow/nonblocking and receives a regular-file `fstat` check (`server/files.ts:55–74,105–122`).

Content and SHA-256 derive from one Buffer (`server/files.ts:125–132`). Missing/non-directory/symlink failures become 404; unexpected failures reach a safe 500 response. Final-open ENXIO is distinguished from read ENXIO (`server/files.ts:77–82,112–121`; `server/app.ts:108–111`).

Tests exercise replacement before/after source, intermediate and final opens; replacement before reading; metadata/read failures; descriptor cleanup; capability rejection; and non-round-trippable bytes (`server/file.test.ts:314–488`). The original pathname race mechanism is removed.

### History, focus, and fresh requests

Opaque history-entry keys reference page-session snapshots containing selection, mode, expansion, layout/pins, viewport, scroll, and focus. Origin snapshots are separate from later browsing updates (`src/App.tsx:42–46,112–125,190–212,266–288`).

Layout nodes are copied during capture/restoration. Return focus suppresses native scrolling and graph focus-reveal rather than forcing Fit/re-expansion (`src/graph/layout.ts:212–237`; `src/App.tsx:291–303`; `src/graph/GraphCanvas.tsx:354–356`).

Each opening supplies a fresh reference object. Settled results require that reference and retry attempt; loading announcements originate inside the request effect, with abort checks retained (`src/App.tsx:261–273`; `src/document/useDocument.ts:29–55`).

New tests cover repeated URLs with different origins, native Back focus, reload fallback, historical outline scroll, and browse-to-browse viewport restoration (`tests/document-review.spec.ts:53–104`; `tests/document-history-review.spec.ts:6–79`). They miss the pruning interaction below.

### Malformed links and tab retention

The Vite plugin serves the SPA shell for malformed document URLs in dev and preview without changing the browser URL (`vite.config.ts:7–20`). Tests use actual navigation and reload (`tests/document-review.spec.ts:45–50`).

Rendered Markdown stays mounted under `hidden` while Source is selected. Loading/error states still replace it, and memoization avoids reparsing unchanged content (`src/document/DocumentView.tsx:54–85`; `src/document/Markdown.tsx:49–53`).

**No concrete tab-retention regression identified.** Source remains exact, renderer safety is unchanged, and tests check hidden headings against accessible-role queries. Existing 5-second render and 2-second tab/return limits remain unchanged (`tests/document-render.spec.ts:110–117,135–166`; `tests/document-failure.spec.ts:208–233`).

## Decisions and assumptions

- **Approved platform boundary:** Linux/procfs only, without pathname fallback. Configured root ancestors are trusted startup configuration (`server/files.ts:55–74`; `README.md:7,76`).
- **Session-only origins:** reload intentionally discards saved contexts; fallback opens the containing folder (`src/App.tsx:112–125,276–288`).
- **Request identity contract:** each opening needs a new stable `FileRef`, not a fresh object on unrelated renders (`src/document/useDocument.ts:18–21,49–55`).
- **Performance tradeoff:** Source mode retains rendered DOM alongside source text, trading memory for reduced parsing work (`src/document/DocumentView.tsx:73–85`).
- **Broken assumption:** every saved visible ID must reference a saved node; pruning does not preserve that invariant (`src/graph/layout.ts:203–216,229–230`).
- **Evidence boundary:** the handoff now distinguishes historical claims, observed corrections, subsequent regression coverage, and harness failures. This corrects the claim, not the absent historical sequence (`docs/HANDOFF_SLICE2.md:18,39–54,107`).

## Risks and findings

### P0 — None identified

No remaining outside-byte disclosure mechanism was identified in the reviewed descriptor-based file-read path.

### P1 — Refresh in Outline can produce a snapshot that throws on return

**Evidence:** `src/graph/layout.ts:203–216,227–230`; `src/App.tsx:175–179,190–204,276–283,438–459`.

`prune()` removes nodes but leaves `visibleIds` unchanged. While Outline is active, GraphCanvas is unmounted, so its synchronization does not repair those IDs. Opening another document captures that inconsistent snapshot.

`restore()` maps a removed ID to `undefined` and passes it into `simulation.nodes()`.

**Independently confirmed:** an in-memory probe, without browser or filesystem mutation, produced:

```text
Missing snapshot nodes: [ 'Pi/removed.md' ]
TypeError: Cannot set properties of undefined (setting 'index')
    at GraphLayout.restore (.../src/graph/layout.ts:230:21)
```

**Impact:** return navigation throws before `setLocation()`. Back to folder has already written the browsing URL, so URL and displayed document can disagree (`src/App.tsx:202–210,282–283`).

#### Exact minimal regression

Run this against the production layout/model classes; the first assertion currently fails:

```ts
import assert from 'node:assert/strict'
import { GraphLayout } from './src/graph/layout.ts'
import { buildIndex, visibleGraph } from './src/graph/model.ts'

const layout = new GraphLayout({ synchronous: true })
try {
  const before = buildIndex([
    { source: 'Pi', path: 'removed.md', kind: 'file' },
    { source: 'Pi', path: 'kept.md', kind: 'file' },
  ])
  const graph = visibleGraph(before, new Set(['Pi']))
  layout.sync(graph.nodes, graph.edges)

  const after = buildIndex([
    { source: 'Pi', path: 'kept.md', kind: 'file' },
  ])
  layout.prune(new Set(after.nodes.keys()))
  const snapshot = layout.snapshot()

  assert.doesNotThrow(() => layout.restore(snapshot))
  const restored = layout.snapshot()
  assert.ok(restored.visibleIds.every(
    id => restored.nodes.some(node => node.id === id),
  ))
} finally {
  layout.dispose()
}
```

**Smallest correction recommendation:** in `restore()`, normalize the incoming `snapshot.visibleIds` against the freshly reconstructed node map before assigning `this.visibleIds`, constructing simulation nodes, and rebuilding links (`src/graph/layout.ts:224–236`). This locally prevents undefined simulation nodes while retaining surviving positions/pins.

Do not merely shorten `visibleIds` in `prune()` without considering simulation synchronization: `sync()` uses visible-ID equality as an early-return condition (`src/graph/layout.ts:95–99`).

**Browser regression:** display two owned scratch files in Graph → Outline → externally delete one → Refresh → open the survivor → Back to folder. Repeat with native Back. Assert no page error, browsing visibility, matching URL, and restored survivor focus. Existing deletion coverage does not refresh after deletion (`tests/document-failure.spec.ts:59–77`).

### P2 — None additional identified

### Disposition of original findings

| Original finding | Disposition |
|---|---|
| Concurrent symlink replacement | **Addressed:** descriptor-relative opens and retained handles; deterministic replacement tests (`server/files.ts:105–122`; `server/file.test.ts:394–430`). |
| Filesystem status misclassification | **Addressed:** missing/operational distinction, including ENXIO (`server/files.ts:77–82,114–121`; `server/file.test.ts:341–369,433–453`). |
| Shared historical browsing state | **Original mechanism addressed; overall restoration not accepted** because of the new pruning defect (`src/App.tsx:190–212`; `src/graph/layout.ts:212–237`). |
| Browser Back focus/re-expansion | **Addressed for reviewed cases** (`src/App.tsx:242–245,291–303`; `tests/document-review.spec.ts:53–68`). |
| Same-file stale ready/error result | **Addressed:** reference/attempt gating and pending-reopen tests (`src/document/useDocument.ts:53–55`; `tests/document-review.spec.ts:6–22`). |
| Missing direct/retry loading announcements | **Addressed:** lifecycle callback and direct/reload/retry tests (`src/document/useDocument.ts:29–33`; `tests/document-review.spec.ts:25–41`). |
| Malformed direct/reload links | **Addressed in implementation and coverage** for both configured serving modes (`vite.config.ts:7–20`; `tests/document-review.spec.ts:45–50`). |
| Unsupported blanket TDD claim | **Documentation corrected; historical compliance unestablished** (`docs/HANDOFF_SLICE2.md:18,107`). |

## What was NOT done

- No edits, staging, browser suite, subagents, or suite reruns.
- Independently executed only the in-memory restoration probe and read-only inspection checks.
- Inspected existing final logs: 47 unit passes, 50 dev browser passes, 50 preview passes, and successful lint/build. These are prior runs, not this reviewer’s independent execution.
- `git diff --check`, staged-file listing, and fixture status produced no diagnostics/entries.
- Cross-browser and non-reduced-motion restoration remain unverified (`playwright.config.ts:12–16`).
- Slice 3 mutation/atomic-replacement safety still requires separate design; the read helper does not establish it (`docs/PRD_SLICE3.md:7`).

## What to verify

- [ ] Establish Red→Green for the minimal pruning/restoration regression above.
- [ ] Validate the Outline-refresh-deletion journey with both return mechanisms.
- [ ] Rerun unit/API tests, lint, build, and dev/preview browser gates on free isolated ports.
- [ ] Retain repeated-origin, focus, fresh-reopen, malformed-link, and unchanged performance assertions.
- [ ] Confirm fixture cleanliness and no staged files.
- [ ] Keep historical TDD limitations explicit in acceptance.

**Verdict:** hold Slice 2 acceptance and Slice 3 implementation readiness until the P1 restoration defect is corrected and independently validated.

## Understanding check

- **Why are replacement races now confined?** Each component opens relative to a retained directory descriptor; the final read never re-resolves the original pathname.
- **Why can restoration still fail?** Pruning removes nodes without removing their saved visible IDs.
- **Does returning from Source reparse Markdown?** No; the hidden memoized rendered subtree remains mounted.
- **Do passing tests prove historical TDD compliance?** No; the corrected handoff explicitly acknowledges that limitation.