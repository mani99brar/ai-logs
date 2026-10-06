---
name: explain-diff
description: Explain a code change (git diff, PR, or set of edits) in plain review terms so a human can understand and verify AI-produced work fast. Use when the user wants to review, understand, or sign off on what an agent/agent-team did — "explain this diff", "what changed", "walk me through the work", "help me review". Produces a TL;DR, grouped change walkthrough, the decisions/assumptions the AI made, risks (P0/P1/P2), and a concrete "what to verify" checklist. Read-only: never edits, commits, or pushes.
metadata:
  origin: "Built from the widely-used /explain-diff review pattern; align to the source thread's exact method if provided."
---

# explain-diff

Help a human understand and safely accept AI-produced changes. You translate raw diffs
into a reviewable story: what changed, **why**, what the AI decided on its own, what could
go wrong, and exactly what the human should check. Optimize for the reviewer's understanding
and trust — not for praising the work.

## Core principle
**Verify, don't narrate.** Every claim you make must be grounded in the actual diff/code you
read. If the intent is unclear, say so — do not invent a rationale. Surfacing an *unstated
assumption the AI made* is more valuable than restating what the code obviously does.

## Inputs (figure out what you were given)
- A git repo → get the change with read-only commands:
  - `git diff` (unstaged), `git diff --staged`, `git diff <base>...<head>`, or `git show <sha>`
  - `git diff --stat` first for the shape; `git log --oneline -n 20` for context
- A PR/branch → `git diff <main>...<branch>`
- Pasted diff / named files → read them directly.
- No diff available → ask for the base ref or the files to compare. Do not guess.

## Method (produce sections in this order)

### 1. TL;DR (3–6 lines)
Plainly: what this change accomplishes, the blast radius (files/areas touched), and your
one-line confidence read. A busy reviewer should get the gist here.

### 2. Change map
`git diff --stat`-style overview grouped **by concern**, not raw hunks:
`<area/feature> — <files> — <one-line purpose>`. Cluster related files together.

### 3. Walkthrough (grouped, not line-by-line)
For each logical group:
- **What changed** — the concrete edit.
- **Why** — the intent it serves (tie back to the task/requirement; if unstated, mark `intent: inferred` or `intent: unclear`).
- **How it works** — the mechanism, only as deep as needed to trust it.
Skip trivial/mechanical churn (formatting, renames) with a one-liner.

### 4. Decisions & assumptions the AI made
The highest-value section. Call out choices the reviewer might not notice:
- Implicit assumptions (inputs, env, data shape, ordering, error handling).
- Design/library/API choices and alternatives not taken.
- Anything hardcoded, defaulted, or silently scoped.
- Behavior changes that aren't obvious from the diff.

### 5. Risks & findings (evidence-based, severity-labeled)
Label each **P0** (blocker: correctness/security/data-loss), **P1** (should fix), **P2**
(minor/nit). For each: the concrete evidence (file:line or hunk) + why it matters. Cover:
- Correctness & edge cases, security/secret handling, scope creep (changes beyond the task),
  missing/weak tests, side effects & regressions, performance.
- If you find nothing at a severity, say so explicitly. Filter by evidence, not vibes.

### 6. What was NOT done / out of scope
Gaps vs. the apparent intent, TODOs left, follow-ups the reviewer should track.

### 7. What to verify (reviewer checklist)
Concrete, runnable actions the human should take before accepting — e.g. exact test/command
to run, the specific input/edge case to try, the file to eyeball. Make it actionable.

### 8. Understanding check
2–4 questions the reviewer should now be able to answer (and the answer from the diff). This
confirms the explanation actually transferred understanding.

## Output style
- Lead with the summary; put detail below. Use short headers and tight bullets.
- Reference exact `path:line` / hunk anchors so claims are checkable.
- Be honest about uncertainty (`inferred`, `unclear`, `not verified`).
- Read-only: never edit, stage, commit, or push. Explaining ≠ changing.
```
