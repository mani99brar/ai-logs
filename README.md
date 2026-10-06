# ai-logs — AI driven development: evidence and logs

Private archive of the *AI driven development — 36h30 study program* (Clément Lesaege + Astra, `roadmap/AI_ROADMAP.pdf`) as run on this machine, 18–29 Sep 2026. Everything here was collected from the live system so the setup can be researched, reviewed and re-decided later.

**Start here:** [`REPORT.md`](REPORT.md) (master report) → [`runs/index.md`](runs/index.md) (every workflow run) → [`cost/cost-log.csv`](cost/cost-log.csv) (every Claude session with cost).

## Layout

| Path | Contents |
| --- | --- |
| `REPORT.md` | Master report: summary, timeline, run log, cost log, failures caught, course cross-check |
| `runs/` | Complete workflow state exports: `md-manager-workflows/` (14 dirs) and `agent-workflows/` (project-B, vea, kleros-v2). Per run: `plan.json`, `events.jsonl`, completions, verification packets with screenshots, reviews, `run-state.json` |
| `runs/index.md` | Generated index of all 54 runs (date, workers, verdict, findings, notable events) |
| `sessions/` | Raw transcripts: `claude/` (~/.claude incl. `projects/` per-session jsonl, `settings.json`, `history.jsonl`, `skills/`, `file-history/`, job state/timelines) and `pi/` (~/.pi/agent incl. sessions, `run-history.jsonl`, `skills/team-prd/`, `settings.json`) |
| `sessions/index.md` | Per-session index (date, model, cost, first user message) |
| `cost/` | `cost-log.csv` + `cost-log.json` — 343 sessions, $2,514.68 measured total |
| `docs/` | All PRDs, handoffs, the audit, `features/` (feature.json, decisions.md, tasks, policies), vea review docs |
| `reviews/` | The review-side notes: `workflow-guardrails-001-issues.md`, three-review comparison, review logs, lane-repair design |
| `config/` | Setup evidence: Herdr `session.json`/`config.toml`, `md-manager/projects.json`, Pi subagent schedules (monitors) |
| `source/` | Full git histories as bundles: `md-manager.bundle` (180 refs incl. all experiment branches), `project-B.bundle` (113 refs), `md-manager-ctl{2}.bundle`, plus `*-git-log.txt` for quick browsing |
| `roadmap/` | The course PDF |

## Restoring a repo from a bundle

```sh
git clone source/md-manager.bundle md-manager     # all branches, all history
git clone source/project-B.bundle project-B
```

## What was excluded and why

- **Build junk** (regenerable, not evidence): `node_modules/`, `.venv/`, `npm_config_cache/`, `.yarn/cache/`, `xdg_cache_home/` (browser/font caches), hardhat `build-info/` compiler metadata, `__pycache__/`, sockets. This turned 17 GB of state into ~1.3 GB without losing any record of what happened.
- **`vea_validators/` source (9.2 GB company repo)** — only the review-finding docs are included (`docs/vea/`); the runs' evidence is in `runs/agent-workflows/vea/`. Say the word if you want a bundle of the source too.
- **Herdr notes content** — the pane layout is in `config/session.json`; the notes themselves are your shared workspace, not part of this study.
- **Secrets**: a scan for API tokens/keys was run before commit; matches are redacted in place (transcripts keep their structure, the token text becomes `REDACTED`).

## Keeping it up to date

Run the workflow from `~/dev/md-manager`, then refresh the archive:

```sh
# re-copy state (exclusions above)
rsync -a --exclude node_modules/ --exclude .venv/ --exclude .git/ \
  ~/.local/state/md-manager-workflows/ runs/md-manager-workflows/
# regenerate indexes + cost log (scripts inline in git history of this file's first commit)
```
