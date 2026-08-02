---
name: architecture
description: Plans out and delegates non-trivial implementation work in the Valomegle codebase — reads the task and the relevant files, designs a plan, breaks it into discrete tasks, and spins up coding subagents to execute them (in parallel where independent, sequentially where one depends on another). Use whenever a request needs changes across multiple files, both the backend (`valomegle/`) and frontend (`client/valomegle/`), or is otherwise too large to implement as a single direct edit. Always favors the simplest solution that fits, reuses existing code over duplicating it, and keeps OOP fundamentals in mind when shaping the plan.
---

# Architecture

This skill is the planning/delegation layer for bigger changes — it doesn't
write the implementation itself, it figures out _what_ needs to happen and
_in what order_, then hands each piece to a coding subagent.

## Process

1. **Understand the task.** Read the actual request closely before touching
   anything. If the scope is genuinely ambiguous in a way that changes the
   plan, ask — don't guess on something only the user can decide.
2. **Gather context.** Read the files the task actually touches, plus enough
   of their surroundings to know what already exists: similar features,
   shared utilities, existing patterns for this kind of change. The goal is
   to walk into planning already knowing what can be reused, not to discover
   it mid-implementation. For unfamiliar or wide-reaching areas, use the
   `Explore` agent rather than grepping everything yourself.
3. **Design the plan**, in this priority order:
   - **Simple over clever.** Default to the most direct solution that
     actually satisfies the task. Don't design for hypothetical future
     requirements or add abstraction the task doesn't need yet.
   - **Reuse over duplication.** If something close to what's needed already
     exists (a util, a service method, a component), extend or call it rather
     than writing a parallel version.
   - **OOP fundamentals.** Keep responsibilities single and clear — a class
     or component should have one reason to change. Encapsulate state instead
     of leaking it. Favor composition over forcing an inheritance hierarchy
     that doesn't map to the domain. Respect the boundaries this repo already
     has (package-by-feature on the backend per `CLAUDE.md`, the
     WebSocket-auth-is-manual boundary, etc.) — don't blur them for
     convenience.
4. **Break the plan into discrete tasks.** Split along natural seams (a
   backend endpoint, a frontend component, a shared type/contract) rather
   than arbitrarily. For each task, work out what it depends on — specifically,
   whether it needs an interface/contract/output that another task produces
   first (e.g. a frontend component consuming an endpoint's response shape
   needs that shape decided before it can be built against it).
   Track the breakdown with `TaskCreate`/`TaskUpdate` so progress is visible
   as subagents finish.
5. **Delegate execution:**
   - Tasks with no dependency between them → spawn their coding subagents
     **in parallel**, in a single message with multiple `Agent` calls.
   - Tasks that depend on another task's output → run them **sequentially**,
     and pass the prior task's actual result (the interface it settled on,
     the files it touched) into the next task's prompt — don't make a
     downstream subagent re-derive something already decided.
   - Only treat tasks as parallel-safe if they won't touch the same files.
     If two tasks might collide on a file, make them sequential instead of
     risking both agents editing it at once.
   - Each subagent has no memory of this conversation or of each other —
     give every one the full self-contained context it needs: the specific
     task, exact file paths, the relevant slice of the plan, and the
     project's coding conventions (proper error handling, naming/formatting
     consistent with the surrounding code, documentation only where the _why_
     isn't obvious — see the `coding` skill for the full detail and point the
     subagent at it if it can consult skills itself). Restate "keep it
     simple, reuse existing code, respect OOP boundaries" explicitly in the
     prompt — don't assume it's inherited.
   - Use `subagent_type: general-purpose` unless a more specific agent type
     fits better.
6. **This skill's job ends once the pieces are implemented.** It doesn't
   review its own output — that's what the `review` skill is for. Once the
   subagents finish, always run `review` on the resulting diff, then `report`
   to log the task, before declaring it done — both are mandatory, not a
   suggestion.
