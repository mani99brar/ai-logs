# Slice 2 review fixes — completed

## Implemented

All accepted corrections are implemented; no implementation fixes remain pending:

1. **Race-safe reads:** owner-approved Linux/procfs descriptor walk; startup-pinned fixture root, `O_NOFOLLOW` on every source/intermediate/final component, final regular-file `fstat`, one descriptor read, retained/closed handles, fail-closed capability checks. No pathname fallback or dependency added.
2. **Safe filesystem classification:** unavailable/missing targets return 404; unexpected metadata/read failures return safe 500.
3. **History restoration:** immutable page-session browsing snapshots keyed by history entry, not document URL. Restores selection, mode, expansion, positions/pins, viewport, outline scroll and originating focus without forced reveal/re-expansion/Fit. Reload discards origins and falls back to the containing folder.
4. **Fresh reopen lifecycle:** same-file reopening starts loading without stale ready/error/content/hash; abort/stale protections retained.
5. **Loading announcements:** direct links, reloads, retry, click and history use the request lifecycle.
6. **Malformed direct/reload links:** actual navigation works in both supported dev and preview modes; no pushState substitute.

The handoff’s blanket historical TDD claim is corrected. An additional final-regression performance failure was fixed without weakening its <2s bound: preserve the hidden memoized rendered subtree between tabs instead of reparsing unchanged Markdown.

## Changed files during these corrections

- Backend: `server/files.ts`, `server/app.ts`, `server/file.test.ts`.
- Client: `src/App.tsx`, `src/graph/layout.ts`, `src/graph/GraphCanvas.tsx`, `src/document/useDocument.ts`, `src/document/DocumentView.tsx`.
- Serving/test configuration: `server/index.ts`, `vite.config.ts`, `playwright.config.ts`.
- Browser tests: new `tests/document-review.spec.ts`, `tests/document-history-review.spec.ts`; updated `tests/document-failure.spec.ts`, `tests/document-render.spec.ts`.
- Documentation: `README.md`, `docs/HANDOFF_SLICE2.md`, minimal integration caution in `docs/PRD_SLICE3.md`.

Existing uncommitted Slice 2 work was preserved. No Slice 3 functionality, staging, reset, stash, commit or push. Branch remains `main`, HEAD `cec5fce`.

## Observed Red → Green

- API regressions: **6 failures / 13 passes**, including three deterministic outside-byte disclosures, incorrect ENOENT/EIO statuses and absent capability rejection; then **19 passes**. Expanded component replacement/cleanup/capability tests are explicitly labelled subsequent regression coverage.
- UI review suite: seven intended initial failures plus one excluded locator-authoring failure. Corrected repeated-origin test then failed for missing Back focus. All tests now pass.
- Session/reload history: **2 failures / 1 pass → green**; browse-to-browse viewport test separately **1 failure → 1 pass**.
- Operational read ENXIO: **404 instead of 500 → pass**.
- Large-document regression: Rendered return **2043ms** exceeded the unchanged **<2000ms** gate. After tab retention, focused performance command passed **3/3**.
- First full preview run found an image-test harness issue: production JS/CSS `/assets/` URLs were mistaken for document image requests. The test now observes image resources and requires exactly the intercepted HTTPS image. This is not claimed as a product Red.

Full observed commands, intermediate test-authoring issues and historical evidence distinctions are in `docs/HANDOFF_SLICE2.md`.

## Final validation and exact commands

```sh
npm run test:unit
# 47 passed
npm run lint
# clean
npm run build
# tsc -b + vite build succeeded
MD_MANAGER_WEB_PORT=5184 MD_MANAGER_API_PORT=3014 npm run test:e2e
# 50 passed, one worker, 56.8s
MD_MANAGER_TEST_PREVIEW=1 MD_MANAGER_WEB_PORT=4184 MD_MANAGER_API_PORT=3014 npm run test:e2e
# 50 passed, one worker, 38.1s
git diff --check
# clean
git status --short -- fixtures/
# empty
find fixtures -name 'scratch-*' -print
# empty
git diff --cached --name-only
# empty
```

Focused performance command:

```sh
MD_MANAGER_WEB_PORT=5184 MD_MANAGER_API_PORT=3014 npx playwright test tests/document-failure.spec.ts -g 'over 100 KB' --repeat-each=3
```

Ports are environment overrides, not permanent alternate defaults. Playwright independently owns/checks both servers with `reuseExistingServer:false`; Vite uses strict ports. Existing 5173/3001 services were not intentionally killed or reused; their watchers naturally restart workers on source edits. At recovery verification, both existing services remained listening, alternate test ports were free, and no test/debug process remained.

Completed final-run logs were verified after timeout recovery:

- `/tmp/slice2-unit-final3.log`
- `/tmp/slice2-lint-final2.log`
- `/tmp/slice2-build-final2.log`
- `/tmp/slice2-e2e-final3.log`
- `/tmp/slice2-preview-final4.log`

Recovery made no implementation edits or reruns: only verified completion/cleanliness and corrected two tiny handoff presentation issues (table spacing and a stale historical cross-reference).

## Residual risks / boundaries

- Backend is Linux/procfs-only, explicitly owner-approved. Configured fixture-root ancestors are trusted startup configuration; requests cannot choose them. No unsafe fallback.
- Historical test-first development for every original PRD behaviour cannot be established retrospectively. The handoff now states this honestly; present green coverage is not substituted for historical evidence.
- Browser gates cover Chromium with reduced motion, not all browsers/devices. Cross-reload layout persistence remains intentionally absent.
- Slice 3 must preserve descriptor-relative confinement and design mutation/atomic-replacement races separately; do not validate a path and then write/rename through an ordinary pathname.

## Recommended next step

Fresh independent review and validation of the intentionally dirty Slice 2 worktree. No worker action or architecture decision remains pending.
