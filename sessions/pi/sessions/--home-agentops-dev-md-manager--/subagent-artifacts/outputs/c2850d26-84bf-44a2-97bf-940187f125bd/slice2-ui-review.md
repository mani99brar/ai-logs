# Slice 2 UI review

## TL;DR

The change adds document routes, rendered/source viewing, accessible file actions, and session-local browsing restoration. Rendering safety looks sound in the inspected code.

**Do not accept navigation restoration as complete:** history entries share mutable browsing state, browser Back does not restore originating focus, and reopening the same document temporarily presents an old result as current.

Review was read-only. No browser tests, edits, or fixes were performed. Reported test passes were not independently rerun.

## Change map

- **Navigation and restoration:** `src/App.tsx:95–246`, `src/graph/model.ts:207–273`.
- **Document fetching and states:** `src/document/api.ts:16–35`, `src/document/useDocument.ts:22–58`.
- **Rendering and accessibility:** `src/document/DocumentView.tsx:25–125`, `src/document/Markdown.tsx:25–52`.
- **Browsing integration:** `src/graph/GraphCanvas.tsx:80–165`, `src/graph/Outline.tsx:16–20`.
- **Verification:** document browser specs, `tests/unit/document.test.ts`, and `docs/HANDOFF_SLICE2.md`.

## Grouped walkthrough

### Open and return

Graph activation distinguishes clicking from dragging; outline files use native buttons (`src/graph/GraphCanvas.tsx:229–260`, `src/graph/Outline.tsx:63–71`). Opening replaces the browsing workspace rather than adding a pane (`src/App.tsx:364–407`).

Graph viewport and outline scroll survive component unmounting through App-owned refs. These preserve an immediate round trip, but are not historical snapshots (`src/App.tsx:104–108`).

### Requests and document states

Requests use `URLSearchParams`, no-store fetching, response-identity validation, and abort cleanup (`src/document/api.ts:17–33`, `src/document/useDocument.ts:30–51`). Different-document results are gated by identity; same-document reopening has the gap below.

### Rendering and accessibility

The renderer retains `react-markdown` URL safety defaults, adds GFM, renders non-HTTP(S) links inert, and permits only HTTPS images (`src/document/Markdown.tsx:25–52`). No raw-HTML interpreter or unsafe HTML injection appears in this renderer.

The document heading receives focus, tabs expose selection with roving tab stops, and Source renders the returned string directly (`src/document/DocumentView.tsx:33–51,76–80,104–123`).

## Decisions and assumptions

- **Historical context is keyed by document URL, not history entry.** Reopening a URL overwrites its previous origin (`src/App.tsx:213`).
- **Browsing state is retained globally rather than captured per opening.** `ReturnContext` contains only pathname, location, and focus ID (`src/App.tsx:42`).
- **Request identity assumes URL plus retry count uniquely identifies a request.** That assumption fails across closing and reopening the same file (`src/document/useDocument.ts:27–28`).
- **Additional rendering restrictions:** anchors and mail links are inert; HTTP images are unavailable. These are explicit policy choices, not renderer defaults (`src/document/Markdown.tsx:7–16`).

## Risks and findings

### P0

None identified in the reviewed UI scope. This is not a filesystem-security sign-off.

### P1 — Historical browsing contexts are neither captured nor isolated

**Evidence:** `src/App.tsx:42,95–108,209–228`.

Only route and focus are saved; mode, expansion, positions/pins, viewport, and scroll remain shared mutable state. Additionally, `returnContexts.set(pathname, …)` overwrites earlier openings of the same document.

**Reproduction:**

1. Open `Pi/workflow.md` from Home in graph mode.
2. Return, change mode/expansion/viewport, and browse to `/Claude`.
3. Open the same Pi file again.
4. Traverse history back to its original document entry.
5. Choose **Back to folder**.

The original entry now uses `/Claude` as its origin, with the latest browsing state—not the original Home/graph context.

**Required correction:** restore the context belonging to each opening/history entry, including the state required by `docs/PRD_SLICE2.md:83–84`.

**Coverage gap:** `tests/document.spec.ts:187–215` traverses history without changing browsing mode/layout and does not reopen the same URL from different origins.

### P1 — Browser Back bypasses originating focus restoration and changes browsing state

**Evidence:** `src/App.tsx:188–201,228,236–245`; `src/graph/model.ts:177–184`.

`popstate` never sets the originating focus ID. It also unconditionally expands a destination folder and requests that it be revealed, unlike **Back to folder**.

**Reproduction:**

- Open a file with the keyboard, then use browser Back. The document heading disappears, but no code restores focus to the originating file action.
- For a visible-state repro, select and collapse a folder, open a file visible in another branch, then use browser Back. The selected folder is expanded again; revealing it can also recenter the graph (`src/graph/GraphCanvas.tsx:133–143`).

This violates the equivalent restoration/no-reset contract in `docs/PRD_SLICE2.md:83–84`.

**Required correction:** distinguish returning to an originating browsing entry from ordinary folder-link navigation.

**Coverage gap:** browser-history assertions check URL, visibility, and identity, not focus or preserved viewport/expansion (`tests/document.spec.ts:198–214`).

### P1 — Reopening the same file shows its previous result while a fresh request is pending

**Evidence:** `src/document/useDocument.ts:23–28,30–38,53–57`; `src/document/DocumentView.tsx:89–91`.

Leaving a document retains `settled`. Reopening without pressing Retry recreates the same request key, so the old ready/error result immediately qualifies as current even though a new fetch starts.

**Reproduction:**

1. Open a scratch file successfully.
2. Return to browsing and change or delete that file.
3. Delay its next `/api/file` response.
4. Reopen it.

Old content and hash remain visible with `aria-busy="false"` until the request settles. A previously failed file similarly displays its old failure instead of the new loading state.

**Required correction:** each opening must represent a fresh request lifecycle, not reuse a settled result solely because its URL matches.

**Coverage gap:** the deletion test checks the eventual 404, not the pending reopen state (`tests/document-failure.spec.ts:59–65`). Delayed-response tests cover other-file navigation, not this settled same-file case (`tests/document.spec.ts:217–266`).

### P2 — Direct-link and retry loading are not announced through the live region

**Evidence:** `src/App.tsx:99,192,205–207,217,322`; `src/document/useDocument.ts:53`; `src/document/DocumentView.tsx:55–56`.

Loading announcements are emitted by `openFile` and file `popstate`. Initial direct navigation starts with an empty announcement; Retry only increments an attempt. The visible loading paragraph is not a live region.

**Reproduction:** delay `/api/file` during a direct document load, or delay a retry after a failed read. The status region remains empty or retains the prior failure announcement.

**Required correction:** announce loading for every request entry path, as required by `docs/PRD_SLICE2.md:68`.

**Coverage gap:** the loading-announcement test opens from an already loaded graph (`tests/document-failure.spec.ts:140–147`).

### P2 — Malformed direct links remain a documented acceptance gap

**Evidence:** `docs/HANDOFF_SLICE2.md:52`; `tests/document-failure.spec.ts:73–77`; `docs/PRD_SLICE2.md:79`.

The handoff reports that Vite returns 404 before the SPA loads for malformed percent encoding. The test deliberately substitutes `pushState` for actual direct navigation.

Consequently, pasting `/file/Pi/%E0%A4%A` does not exercise or establish the required invalid-link UI. This behavior was **reported by the handoff, not independently reproduced** here.

**Required action:** verify actual direct/reload behavior and resolve or explicitly accept the deployment limitation. The in-app parser test is not equivalent coverage.

### P1 — TDD evidence does not support the blanket test-first claim

**Evidence:** `docs/HANDOFF_SLICE2.md:18,25–27`; `docs/PRD_SLICE2.md:163–171,205–215`.

The handoff says each increment first failed for missing behavior, but its Increment 4 row explicitly records GFM, exact Source, empty states, tabs, and raw HTML **already passing because their implementation existed in Increment 3**.

- The documented external-link/image failures support red→green for those behaviors.
- Temporarily enabling `rehype-raw` demonstrates a useful negative-control test, not historical test-first implementation.
- Final green coverage cannot establish the required development sequence.

**Required action:** correct the blanket claim and distinguish observed test-first increments from later regression coverage. Provide existing contemporaneous evidence where available; do not manufacture retrospective TDD evidence.

## What was NOT done

- No tests, lint, or build were rerun. `git diff --check` produced no diagnostics; fixture status was clean at inspection.
- Final browser coverage is substantial: raw HTML execution/DOM checks, exact CRLF Source, HTTPS interception, responsive styling, and bounded large-document checks (`tests/document-render.spec.ts:110–117,200–299`; `tests/document-failure.spec.ts:169–226`).
- That coverage does not establish the missing history/reopen cases above.
- Browser configuration covers Chromium with reduced motion; animated-layout restoration remains unverified (`playwright.config.ts:9–13`).
- API validator internals and Slice 3 scope were outside this focused UI review.

## What to verify

- [ ] Exercise repeated openings of one URL from different origins and restore each historical context.
- [ ] Assert browser Back restores focus, collapsed state, mode, viewport, pins, positions, and outline scroll.
- [ ] Delay same-file reopening after disk changes/deletion; require loading rather than old content/hash.
- [ ] Check loading announcements on direct links, reload, and Retry.
- [ ] Test malformed direct links against both supported serving modes.
- [ ] Keep TDD evidence separate from final coverage/results.
- [ ] After corrections, run unit tests, browser tests, lint, build, and fixture-cleanliness checks required by the PRD.

## Understanding check

- **Does keeping App state alive provide historical restoration?** No; it preserves the latest state, not each opening’s snapshot.
- **Are different-file stale responses guarded?** Yes, through identity gating and abort checks; same-file reopening still reuses an old settled key.
- **Does the HTML test meaningfully guard rendering safety?** Yes: it checks literal text, absent interpreted elements, and absent execution (`tests/document-render.spec.ts:254–264`).
- **Do reported passing tests prove TDD compliance?** No; the handoff itself documents already-implemented behaviors passing on their first recorded run.