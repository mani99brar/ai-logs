# Decisions: shutter-reveal-justification

From the grill session of 2026-09-28 with the operator.

## Decisions

- Scope is the issue's safe default only; no justification editor in the manual-reveal flow: no UI, no translation keys, `web/src/locales` stays outside the owned paths.
- The fix lives only in `web/src/pages/Cases/CaseDetails/Voting/Shutter/Reveal.tsx`: remove the unused `justification` state and its two TODOs, and omit `justification` (undefined) from the `useRevealVote` params so `resolveRevealInputs` falls back to the stored commit-time text.
- `web/src/actions/reveal/resolveRevealInputs.ts` and `web/src/hooks/useRevealVote.ts` keep their current behaviour and documented rule (an explicit `""` still wins); no hardening of the helper.
- The regression is proven by a new component test `web/src/pages/Cases/CaseDetails/Voting/Shutter/Reveal.test.tsx`: render `Reveal` with `useRevealVote`, the dispute queries, `useParams` and i18n mocked, click the reveal button, and assert the mutation params carry no `justification`. It must fail on the current code.
- Add one case to `web/src/actions/reveal/resolveRevealInputs.test.ts`: the exact params `Reveal.tsx` now sends plus a stored record `{ salt, choice, justification: "stored text" }` resolve to `justification: "stored text"`.

## Assumptions

- The "no stored record" and "explicit non-empty justification wins" acceptance items are satisfied by the existing `resolveRevealInputs.test.ts` cases, as long as they still pass unchanged; new tests are needed only for the two items above.
- The component test is the first `.test.tsx` in `web`; mock at module level with `vi.mock` and keep the mocks inside the test file, with no shared test utilities added outside the owned paths.
- The Gated-Shutter kit uses the same `Shutter` voting component, so it is covered by the same fix without a separate test.
- Commits follow Conventional Commits, e.g. `fix(web): keep commit-time justification in shutter manual reveal`.

## Deferred

- A justification editor in the manual-reveal flow (the issue's optional enhancement), including a juror revealing from a browser without the stored record, who still sends an empty justification.
- Treating an empty or whitespace-only `justification` as absent in `resolveRevealInputs`.
- Porting #2272 (mandatory justification, merged on `master` only) to `dev`, which touches the same Shutter files.
