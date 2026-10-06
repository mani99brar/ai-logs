## Review

- **Fixed — previous P1 resolved:** `validate_pipeline_policy()` enforces `ui/frontend` and `adapter/backend`, with calls from runtime, preflight, and preparation (`workflow/pipeline.py:29–33,79,411,433`). Both bypass configurations have regression coverage (`workflow/test_pipeline.py:162–170`).
- **Fixed — previous P2 resolved:** Tests now exercise production `stop_workers()` with mocked native responses, covering success, repeated calls, completed-stop reconciliation, failure, and lingering registry presence (`workflow/test_pipeline.py:180–211`). Recovery checks identity and termination before recording completion (`workflow/pipeline.py:108–138`).
- **Correct:** Handoffs are validated before stopping either worker, with regression coverage (`workflow/pipeline.py:145–154`; `workflow/test_pipeline.py:213–217`).

No issues found.

No regressions identified within the requested fix scope. Tests were inspected, not rerun; reported passing results remain supervisor-provided.

**Merge verdict: OK.**