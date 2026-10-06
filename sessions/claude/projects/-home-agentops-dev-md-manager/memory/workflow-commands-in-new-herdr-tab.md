---
name: workflow-commands-in-new-herdr-tab
description: "The user wants every long-running workflow controller command (launch, automatic, retry) run in a new Herdr tab they can watch, never hidden in a background shell"
metadata:
  node_type: memory
  pinned: true
  originSessionId: 327df531-fb9b-4f61-a1cd-4d95f48e3e43
  modified: 2026-09-22T23:07:18.879Z
---

When running any md-manager workflow controller command that keeps running (for example
`python -m workflow launch ...`, `python -m workflow automatic <run> --live`, or a `retry`
that resumes the supervisor), always open a new Herdr tab for it and run the command there,
instead of running it as a background shell inside the Claude session.

The user asked for this explicitly on 2026-09-22 ("always open a new tab for the workflow
command you run") after an earlier request to "open the controller shell in a new tab". They
want to see the controller's live output, the traceback if it stops, and be able to interrupt
or resume it themselves. A background shell hides all of that from them.

Recipe that worked: `herdr tab create` to open the tab (HERDR_ENV=1 is set in the user's
session), then `herdr pane run <pane_id> '<command>'` to start the controller in it, and
`herdr pane read <pane_id>` to check its output later. Worker and reviewer sessions can be
made visible in the same way with `herdr pane run <pane> 'claude attach <id>'`.
