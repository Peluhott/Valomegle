# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Valomegle ("Valorant" + "Omegle") is an early-stage voice-only duo-finder for Valorant players. See `README.MD` for the full vision/roadmap. Currently implemented: user register/login (JWT) and a basic WebSocket message relay — no matchmaking queue, voice/WebRTC, Redis, or Rust matching engine yet (those are roadmap items, not missing bugs).

Two independent projects in one repo, no shared tooling/workspace:
- `server/` — backend: Java 22, Spring Boot 4.1 (Web, Security, Data JPA, WebSocket), PostgreSQL, JWT via jjwt.
- `client/` — frontend: React 19 + TypeScript, Vite, React Router v7, Tailwind v4, axios.

## Running

- Backend: `./mvnw spring-boot:run` from `server/` — requires a `.env` file in that directory (copy `server/.env.example`; needs `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` for Postgres and `JWT_SECRET`, ≥32 chars).
- Frontend: `npm run dev` from `client/` (Vite dev server, default `http://localhost:5173`).
- Backend expects the frontend origin `http://localhost:5173` for CORS/WebSocket (`security/SecurityConfig.java`'s `corsConfigurationSource` bean, `websocket/WebSocketConfig.java`); update both if the frontend port/origin changes. CORS is wired into the Security filter chain via `.cors(Customizer.withDefaults())` — without that, preflight `OPTIONS` requests to any non-`permitAll` route get rejected by `anyRequest().authenticated()` before CORS headers are ever added.
- Backend logs to `server/logs/valomegle.log` (rolling file), console logging is disabled — check the log file, not stdout, when debugging backend behavior.

## Architecture notes

- WebSocket auth is manual: the client connects to `/ws?token=<jwt>` and `websocket/WebSocketHandler.java` extracts/validates the JWT itself from the raw query string — it does not go through Spring Security's filter chain.
- `websocket/WebSocketSessionManager.java` is a simple in-memory `userId -> session` map. Messages are relayed directly to a known `targetUserId`; there is no queue/room/matchmaking concept yet.
- `security/JwtAuthFilter.java` populates the security context from the `Authorization: Bearer <token>` header on regular HTTP requests (registered via `.addFilterBefore` in `SecurityConfig`), so `anyRequest().authenticated()` is actually enforced for REST routes now. On an invalid/missing token it just leaves the request unauthenticated (no exception thrown) and lets Spring Security's default 401 handle it.

## Conventions

- Branch naming: `<verb>:<short-description>`, e.g. `fix:login-bug`, `add:matchmaking-queue`, `remove:legacy-dashboard`.

 Package structure: organize by feature, not by layer. Each feature gets its own package containing its controller, model/entity, service, and repository together (e.g. `user/User.java`, `user/UserController.java`, `user/UserService.java`, `user/UserRepository.java`) — do not use top-level `controllers/`, `models/`, `services/`, `repositories/` packages for new code. Within a feature package, exception classes, request DTOs, and response DTOs each live in their own subpackage (`exception`, `request`, `response` — e.g. `user/exception/UserNotFoundException.java`, `user/request/LoginRequest.java`, `user/response/UserResponse.java`) — the entity, controller, service, and repository stay directly in the feature package.

## Testing

The user is hands-on in development now and tests changes themselves — don't start a dev server or use browser automation (Claude in Chrome, Playwright, etc.) to test frontend/UI changes. Verify with compiles/builds/lints/unit tests instead, and hand the change back for the user to try.

## Skills

This repo has two project skills in `.claude/skills/` — use them for implementation work, not just when the user names them explicitly:

- **`architecture`** — for any task that spans multiple files or both `server/` and `client/`, or is otherwise too large for a single direct edit. Plans the change, breaks it into dependency-aware tasks, and delegates them to coding subagents (parallel where independent, sequential where not). Use this to plan before implementing non-trivial work.
- **`coding`** — conventions to follow while writing or editing code in this repo: proper error handling, naming/formatting consistent with the surrounding code, and documentation only where the *why* isn't obvious. Applies inline, no subagent needed.

There used to be a mandatory `review` → `report` step after every coding task (diff review logged to `TRADEOFFS.md`, a dated entry in `REPORT_LOG.md`). That's no longer automatic — the user is reviewing changes directly now. The `review` and `report` skills still exist in `.claude/skills/` and can be run on request, but don't invoke them on your own after finishing a task.