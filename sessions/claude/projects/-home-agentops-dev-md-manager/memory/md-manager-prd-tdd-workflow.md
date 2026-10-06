---
name: md-manager-prd-tdd-workflow
description: MD Manager slices are driven by PRDs in docs/ with mandatory red/green TDD evidence and a handoff doc per slice; live-skills work (PRD_LIVE_SKILLS) implemented 2026-09-20 with an isolated Playwright harness and a live config in ~/.config/md-manager
metadata: 
  node_type: memory
  type: project
  originSessionId: f1e52842-46b7-477f-8ec8-61f12197067f
  modified: 2026-09-20T19:28:10.801Z
---

MD Manager work arrives as slice PRDs in `docs/` (PRD_CHALLENGE_DAY2 → PRD_SLICE2 → PRD_SLICE3 → PRD_LIVE_SKILLS). Each has a handoff doc (`docs/HANDOFF_*.md`) with observed red/green evidence; commits are left to the user. PRD_LIVE_SKILLS (configured Pi/Claude locations replacing fixtures) was implemented 2026-09-20; progress in `docs/PROGRESS_LIVE_SKILLS.md`.

**Why:** The PRDs require Red → Green → Refactor per increment with observed failing-test evidence (a compile error alone does not count: use a skeleton export to get behavioural failures), one Playwright worker, scratch artifacts cleaned in afterEach, and a final fixture-cleanliness gate. Test-authoring mistakes must be listed separately from product reds.

**How to apply:** Run browser tests on free ports (`MD_MANAGER_WEB_PORT=5184 MD_MANAGER_API_PORT=3014`, preview `4184`; dev servers usually occupy 5173/3001) and never run the unit suite concurrently with the browser suite. The browser harness builds its own temp root per run (`playwright.config.ts`, env `MD_MANAGER_TEST_ROOT`/`MD_MANAGER_CONFIG`, ids `pi-personal`, `pi-package`, `pi-missing`, `claude-personal`, `claude-plugin`) and cleans it in `tests/global-teardown.ts`; specs use `tests/helpers.ts` (`roots`, `browseUrl`, `fileUrl`, `expandLocation`, `fit`). The live config is `~/.config/md-manager/sources.json` (25 locations, generated from a read-only inventory; regenerate rather than hand-edit when packages/plugins change); the API exits at startup without it. Known traps: React StrictMode resets refs on remount; editor text must flow editor→session only; native `<dialog>` must be closed in a layout-effect cleanup to restore focus; nodes expanded in the graph can land behind the toolbars/legend, so tests call `fit(page)` after expanding; multi-line node labels must stay outside the focusable `.node-body` or Playwright's centre click misses the shape; Vite dev 404s malformed percent-encoded URLs before the SPA loads (a middleware in vite.config.ts serves the shell).
