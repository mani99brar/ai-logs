# Automatic workflow audit

Read-only inspection of `workflow/automatic.py`, `launch.py`, supporting session/pipeline code, and related tests. No tests, workflows, or agents launched; no files changed.

## Findings

### P1 — Worker cleanup stops at the first failure
**Location:** `workflow/pipeline.py:356–358`; automatic failure cleanup in `workflow/automatic.py:808–817`.

**Trigger:** A worker deadline, invalid completion, or missing session aborts supervision, then stopping the first worker raises—for example, because that session is missing or its native stop command fails.

**Impact:** Remaining workers receive no stop attempt. The controller logs the cleanup failure and exits, leaving other permission-bypassed sessions running without deadline enforcement.

**Test gap:** `test_deadline_or_blocked_worker_stops_workers` mocks the entire cleanup method. `test_failed_stop_and_lingering_pid_block_freeze` checks failure propagation but not whether later workers are stopped. Reviewer cleanup already explicitly continues past individual stop failures.

### P2 — Accepted reviewer decisions are lost across controller interruption
**Location:** `workflow/automatic.py:255–272, 347–354, 370–372`.

**Trigger:** Reviewer A approves before its deadline while B remains active. The controller is interrupted, then resumes after A’s deadline but before B’s later deadline.

**Cause:** Acceptance persists `status` and `accepted_at`, but the decision remains only in `state.decisions`. Loading `ReviewStatus` initializes that dictionary empty. The resumed poll therefore reapplies A’s deadline before reading its previously accepted completion.

**Impact:** A timely, accepted approval becomes a timeout, blocking the run and stopping B. A’s previously accepted findings can also disappear from the combined evidence.

**Test gap:** The interruption recovery test interrupts before `wait_reviews` accepts anything. No test resumes after partial acceptance with staggered reviewer deadlines.

### P2 — Completed workers can time out while waiting for another lane
**Location:** `workflow/automatic.py:113–120, 134–139`.

**Trigger:** Worker A launches at time 0 and completes at 10; B launches at 20 and completes at 50; the configured per-worker timeout is 40 seconds.

**Cause:** Every poll discards the accumulated handoffs and checks every worker’s deadline again. A remains subject to expiration even after its valid completion was observed.

**Impact:** At time 40 the controller aborts and stops both workers, although A completed on time and B still has 20 seconds remaining. This contradicts the documented launch-to-completion per-worker deadline.

**Test gap:** Completion tests give both workers the same launch timestamp and cover either simultaneous completion or no completion. They do not cover an already-completed lane waiting across its deadline for a later-launched sibling.

### P2 — Print reviewers are awaited sequentially, delaying decisive failures
**Location:** `workflow/automatic.py:645–666`.

**Trigger:** With print transport, the first declared reviewer remains working while the second promptly returns `blocked`, an unresolved P1, or an invalid result.

**Cause:** Although processes launch in parallel, the controller blocks in the first process’s `wait()` before inspecting subsequent results.

**Impact:** The first reviewer continues consuming usage despite an already-decisive failure. If it times out, the controller records that timeout instead of accepting and recording the second reviewer’s blocking verdict; `review.json` may remain absent. This differs from the specified immediate-block behavior and native polling implementation.

**Test gap:** The “second reviewer blocks while the first works” scenario exists only for native transport. Print tests use promptly terminating fake reviewers and exercise the first reviewer’s block.

## Intentional policies, not defects

- A native `blocked` session means operator attention is needed; waiting until its deadline is intentional. An accepted completion file declaring `blocked` is a separate terminal outcome.
- Worker permission bypass and Bash access are explicitly authorized by automatic mode. Ownership and completion-token checks are not an OS sandbox against a malicious same-user worker.
- Idle state alone does not establish completion. Completion bindings, independent review, and controller-owned verification provide separate acceptance gates.
- Verification retries are bounded; identical failures stop early. Ambiguous launches and blocked reviews are intentionally not automatically relaunched.
- Native interruption preserves sessions; print-mode interruption terminates its processes.
- No separate concrete defect was established in `launch.py` during this inspection. Its live-consent, duplicate-run, external-storage, and feature-file containment checks were reviewed.