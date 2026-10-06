---
name: shutter-reveal-fix-pending
description: "kleros-v2 #2565 fix is on local branch fix/shutter-reveal-justification, unpushed; TODO-tracking gap left open on purpose"
metadata:
  node_type: memory
  type: project
  originSessionId: de0afaad-c8d0-411c-b4b3-a2b8e5555768
  modified: 2026-09-28T10:20:06.941Z
---

State as of 2026-09-28: the #2565 fix (Shutter manual reveal drops the commit-time justification) is done on the LOCAL branch `fix/shutter-reveal-justification` (commit d2ee89b8 = dev + fix; 2 files: `Shutter/Reveal.tsx` drops the dead `useState("")` + both TODO comments and omits `justification`; `resolveRevealInputs.test.ts` +1 precedence test). Checks green (tsc, eslint, vitest 172). NOT pushed — user will return to it.

Open item the user said "let it be for now": the two deleted TODOs were only half done (stored justification is now used; editing it / entering one when none is stored is NOT built). That leftover is recorded only in local-only `decisions.md`, and the commit says "Closes #2565", which would close the only upstream record of the optional editor enhancement. Options offered: keep one accurate TODO comment in `Reveal.tsx` (recommended), or "Refs #2565" / a follow-up issue (outward-facing — user's call).

**Why:** user explicitly deferred this and asked me to keep a note so we return to it.
**How to apply:** when the user returns to #2565 or before any PR is opened, raise this open item first; still never push ([[no-push-workflow-local-only]]). Run log: `~/dev/kleros/workflow-monitor/shutter-reveal-justification-001.log`. See [[kleros-v2-workflow-setup]].
