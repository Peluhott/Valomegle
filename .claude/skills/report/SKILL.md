---
name: report
description: Writes a log entry after completing a coding task in the Valomegle codebase — date/time, a short description of the task and what changed, the files affected, and any tradeoffs or things Claude was unsure about that the user should review. Appends to REPORT_LOG.md at the repo root. This is the mandatory final step of every coding task in this repo, run after `review` — use it whenever a task (planned via `architecture` or done directly) has finished being implemented and reviewed.
---

# Report

A short, scannable log entry per finished task, so the user can review what
happened without re-reading the whole conversation. This runs **last** —
after implementation and after `review` — since the entry should reflect
what actually shipped, including anything `review` found and fixed.

## Process

1. Append a new entry to `REPORT_LOG.md` at the repo root (create it with a
   `# Report Log` header if it doesn't exist yet). Newest entries go at the
   **bottom** of the file, so it reads top-to-bottom in chronological order.
2. Use this exact structure for each entry:

   ```markdown
   ## YYYY-MM-DD HH:MM — <short task title>

   **What changed:** one or two sentences — what was asked for and what was
   actually built/fixed. State the outcome, not a step-by-step narration.

   **Files affected:**
   - `path/to/file.ext` — one line on what changed in it
   - `path/to/other.ext` — same

   **Needs your review:**
   - Anything genuinely uncertain: a tradeoff `review` logged to
     `TRADEOFFS.md`, a design decision made without being able to ask, an
     assumption that could be wrong, something not manually verified (e.g.
     "not tested end-to-end in a browser — recommend doing that before
     merging"). If there's truly nothing, write `None.` — don't invent
     something to fill the section.
   ```

   Get the actual current date/time before writing the entry (don't guess or
   reuse a stale value from earlier in the conversation) — check the system
   date if it's not already known from context.
3. Keep it terse. This is a log entry, not a report document — a few lines
   per section, not paragraphs. Bullet points over prose. If `review` already
   produced a detailed findings list, don't repeat it verbatim here; reference
   the outcome ("review found and fixed 2 issues: X, Y") and point to
   `TRADEOFFS.md` for anything still open rather than duplicating its content.
4. This is additive only — never edit or remove prior entries in
   `REPORT_LOG.md` when adding a new one.
