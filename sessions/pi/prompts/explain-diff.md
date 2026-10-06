---
description: Explain a code change (diff/branch/PR/commit) as a rich, self-contained interactive HTML page — background, intuition with diagrams, code walkthrough, and an interactive quiz
argument-hint: "[target] — default: staged diff (git diff --cached); accepts a ref/branch/PR/commit or 'staged'|'unstaged'"
---
Produce a rich, interactive explanation of a code change as a single
self-contained HTML file. Follow the `explain-diff-html` method below.

## 1. Determine the target diff

- `$ARGUMENTS` if given: a git ref/branch/commit (`HEAD~1`, `main...feature`,
  a PR URL, a commit SHA) or the words `staged` / `unstaged`.
- Default: the **staged** diff (`git diff --cached`). If that is empty, fall
  back to `git diff` (working tree).

## 2. Read the change

- `git diff --stat` first for the shape, then the full diff.
- Explore surrounding code for background (callers, data flow, the subsystem
  this change sits in). Ground every claim in the actual diff — verify, don't
  narrate. Mark inferences as such.

## 3. Write the HTML (explain-diff-html method)

Sections, in order:

1. **Background** — the existing system, in two parts: a *deep* background for
   beginners (explicitly skippable), then a *narrow* background directly
   relevant to this change.
2. **Intuition** — the core essence, with concrete examples and toy data.
   Use diagrams liberally.
3. **Code** — a high-level walkthrough, grouped/ordered by concern (not raw
   hunks).
4. **Quiz** — 5 medium-difficulty multiple-choice questions (not gotchas).
   Each is interactive: clicking an option shows correct/incorrect plus
   feedback, via inline JavaScript.

Format rules:

- Output a **single self-contained HTML file** with inline CSS and JavaScript.
  One long page with section headers and a table of contents (no tabs for the
  top-level structure). Basic responsive styling for phone widths.
- **Diagrams**: always simple HTML/CSS designs (flexbox boxes, arrows, example
  data) — never ASCII art. Prefer a small number of reusable diagram families
  (system/flow diagrams with example data).
- **Code blocks**: always `<pre>` tags. Any custom styled div used for code
  must set `white-space: pre-wrap` in its CSS. Before saving, scan every code
  block and confirm `white-space: pre` / `pre-wrap` is applied.
- Use **callouts** for key concepts, definitions, and important edge cases.
- Write with clarity and flow (Martin Kleppmann style); smooth transitions
  between sections.

## 4. Save and verify

- Save to `~/explain-diff/YYYY-MM-DD-explanation-<slug>.html` (today's date
  prefix, outside the repo). Create the directory if needed.
- Verify before returning:
  - File exists and is non-trivial in size.
  - Grep for `<pre` and confirm `white-space: pre` / `pre-wrap` coverage.
  - The quiz JavaScript is present and self-contained (no external `<script
    src>`); the page renders without external assets.

## 5. Return

The absolute path, a `file://` link, and a one-line summary of what the page
covers.
