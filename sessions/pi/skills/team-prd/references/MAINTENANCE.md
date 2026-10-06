# Maintenance and troubleshooting (load only when needed)

Paths in this document are relative to the skill root. Layout follows agentskills.io conventions: scripts/, references/, assets/.
One intentional Pi extension remains: `disable-model-invocation: true` preserves explicit-only activation. The upstream skills-ref validator rejects this extra frontmatter field; this skill is Pi-compatible, not strictly portable without removing that flag.

Live view: `begin --view auto` (default) opens one unfocused Herdr tab per Claude call when running inside Herdr; `--view off` disables it.
`scripts/live_view.py` only tails stdout/stderr. The helper still owns execution/cancellation; closing a tab is safe and does not cancel Claude.
Raw `claude-N.stdout` is now stream-json; `.done` records call completion and `.view.json` records tab IDs or observer failure.
Outside Herdr or if tab creation fails, drafting continues with logs; no alternative terminal is launched. Observer setup is bounded to five seconds within the call budget.
The view shows emitted text/tool-input progress and the final PRD, not private reasoning. Tabs remain open for inspection; an orphan observer exits after an hour.

This is a persistent user skill, locally versioned in its own Git repository.
Update SKILL.md's metadata.version and references/CHANGELOG.md for changes. Never commit run data or credentials; never push automatically.
Normal execution does not need the Python/JavaScript source, full templates, tests or validation history in parent context.

Checks: `python3 -m unittest discover -s <skill>/scripts/tests -v` and `git diff --check`.
`references/VALIDATION.md` records the original real end-to-end run and known limitations; it is not an execution checklist.

For compatibility issues, inspect `claude --version`, `claude --help`, `claude auth status` and installed pi-subagents guidance.
The helper requires subscription auth, safe mode and structured output. Do not substitute API billing or alter account configuration.
Native `structuredOutput` is authoritative: prose artifacts can be empty or include an output-file footer.
Reviewer time includes waiting for parent revision; increase overall/per-call budgets up front for slow models.
`python3 <skill>/scripts/team_prd.py status <run>` reports state and checks unfinished-run expiry. Failed attempts are not automatically retried.

On a workflow/child infrastructure failure, preserve run ID/status, cwd, repo/ref and clean-worktree or partial-diff evidence.
Stop and report the exact error before an approved same-protocol retry; never silently switch to a foreground/CLI reviewer.
Semantic faithfulness, paraphrased repetition and contradictory feedback require parent judgment; structural checks do not prove agreement.
