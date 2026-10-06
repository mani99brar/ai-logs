# Changelog

## 1.1.2 — 2026-09-20

- Allowed empty optional decision-record arrays; retained required acceptance criteria and rejected obvious acceptance/slice placeholders instead of suggesting “none”.
- Clarified that useful completed-PRD slices/criteria require semantic judgment; documented fresh reviewer sessions with explicit prior-file context.
- Added record-validation regressions and generated-workflow tests for fresh/no-resume launch arguments and immediate PASS stopping. No new orchestration or features.

## 1.1.1 — 2026-09-20

- Organized executable code and tests under scripts/, static templates/fixture under assets/, and on-demand documentation under references/.
- Updated runtime paths and invocation examples; behavior unchanged. Normal use still loads only SKILL.md in the parent.
- Documented the intentional Pi-only explicit-invocation flag, which the upstream strict frontmatter validator does not accept.

## 1.1.0 — 2026-09-20

- Added best-effort, unfocused Herdr live-output tabs for Claude calls; `begin --view off` opts out.
- Claude streams text/structured-output progress while Python retains process ownership, timeouts and validation.
- Viewer displays no private thinking, strips terminal controls and never sends record content to a shell.
- Added observer/stream regression tests; verified a real subscription-authenticated Claude call in a Herdr tab.

## 1.0.1 — 2026-09-20

- Shortened everyday instructions and embedded only the decision-record input shape.
- Removed routine parent reads of implementation sources and full templates; review instructions stay with the challenger.
- Moved maintenance/troubleshooting to an on-demand reference. Helper, workflow, safeguards and tests unchanged.

## 1.0.0 — 2026-09-20

- Explicit-only Pi skill; parent-extracted, frozen decision record.
- Fresh, tool-disabled Claude Code subscription drafting with bounded subprocesses.
- Native fresh challenger workflow, structured evidence and parent-authorized revisions.
- Three-draft/three-review ceiling, deadlines, fail-closed validation, per-run artifacts and usage.
- Mock/process tests and a real sanitized MD Manager end-to-end run.
- Validation-driven fixes: distinguish blocking questions from deferred questions; consume native structuredOutput rather than decorated/empty prose output; capture authoritative native evidence before accepting PASS.
