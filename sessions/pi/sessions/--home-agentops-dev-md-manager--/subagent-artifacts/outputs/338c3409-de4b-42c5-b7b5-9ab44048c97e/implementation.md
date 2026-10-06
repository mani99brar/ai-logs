# Implementation handoff

Implemented all six review fixes on `slice-3-editing-and-file-operations`, starting and remaining at `a5e1a5d`.

## Changes

1. Reload validates fresh UTF-8 round-trip eligibility and installs content/hash/BOM/newline rules together. CodeMirror remounts on explicit draft replacement, eliminating captured stale serialization. DocumentView derives re-entry eligibility from the acknowledged document. Non-roundtrippable reloads become read-only and retain a selectable previous draft, including across repeated reloads; late reload responses cannot affect abandoned sessions.
2. Modal blocks native Escape cancellation while pending, shared by OperationDialog and ConfirmDialog.
3. Operation completion captures a monotonically increasing navigation context. All automatic navigation branches refuse stale contexts or dirty/pending/conflicted editors; browser history remains native. Departing history dismisses stale dialogs, while completed mutations still refresh/announce outcomes without closing newer dialogs.
4. Saves use bounded random non-Markdown staging names independent of target basename.
5. Create/copy stage bytes and permissions privately and publish by exclusive hard link. Failures clean only the staging name, preserving external destination entries and collision/symlink guarantees.
6. Final PUT target disappearance/symlink/unavailable replacement maps to HASH_CONFLICT; unrelated EIO remains a server error.

## Verification and limitations

Final unit/lint/build pass. An earlier full browser run passed 97/97. The final expanded run passed 97/98: the existing create/double-submit test timed out with the listing still Refreshing. Supervisor confirmed this had also reproduced on the original baseline and approved a bounded five-repeat trace investigation. All five repeats passed. Successful trace inspection showed the expected mutate 201 → entries 200 → file GET 200 lifecycle; it did not establish the failure cause, so no test synchronization workaround was made. Treat this flake as disclosed, not as a clean final full-suite pass. Independent reviewer/validator should run dev/preview gates.

Additional development-only failures were corrected: initial TypeScript mock parameter annotations and hook declaration ordering; one new history test attempted to double-click an off-screen graph node and was changed to keyboard focus/Enter. A mistakenly anchored Playwright grep selected no tests; corrected command ran the approved five repeats. No infrastructure or product-scope workarounds were introduced.

The external-writer recheck/rename race remains. No special-permission-bit expansion, persistent draft recovery, hashing redesign, or non-Linux backend changes were made.

Recommended next step: independent review and dev/preview validation. No staged files or fixture changes remain.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Implemented all six requested fixes in 13 files; no dependencies, route contracts, hashing algorithm, browser-history interception, commits or staged files changed."
    },
    {
      "id": "criterion-2",
      "status": "satisfied",
      "evidence": "Added 13 API and 20 browser regression cases; observed failing-before evidence; 102 unit tests, lint and build pass. Final full browser run: 97/98 pass, one disclosed pre-existing intermittent test; affected test passed 5/5 traced repeats. Independent review remains required."
    }
  ],
  "changedFiles": [
    "server/files.ts",
    "server/mutate.test.ts",
    "server/mutations.ts",
    "server/write.test.ts",
    "src/App.tsx",
    "src/document/ConfirmDialog.tsx",
    "src/document/DocumentView.tsx",
    "src/document/EditingSession.tsx",
    "src/document/Editor.tsx",
    "src/operations/OperationDialog.tsx",
    "src/ui/Modal.tsx",
    "tests/edit-recovery.spec.ts",
    "tests/operations.spec.ts"
  ],
  "testsAddedOrUpdated": [
    "server/write.test.ts: six cases for long ASCII/UTF-8 basenames and final-check disappearance/symlink/EIO classification",
    "server/mutate.test.ts: seven cases for partial-write/chmod cleanup, retries, external destination preservation and exclusive publication collisions",
    "tests/edit-recovery.spec.ts: eight cases for BOM/newline reload lifecycle, invalid-byte/mixed-newline read-only recovery, repeated recovery, pending Escape and abandoned-session responses",
    "tests/operations.spec.ts: twelve cases for pending Rename Escape, held listing/operation responses, dirty editors and browser-history departure/return"
  ],
  "commandsRun": [
    {
      "command": "npx tsx --test server/write.test.ts server/mutate.test.ts",
      "result": "failed",
      "summary": "Test-first baseline: 33 passed, 8 expected regressions failed; /tmp/md-review-server-red.log."
    },
    {
      "command": "MD_MANAGER_WEB_PORT=5284 MD_MANAGER_API_PORT=3114 npx playwright test tests/edit-recovery.spec.ts tests/operations.spec.ts --grep 'serialization metadata|non-roundtrippable|pending Reload|pending Rename|delayed create|late .* response after'",
      "result": "failed",
      "summary": "Test-first baseline: all 13 new cases failed for expected behavior; /tmp/md-review-browser-red.log."
    },
    {
      "command": "npx tsx --test server/write.test.ts server/mutate.test.ts",
      "result": "passed",
      "summary": "Initial server green: 41/41; /tmp/md-review-server-green.log."
    },
    {
      "command": "MD_MANAGER_WEB_PORT=5284 MD_MANAGER_API_PORT=3114 npx playwright test tests/edit-recovery.spec.ts tests/operations.spec.ts --grep 'serialization metadata|non-roundtrippable|pending Reload|pending Rename|delayed create|late .* response after'",
      "result": "passed",
      "summary": "Initial browser green: 13/13; /tmp/md-review-browser-green.log."
    },
    {
      "command": "MD_MANAGER_WEB_PORT=5284 MD_MANAGER_API_PORT=3114 npx playwright test tests/edit.spec.ts tests/edit-recovery.spec.ts tests/operations.spec.ts tests/zz-fixtures-clean.spec.ts",
      "result": "passed",
      "summary": "Focused integration suite: 40/40; /tmp/md-review-focused.log."
    },
    {
      "command": "MD_MANAGER_WEB_PORT=5284 MD_MANAGER_API_PORT=3114 npx playwright test tests/edit-recovery.spec.ts --grep 'non-roundtrippable'",
      "result": "failed",
      "summary": "Additional test-first repeated read-only reload assertions found recovery-draft replacement: 2 failures; fixed before final checks; /tmp/md-review-retry-red.log."
    },
    {
      "command": "MD_MANAGER_WEB_PORT=5284 MD_MANAGER_API_PORT=3114 npx playwright test tests/edit-recovery.spec.ts --grep 'non-roundtrippable|read-only Reload can recover'",
      "result": "passed",
      "summary": "Repeated read-only reload and editable recovery: 3/3; /tmp/md-review-retry-green.log."
    },
    {
      "command": "npm run test:unit",
      "result": "passed",
      "summary": "Final: 102/102; /tmp/md-review-unit-final.log."
    },
    {
      "command": "npm run lint",
      "result": "passed",
      "summary": "Final: no errors/warnings; /tmp/md-review-lint-final.log."
    },
    {
      "command": "npm run build",
      "result": "passed",
      "summary": "Final: TypeScript and Vite pass; bundle-size advisory only; /tmp/md-review-build-final.log."
    },
    {
      "command": "MD_MANAGER_WEB_PORT=5284 MD_MANAGER_API_PORT=3114 npm run test:e2e",
      "result": "passed",
      "summary": "Earlier complete run: 97/97, before adding final recovery case; /tmp/md-review-e2e.log."
    },
    {
      "command": "MD_MANAGER_WEB_PORT=5284 MD_MANAGER_API_PORT=3114 npm run test:e2e",
      "result": "failed",
      "summary": "Final expanded run: 97/98 passed; existing New-file validation/double-submit test timed out while post-operation listing remained Refreshing; /tmp/md-review-e2e-final.log."
    },
    {
      "command": "MD_MANAGER_WEB_PORT=5284 MD_MANAGER_API_PORT=3114 npx playwright test tests/operations.spec.ts --grep 'New file in the selected folder validates' --repeat-each=5 --trace on",
      "result": "passed",
      "summary": "Supervisor-approved bounded investigation: affected test 5/5 passed, no reproduction. Traces under ignored test-results; /tmp/md-review-create-repeat.log. No synchronization change without evidence."
    },
    {
      "command": "git diff --check && test -z \"$(git diff --cached --name-only)\" && test -z \"$(git status --short -- fixtures/)\"",
      "result": "passed",
      "summary": "Whitespace check clean, no staged files, no modified/untracked fixtures."
    }
  ],
  "validationOutput": [
    "102 unit tests passed; lint/build passed.",
    "Initial full E2E 97/97; final expanded E2E 97/98; intermittent existing test passed five traced repeats.",
    "Fixture cleanliness passed, branch slice-3-editing-and-file-operations remains at a5e1a5d."
  ],
  "residualRisks": [
    "One existing intermittent browser test remains unresolved: New-file validation/double-submit test sometimes waits indefinitely for post-mutation listing. Supervisor reports the same baseline failure; no unproven test/app workaround applied.",
    "External writers can still race the final PUT recheck and rename; no OS-wide compare-and-swap claim.",
    "Linux/procfs and Chromium coverage only; preview-mode validation and independent review not run by this worker.",
    "Vite emits the existing large-bundle advisory; no dependency or bundling scope expansion."
  ],
  "noStagedFiles": true,
  "diffSummary": "13 files, 534 insertions/75 deletions: bounded staging and exclusive publication; precise final-check conflicts; atomic editor reload metadata/read-only recovery; pending modal cancellation protection; navigation-context scoped operation completion; 33 new regression cases.",
  "reviewFindings": [
    "Self-review corrected retained-draft replacement on repeated read-only reload; regression now green.",
    "No additional implementation blockers identified by worker; independent reviewer gate remains pending."
  ],
  "manualNotes": "No commits, pushes, dependency upgrades, subagents or GitHub activity. Browser suites ran serially on ports 5284/3114. New tests touch only uniquely owned scratch fixtures. Existing server stage-interception tests already use O_EXCL rather than target-derived temp-name patterns and continued passing unchanged."
}
```
