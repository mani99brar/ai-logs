# Shutter manual reveal silently discards the juror's justification

Source: https://github.com/kleros/kleros-v2/issues/2565

## Summary
In the Shutter DK manual recovery reveal (used when Shutter keypers are down and the juror reveals themselves), the juror's commit-time justification is silently dropped and an empty justification is recorded on-chain.

## Cause
### Shutter/Reveal.tsx:
 hardcodes justification: "" into revealVote (the setter is unused; two TODOs remain). In resolveRevealInputs.ts:

```ts
const justification = params.justification ?? stored?.justification ?? "";
```

`??` is nullish, and `""` is not nullish, so passing `""` defeats the fallback to the justification stored at commit time (localStorage).

Fix
(safe default) Pass undefined instead of "" from Shutter/Reveal.tsx, so resolveRevealInputs restores the stored commit-time justification.
(optional enhancement, the existing TODOs) Render a justification input in the recovery flow so the juror can edit it, the contract permits a fresh justification on the juror's own reveal (choice stays locked).

