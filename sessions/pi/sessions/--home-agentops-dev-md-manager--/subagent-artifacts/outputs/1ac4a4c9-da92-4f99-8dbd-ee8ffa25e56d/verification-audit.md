# Verification audit

Read-only inspection completed. No files changed, tests with filesystem writes run, or workflows/agents launched. Two evidence-validation failures were confirmed with in-memory probes.

## 1. P1 — Cached worker evidence can satisfy candidate verification

**Location:** `workflow/checks.py:147–151`, `workflow/checks.py:266–268`

**Trigger:** A worker packet is restored/copied into a candidate attempt’s packet location, with the same output commit and policy. This is possible for a no-change run where both phases verify the base commit.

Cache reuse checks only the commit and policy digest. It does not compare the requested phase, run, node, attempt, base, session, changed files, or verification directory. Rechecking then trusts the packet’s own `expected` and `phase`.

**Impact:** A worker packet with failed build/browser checks can return `passed` during candidate verification because those failures remain deferred. `Pipeline.candidate()` accepts that gate at `workflow/pipeline.py:498–505`.

**Confirmed:** An in-memory call requesting candidate attempt 2 returned worker attempt 1 with `status: passed`, despite a recorded build exit code of 1.

**Test gap:** `workflow/test_verification.py:178–193` tests explicit phase changes, not reuse of a packet whose stored phase differs from the caller’s requested phase.

## 2. P1 — Bundle validation does not require complete, candidate-bound evidence

**Location:** `workflow/pipeline.py:524–536`

**Trigger:** A retained review bundle has an empty or incomplete `packets` array, duplicate worker references instead of candidate references, or packets whose internally consistent identities do not match its candidate.

Validation checks bundle run/policy identity and validates only the references present. It does not require one worker and one candidate packet per selected lane, bind packet revisions/phases to the bundle, or compare the bundle’s base/snapshots with the plan.

**Impact:** Missing candidate verification can be treated as validated evidence. `integrate()` relies on this validator (`workflow/pipeline.py:543–564`), so an otherwise approved bundle can authorize integration without the required checks. Review and approval remain required; this is an evidence-integrity failure, not an approval bypass.

**Confirmed:** An in-memory bundle with `packets: []`, empty snapshots, and a base different from the plan was accepted.

**Test gap:** Pipeline tests exercise changed artifact hashes and stale review digests, but not missing/duplicate packet coverage or packet-to-candidate identity mismatches.

## 3. P2 — Valid Unicode filenames prevent snapshot capture

**Location:** `workflow/pipeline.py:409–411`; compare `workflow/pipeline.py:211–214`

**Trigger:** A worker changes an owned file such as `docs/café.md` under Git’s default `core.quotePath` behavior.

`changed_files()` reads NUL-delimited, unquoted filenames. The captured-tree comparison instead reads ordinary `git diff-tree --name-only` output and splits lines. Git quotes/escapes non-ASCII filenames in that output.

**Impact:** The same unchanged filename compares unequal between the two representations. Freeze incorrectly raises “Files changed during snapshot,” blocking a valid run. Retrying unchanged inputs cannot resolve it.

**Test gap:** Ownership tests use ASCII filenames; there is no snapshot test covering Unicode or other Git-quoted names.

## Boundary assessment

The runner explicitly documents trusted executable checks rather than sandboxing. Accordingly, shared-UID access and arbitrary malicious test code are not reported here as security vulnerabilities. The findings above concern the promised stale-evidence rejection and deterministic snapshot correctness.