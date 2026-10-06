## TL;DR

**Three verified P1 findings** in `03a6fb8...a5e1a5d`: Reload can corrupt saved text, and two operation-lifecycle paths silently discard drafts. Changes requested.

## Change map / walkthrough

- Reload replaces content/hash but retains initial serialization metadata.
- Pending operation dialogs disable buttons but still accept Escape.
- Mutation completion closes the dialog before awaiting listing refresh, then navigates unconditionally.

## Decisions and assumptions

The code assumes that reloaded encoding properties remain unchanged, disabled buttons prevent cancellation, and the initiating navigation context remains current across asynchronous work. The reproductions below invalidate those assumptions.

## Findings

### P1 — Refresh serialization metadata when Reload replaces the document

**Narrow location:** `src/document/EditingSession.tsx:60–61`.

Reload installs fresh content/hash without updating the original BOM/newline analysis (`src/document/DocumentView.tsx:75–79,150`). CodeMirror then replaces and serializes text using that stale analysis (`src/document/Editor.tsx:73,90–91`).

**Verified reproduction:** Open a BOM-prefixed document, edit, receive a conflict after an external replacement without BOM, then Reload `NEW disk text\n`. The editor displays `EW disk text`, becomes Unsaved, and the next Save submits:

```text
\uFEFFEW disk text\n
```

The first character is lost and an unwanted BOM inserted. The fresh hash allows this corrupted content through conflict protection.

**Required correction:** Revalidate fresh content’s round-trip eligibility and update both CodeMirror decoding and serialization metadata atomically with Reload.

**Contract:** `docs/PRD_SLICE3.md:49–50,84–87`.

### P1 — Block native cancellation while an operation request is pending

**Narrow location:** `src/operations/OperationDialog.tsx:186–192`.

Cancel is disabled, but `Modal` receives an unconditional cancellation callback. Its native Escape handler invokes that callback regardless of pending state (`src/ui/Modal.tsx:29–30`). The request continues and still invokes `onSuccess`.

**Verified reproduction:** Enter Edit with a clean document, submit Rename, and hold its response. Press Escape despite the disabled Cancel button. The dialog closes and the editor accepts a new dirty draft. Release the successful response: `src/App.tsx:390–394` changes the URL and destroys the editor without a Discard confirmation.

**Required correction:** Protect native cancellation while pending, not just buttons. Late mutation completions must also respect the current editing context.

**Contract:** `docs/PRD_SLICE3.md:101–103,131–133`.

### P1 — Guard delayed operation-completion navigation against newer drafts

**Narrow location:** `src/App.tsx:396–400`.

`completeOperation` closes the modal at line 384, awaits listing refresh, then opens the created file without checking whether the user has navigated elsewhere or started editing.

**Verified reproduction, without Escape:** Create `created.md`, acknowledge the mutation, and hold its subsequent entries refresh. Open `existing.md` and type an unsaved draft. Release the listing response:

```text
Before: /file/Pi/existing.md — Unsaved
After:  /file/Pi/created.md — editor absent; no Discard dialog
```

The unrelated draft is silently lost. Folder and delete completion branches likewise contain unguarded delayed navigation.

**Required correction:** Bind completion navigation to its originating context; do not abandon a newer dirty/pending session without the navigation guard.

**Contract:** `docs/PRD_SLICE3.md:101–103,134–136`.

No separate P0 or P2 findings asserted.

## What was NOT done / residual risks

- No edits, staging, commits, GitHub posting, or fixture writes.
- All three browser reproductions intercepted API requests; no actual mutation reached the backend.
- Browser-history draft loss is explicitly out of scope and was not flagged.
- Parent reports the operations retest plus fixture-clean check passed **9/9**. The original New-file E2E timeout remains timing-sensitive and is **not** an additional finding.
- Broader Reload encoding transitions remain untested.

## What to verify

- Regression: Reload changes BOM presence; assert exact text and subsequent PUT bytes.
- Regression: Escape during delayed Rename cannot expose an editor that late completion silently discards.
- Regression: Delayed post-create entries refresh cannot abandon a newer dirty editor.
- Existing pure edit-session tests passed **11/11**, but do not exercise these component-lifecycle combinations.

## Understanding check

- **Can a fresh hash prevent the Reload corruption?** No; the corrupted client text is submitted using that valid hash.
- **Does disabling Cancel protect a pending dialog?** No; Escape invokes a separate unconditional handler.