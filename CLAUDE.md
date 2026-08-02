# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Valomegle ("Valorant" + "Omegle") is an early-stage voice-only duo-finder for Valorant players. See `README.MD` for the full vision/roadmap. Currently implemented: user register/login (JWT) and a basic WebSocket message relay — no matchmaking queue, voice/WebRTC, Redis, or Rust matching engine yet (those are roadmap items, not missing bugs).

Two independent projects in one repo, no shared tooling/workspace:
- `valomegle/` — backend: Java 22, Spring Boot 4.1 (Web, Security, Data JPA, WebSocket), PostgreSQL, JWT via jjwt.
- `client/valomegle/` — frontend: React 19 + TypeScript, Vite, React Router v7, Tailwind v4, axios.

## Running

- Backend: `./mvnw spring-boot:run` from `valomegle/` — requires a `.env` file in that directory (copy `valomegle/.env.example`; needs `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` for Postgres and `JWT_SECRET`, ≥32 chars).
- Frontend: `npm run dev` from `client/valomegle/` (Vite dev server, default `http://localhost:5173`).
- Backend expects the frontend origin `http://localhost:5173` for CORS/WebSocket (`security/SecurityConfig.java`'s `corsConfigurationSource` bean, `websocket/WebSocketConfig.java`); update both if the frontend port/origin changes. CORS is wired into the Security filter chain via `.cors(Customizer.withDefaults())` — without that, preflight `OPTIONS` requests to any non-`permitAll` route get rejected by `anyRequest().authenticated()` before CORS headers are ever added.
- Backend logs to `valomegle/logs/valomegle.log` (rolling file), console logging is disabled — check the log file, not stdout, when debugging backend behavior.

## Architecture notes

- WebSocket auth is manual: the client connects to `/ws?token=<jwt>` and `websocket/WebSocketHandler.java` extracts/validates the JWT itself from the raw query string — it does not go through Spring Security's filter chain.
- `websocket/WebSocketSessionManager.java` is a simple in-memory `userId -> session` map. Messages are relayed directly to a known `targetUserId`; there is no queue/room/matchmaking concept yet.
- `security/JwtAuthFilter.java` populates the security context from the `Authorization: Bearer <token>` header on regular HTTP requests (registered via `.addFilterBefore` in `SecurityConfig`), so `anyRequest().authenticated()` is actually enforced for REST routes now. On an invalid/missing token it just leaves the request unauthenticated (no exception thrown) and lets Spring Security's default 401 handle it.

## Conventions

- Branch naming: `<verb>:<short-description>`, e.g. `fix:login-bug`, `add:matchmaking-queue`, `remove:legacy-dashboard`.

 Package structure: organize by feature, not by layer. Each feature gets its own package containing its controller, model/entity, service, and repository together (e.g. `user/User.java`, `user/UserController.java`, `user/UserService.java`, `user/UserRepository.java`) — do not use top-level `controllers/`, `models/`, `services/`, `repositories/` packages for new code.

## Skills

This repo has four project skills in `.claude/skills/` — use them for implementation work, not just when the user names them explicitly:

- **`architecture`** — for any task that spans multiple files or both `valomegle/` and `client/valomegle/`, or is otherwise too large for a single direct edit. Plans the change, breaks it into dependency-aware tasks, and delegates them to coding subagents (parallel where independent, sequential where not). Use this to plan before implementing non-trivial work.
- **`coding`** — conventions to follow while writing or editing code in this repo: proper error handling, naming/formatting consistent with the surrounding code, and documentation only where the *why* isn't obvious. Applies inline, no subagent needed.
- **`review`** — after non-trivial changes are made (by `architecture`'s subagents or otherwise), review the diff for duplicated code, breaking changes to callers of modified functions, and unnecessary solution complexity. Logs genuinely unclear security/performance-vs-simplicity tradeoffs to `TRADEOFFS.md` at the repo root instead of resolving them silently; delegates any fix rather than applying it inline.
- **`report`** — the final step after `review`. Appends a dated entry to `REPORT_LOG.md` at the repo root: a short description of the task and what changed, the files affected, and anything uncertain the user should review (open tradeoffs, unverified assumptions, things not manually tested).

Every coding task ends with `review` then `report` on the resulting diff — this is mandatory, not just the typical/suggested flow, and applies whether the change was planned through `architecture` or made directly. Typical flow for non-trivial work: `architecture` to plan and implement (using `coding` conventions throughout), then `review`, then `report`, before considering it done.