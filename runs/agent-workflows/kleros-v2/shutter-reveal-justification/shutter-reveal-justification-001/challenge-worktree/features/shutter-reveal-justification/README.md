# shutter-reveal-justification

Fixes GitHub issue #2565: the Shutter manual (recovery) reveal sends an empty justification, discarding the one the juror wrote at commit time. The issue text is `issue-2565.md` (the `prd` the design challenge reads).

- `feature.json`: one lane (`web`) and the bundled `general` and `coverage` reviewers.
- `policy.json`: the lane's owned paths and the checks the controller runs independently (tsc, eslint and vitest for `web`). ESLint runs as a `typecheck`-kind check because it is a static check with no test counts. The setup steps are shared by web features in `features/_shared/web-setup.sh`.
- `web-task.md`: the lane's task as an outcome brief.
- `decisions.md`: the operator's decisions from the workflow-grill interview.

Launch: `workflow launch shutter-reveal-justification --dry-run`, then `--live --automatic` (see the root `CLAUDE.md`).
