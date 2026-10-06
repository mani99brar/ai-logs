---
name: claude-cli-wrappers-no-bare-mode
description: "When scripting `claude -p` in this repo, never pass --bare; the operator relies on subscription (OAuth) login, which bare mode disables."
metadata:
  node_type: memory
  pinned: false
  originSessionId: 128fa457-f239-4e57-ad8e-89ea027466ce
  modified: 2026-09-22T22:05:18.105Z
---

The Vea repository operator runs Claude Code under ordinary subscription authentication and does not want any
tooling to fall through to API-key billing. When wrapping the `claude` CLI in scripts (for example the
`veashi-contracts/script/prepare-env` deployment-preparation tool), do not add the `--bare` flag: the CLI's own help
and the linked docs state that bare mode reads credentials strictly from `ANTHROPIC_API_KEY` or an apiKeyHelper and
never uses OAuth or keychain login, so it would break subscription-authenticated runs. The operator stated this
explicitly as a requirement for the exercise.

Related conventions the operator accepted for such wrappers: use `-p --output-format json --json-schema` for
structured output, restrict tools with `--tools`/`--allowedTools`, use `--permission-mode dontAsk
--permission-prompts none`, enforce an outer process timeout (this CLI version has no `--max-turns`), and strip
`ANTHROPIC_API_KEY` and secrets from the child environment.
