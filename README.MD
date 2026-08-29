# Valoangle
Find random duos for Valorant - voice-only, fast, free.

---

## Core Features

- Voice chat only, no text - combats AI bots by requiring real voice interaction
- Split by region
- Grouped by rank
- 1-click lobby invite <- priority
- PC only
- Casual and competitive modes

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React, React Router |
| Backend | Java Spring Boot, Rust (engine) |
| Database | PostgreSQL, Redis |
| Cloud | AWS |

---

## Roadmap

**V1** - Connect users with voice audio and real-time notifications

**V2** - Queue system, randomly paired with another user

**V3** - Smart matchmaking by skill, location, and role (written in Rust)

---

Post V3 - UI polish and scalability improvements

---

## WebSocket Architecture (Current — Text/Signaling Layer)

### How it works

The current WebSocket setup is a **server-relay model** — all messages pass through the Spring backend. No peer-to-peer yet.

```
Client (React)                          Spring Backend
──────────────────────────────────────────────────────────────

1. User loads Dashboard
   → reads JWT from localStorage
   → opens WebSocket: ws://localhost:8080/ws?token=<jwt>

2. WebSocketConfig.java
   → registers the /ws endpoint
   → routes all traffic to WebSocketHandler

3. WebSocketHandler.afterConnectionEstablished()
   → extracts token= from the URL query string
   → JwtService.extractUsername(token) → gets userId
   → stores userId on the session object
   → WebSocketSessionManager.addSession(userId, session)
      └── ConcurrentHashMap<String userId → WebSocketSession>

4. Client sends a message:
   { targetUserId: "someUser", message: "poke!" }

5. WebSocketHandler.handleTextMessage()
   → parses JSON
   → looks up target session in SessionManager by userId
   → if found and open → forwards message to that session

6. Target client receives it
   → ws.onmessage fires → React state updates → UI renders

7. User disconnects (tab close, logout, etc.)
   → WebSocketHandler.afterConnectionClosed()
   → removes userId from SessionManager
```

### File roles

| File | Role |
|---|---|
| `WebSocketConfig.java` | Registers the `/ws` endpoint and wires the handler |
| `WebSocketHandler.java` | Lifecycle callbacks — auth on connect, route messages, cleanup on disconnect |
| `WebSocketSessionManager.java` | In-memory map of `userId → WebSocketSession` |
| `JwtService.java` | Extracts userId from the JWT passed in the URL |
| `Dashboard.tsx` | Opens the WebSocket connection, sends and receives messages |

### Why no STUN/TURN here

STUN and TURN are **WebRTC concepts** — they help two browsers find each other's public IP and punch through NATs for a direct peer-to-peer connection. This setup doesn't need them because the Spring server is the middleman with a real IP. Every message travels:

```
sender → Spring server → receiver
```

When WebRTC is added for voice, the WebSocket shifts roles to become a **signaling server** — it will only exchange the WebRTC handshake (offer, answer, ICE candidates) between peers. The actual audio flows directly peer-to-peer, and the STUN server helps each client discover its public IP to make that direct connection possible.

---

## Running with Docker

Requires Docker and Docker Compose.

1. Copy `.env.example` to `.env` at the repo root and fill it in: `DB_URL`/`DB_USERNAME`/`DB_PASSWORD` (Neon.tech credentials), `JWT_SECRET`, `ALLOWED_ORIGINS`, and the build-time frontend vars `VITE_API_BASE_URL`/`VITE_WS_BASE_URL`.
2. Run:

```
docker compose up --build
```

This builds and starts two containers — backend on `:8080`, frontend on `:5173`. There is **no database container**: `DB_URL` must point at Neon (or any other reachable Postgres instance), since the DB is intentionally kept external.
