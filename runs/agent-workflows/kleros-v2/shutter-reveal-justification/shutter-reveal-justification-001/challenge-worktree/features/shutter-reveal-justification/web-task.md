# Task: web

## Goal

When a juror reveals a Shutter (or Gated-Shutter) vote themselves, which is the manual recovery path when the Shutter keypers do not reveal it, the transaction carries the justification the juror wrote at commit time and stored in localStorage, instead of an empty string. Scope and fix layer are set in `decisions.md`.

## Context

- Issue: `features/shutter-reveal-justification/issue-2565.md` (GitHub #2565).
- `web/src/pages/Cases/CaseDetails/Voting/Shutter/Reveal.tsx` keeps a `justification` state that is always `""` (its setter is unused, and there are two TODOs about it) and passes it to `useRevealVote`.
- `web/src/actions/reveal/resolveRevealInputs.ts` computes `params.justification ?? stored?.justification ?? ""`. `??` treats `""` as a value, so the stored justification is never used on this path.
- The commit stores `{ salt, choice, justification }` under `getVoteKey(disputeId, roundIndex, voteIds)` (`web/src/actions/helpers/storage`); `useRevealVote` removes it after a successful reveal. The Shutter voting component is registered for both the Shutter and the Gated-Shutter kits (`web/src/dispute-kits/registry.ts`).
- The Classic reveal (`Voting/Classic/Reveal.tsx`) collects its justification at reveal time and passes it explicitly. Its behaviour must not change.
- Existing tests: `web/src/actions/reveal/resolveRevealInputs.test.ts`, `resolveRevealInputs.integration.test.ts`, `builders/shutter.builder.test.ts`. `web/src/test/setup.ts` mocks localStorage. React Testing Library and jsdom are available; there is no component test yet, so a new one follows `web/vitest.config.ts`.

## Constraints

- Change only the owned paths in `policy.json`. Keep the existing structure, names and patterns. No new dependencies.
- The contract call, the storage format and the Classic reveal behaviour stay as they are.

## Acceptance

- A unit test proves that the Shutter reveal, with a stored commit record `{ salt, choice, justification: "stored text" }`, sends `justification: "stored text"` to the reveal builder, exercising the same inputs `Shutter/Reveal.tsx` passes (the test fails on the current code).
- A unit test proves that with no stored record the reveal still resolves (salt regenerated, choice brute-forced) and sends an empty justification.
- A unit test proves that an explicitly provided non-empty justification still wins over the stored one (the Classic path).
- Existing `resolveRevealInputs` and builder tests still pass unchanged, unless `decisions.md` says a tested behaviour changes.
- The policy checks pass: `yarn workspace @kleros/kleros-v2-web check-types`, `check-style` and `test`.

## Stop

Report `blocked` instead of continuing when any of these happens:

- A setup step (`bash features/_shared/web-setup.sh install|build|codegen`) fails twice for reasons outside the repository (registry, network, subgraph endpoint).
- A check can pass only by changing a path outside the owned paths.
- After sixty minutes of work, a required check still fails and you cannot name the next fix.

Report `question` only for a choice that would change this acceptance.
