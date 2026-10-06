---
description: List your 5 latest notes, open one, or summarize all notes
argument-hint: "[name | summary]"
---
Herdr notes assistant. Your notes live as Markdown files under `/home/agentops/.pi/agent/notes/herdr` (see the `herdr-notes` skill at `/home/agentops/.pi/agent/skills/herdr-notes`).

The user's argument (may be empty): `$ARGUMENTS`

Decide the mode:
- No argument -> run the LIST task.
- Argument matches "summary", "summarize", "sum", or "analyze" (case-insensitive) -> run the SUMMARY task.
- Any other argument -> run the OPEN task with that argument as the note name.

## LIST task (default)
1. List note files, newest first, excluding the auto-generated index:
   `find /home/agentops/.pi/agent/notes/herdr -type f -name '*.md' ! -name 'index.md' -printf '%T@ %p\n' | sort -rn`
2. Show the TOP 5 as a numbered list. For each note print:
   - Title (from YAML frontmatter `title`; fall back to the filename)
   - Relative path (relative to `/home/agentops/.pi/agent/notes/herdr`)
   - Last-modified time in a human-readable form
3. Keep it a tight, scannable list. Do NOT print full note contents in list mode.

## OPEN task (argument is a note name)
1. Resolve the name to a note file. Search every `*.md` file under `/home/agentops/.pi/agent/notes/herdr` (skip `index.md`) and match, case-insensitively, against either the filename without `.md` or the frontmatter `title`. A substring/partial match is fine.
2. If exactly one note matches: print its full contents as Markdown, preceded by a header with the title and the absolute file path.
3. If several notes match: list the candidates (title + relative path) and ask the user which one they mean.
4. If none match: say it wasn't found and show the names of the 5 latest notes.
5. Do not modify the note. Opening is read-only.

## SUMMARY task (argument is summary/summarize/sum/analyze)
1. Read every note file under `/home/agentops/.pi/agent/notes/herdr` (skip `index.md`).
2. Analyze all of them together and surface anything important:
   - Decisions, commitments, or agreements
   - Action items, TODOs, or next steps
   - Deadlines, dates, or scheduling notes
   - Risks, warnings, blockers, or things needing attention
   - Anything that looks like a follow-up is required
3. Lead with a short "Important" section of the most notable findings, then group the rest by note. If nothing important stands out, say so plainly rather than inventing items.
