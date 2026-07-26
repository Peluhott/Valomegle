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
- Backend expects the frontend origin `http://localhost:5173` for CORS/WebSocket (`config/CorsConfig.java`, `config/WebSocketConfig.java`); update both if the frontend port/origin changes.
- Backend logs to `valomegle/logs/valomegle.log` (rolling file), console logging is disabled — check the log file, not stdout, when debugging backend behavior.

## Architecture notes

- WebSocket auth is manual: the client connects to `/ws?token=<jwt>` and `websocket/WebSocketHandler.java` extracts/validates the JWT itself from the raw query string — it does not go through Spring Security's filter chain.
- `websocket/WebSocketSessionManager.java` is a simple in-memory `userId -> session` map. Messages are relayed directly to a known `targetUserId`; there is no queue/room/matchmaking concept yet.
- Known gap: Spring Security's `SecurityConfig` sets `anyRequest().authenticated()`, but there is no JWT filter (`OncePerRequestFilter`) registered to populate the security context from the `Authorization` header — only the WebSocket handler actually verifies tokens. Flag this if working on auth or adding new protected REST endpoints; don't silently assume protected routes are enforced.

## Conventions

- Branch naming: `<verb>:<short-description>`, e.g. `fix:login-bug`, `add:matchmaking-queue`, `remove:legacy-dashboard`.

 Package structure: organize by feature, not by layer. Each feature gets its own package containing its controller, model/entity, service, and repository together (e.g. `user/User.java`, `user/UserController.java`, `user/UserService.java`, `user/UserRepository.java`) — do not use top-level `controllers/`, `models/`, `services/`, `repositories/` packages for new code.