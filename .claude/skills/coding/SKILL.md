---
name: coding
description: Coding conventions to follow whenever writing or editing code in the Valomegle codebase (Java/Spring Boot backend, React/TypeScript frontend) — proper error handling, consistent naming, formatting, and documenting only when necessary. Use this whenever implementing a feature, fixing a bug, or making any non-trivial code change in either `valomegle/` or `client/valomegle/`. Runs on whatever model is already coding — no special model or subagent needed.
---

# Coding

Standard implementation conventions for this repo. Unlike `review`, this skill
doesn't spin up a subagent or need a specific model — it's guidance for
whatever's already writing the code.

## Error handling

- Don't swallow errors silently. If something can fail, either handle it
  meaningfully or let it propagate — don't catch-and-ignore.
- Only handle errors that can actually occur; don't add defensive
  try/catch or validation for scenarios the code can't reach. Validate at
  system boundaries (controller input, external API responses), trust
  internal calls.
- **Backend (Java/Spring):** match the pattern already established in this
  codebase — e.g. `JwtAuthFilter` doesn't throw on an invalid/missing token,
  it leaves the request unauthenticated and lets Spring Security's default
  401 handling take over, rather than inventing a parallel error path. Follow
  that precedent: prefer the framework's existing error-handling mechanism
  over a custom one. Log failures that matter (backend logs to
  `valomegle/logs/valomegle.log`, not stdout).
- **Frontend (React/TS):** handle axios rejections explicitly — surface
  failures into component state the UI actually reads, don't let a rejected
  promise disappear. Don't wrap every call in try/catch reflexively; only
  where a failure is expected and needs a response (network/auth errors),
  not for programmer errors.

## Naming

- **Backend:** standard Java conventions — `PascalCase` for
  classes/interfaces, `camelCase` for methods/fields/locals, `UPPER_SNAKE_CASE`
  for constants. Package-by-feature as already documented in the root
  `CLAUDE.md` (a feature's controller/model/service/repository live together
  in that feature's package, e.g. `user/`) — don't reintroduce top-level
  `controllers/`, `services/`, etc.
- **Frontend:** `PascalCase` for components (and their filenames, e.g.
  `ProtectedRoute.tsx`), `camelCase` for functions/variables/hooks. Match
  whatever naming pattern the surrounding file/feature already uses before
  introducing a new one.

## Formatting

- Match the surrounding code's existing style rather than introducing a new
  one, even in files with no enforced formatter.
- **Frontend:** run `npm run lint` (from `client/valomegle/`) before
  considering a change done — ESLint is already configured
  (`eslint.config.js`).
- **Backend:** no formatter/checkstyle is configured in `pom.xml` currently,
  so consistency has to be by hand — follow the style of the file you're
  editing.

## Documentation

- Default to no comments. Only add one when the *why* isn't obvious from the
  code itself — a non-obvious constraint, a workaround for a specific bug, a
  subtle invariant — not a restatement of what the code does.
- Same for Javadoc/TSDoc: add it where a public method's contract, a tricky
  parameter, or a non-obvious side effect genuinely needs explaining to a
  caller who can't infer it from the signature. Don't add boilerplate
  doc-comments to every method just for coverage.

## Before considering it done

Once a coding change is complete, always run the `review` skill on the
resulting diff, then the `report` skill to log it, before calling the task
finished. Neither is situational — both apply to every coding task in this
repo, not just ones planned through `architecture`. Don't skip `review`
because the change felt small or obviously correct; that's exactly the
judgment it exists to double-check. Don't skip `report` either — it's how
the user reviews what happened without re-reading the whole conversation.
