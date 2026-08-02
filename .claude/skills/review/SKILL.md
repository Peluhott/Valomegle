---
name: review
description: Reviews code changes in the Valomegle codebase for three specific things — (1) duplicated/repeated code that could be extracted into a shared function, (2) whether a change to an existing function's behavior or signature could break other places that call it, and (3) whether the implementation approach is more complicated/indirect than necessary given a simpler direct solution, without sacrificing security or performance. Use whenever the user asks to review code, check a diff, review a PR, or wants a sanity check before committing/merging. This skill is review-only — it never edits code itself; actionable findings get delegated to an implementation subagent, and any tradeoff the reviewer is unsure about gets written up for the user to decide, instead of being resolved silently.
---

# Review

This skill is scoped narrowly on purpose — it is not a general "review
everything" pass. It checks exactly three things:

1. **Duplication.** Did the change introduce, or leave in place, repeated
   logic — the same or near-identical block of code in more than one place?
   If so, is there a reasonable shared function it could be extracted into?
2. **Blast radius of changed functions.** For any existing function whose
   behavior, signature, or return contract changed non-trivially, find every
   other place in the codebase that calls it and confirm the change doesn't
   break them — wrong arg count/order, a caller relying on the old return
   shape or side effects, a caller depending on the old error behavior, etc.
3. **Solution complexity.** Given how the change actually solves the problem,
   is there a more direct/simple way to get the same result? Prefer the
   straightforward solution over one that takes more steps, more moving
   parts, or more indirection than the problem calls for — but never at the
   cost of security or performance. If the simpler path and the
   secure/performant path genuinely conflict, that's not this skill's call to
   make silently (see step 5 below).

## Process

1. Figure out what's being reviewed (`git diff`, staged changes, specific
   files, or a PR via `gh pr diff <n>`) if it isn't already given.
2. Delegate the actual review to a subagent via the `Agent` tool — never
   review inline.
   - `model`: `fable`, since review quality matters more than cost here. Fall
     back to `opus`, then `sonnet`, only if `fable` is genuinely unavailable
     in this session — never as a cost-saving downgrade.
   - `run_in_background: false` — the result needs to land before responding
     to the user.
   - The subagent's prompt must:
     - State plainly that it is **read-only for this task**: it must not
       edit, create, or delete files, and must not fix anything it finds —
       its only job is to report.
     - Hand it the diff/changed files and tell it to read each changed file
       in full, not just the diff hunks.
     - Restrict it to the three checks above, not a general review. For
       duplication, tell it to look beyond the diff itself — the surrounding
       file/module — to see if the pattern already exists elsewhere in the
       codebase. For blast radius, tell it to grep/search the codebase for
       every call site of any changed function and reason about each one
       individually. For solution complexity, tell it to consider what a
       direct/minimal implementation of the same requirement would look like
       and compare — flag it only if the actual solution is more roundabout
       without a security/performance reason for being so.
     - Ask it to report findings with the `ReportFindings` tool, one entry
       per issue, using `category: duplication`, `category: breaking-change`,
       `category: complexity`, or `category: tradeoff-uncertain` (see step 5).
3. Relay the findings back with concrete `file:line` references — don't
   compress it down to "looks good."
4. **Do not implement any finding yourself.** For each actionable item (an
   extraction to make, a caller that needs updating, a simplification to
   make), delegate the fix to a separate subagent via the `Agent` tool — this
   skill's job ends at reporting. Prefer the `coding` skill/subagent once it
   exists; until then, use `general-purpose` and give it the specific finding
   plus file:line context so it doesn't have to rediscover what the review
   already found.
5. **Don't resolve genuine tradeoffs yourself — write them up instead.** If
   the reviewer is unsure whether to flag something as too complex because
   the complexity might be buying real security or performance (or any other
   security-vs-performance-vs-simplicity call that isn't clear-cut), don't
   guess and don't silently pick a side. Append an entry to `TRADEOFFS.md` at
   the repo root (create it if it doesn't exist) describing: what the
   tradeoff is, the file(s)/line(s) involved, the options as the reviewer
   sees them, and why it's unsure. Leave the decision to the user — don't
   also delegate a fix for anything logged this way until they've weighed in.
