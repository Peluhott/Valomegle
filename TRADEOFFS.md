# Tradeoffs

Unresolved tradeoffs surfaced during code review, left for the user to decide rather than resolved silently.

## Redis port exposed on the host in docker-compose (2026-08-30)

**Where:** `docker-compose.yml` — the new `redis` service (`ports: ["6379:6379"]`), added for the matchmaking queue feature.

**The tradeoff:** `backend` only needs to reach Redis over the compose-internal network (by service name `redis`), so publishing 6379 to the host isn't required for the app to work. But leaving it published lets you `redis-cli`/inspect `matchmaking:queue` from the host while manually testing matchmaking — which is genuinely useful during dev. `redis:7-alpine` ships with no auth, so as published (`0.0.0.0:6379`), it's an unauthenticated Redis reachable by anything on the same network (LAN, shared wifi), not just localhost.

**Options:**
1. Keep `ports: ["6379:6379"]` as-is — simplest, but exposes an unauthenticated Redis to the local network whenever `docker compose up` is running.
2. Bind to loopback only: `ports: ["127.0.0.1:6379:6379"]` — keeps host-side `redis-cli` access for debugging, closes it off from the rest of the network.
3. Drop the `ports:` mapping entirely — most locked-down, but debugging the queue then requires `docker compose exec redis redis-cli` instead of a host-side client.

Not resolved here — pick based on how this gets run in practice (isolated dev machine vs. shared network).

## No cache-control on the frontend's generated config.js (2026-08-30)

**Where:** `client/valomegle/nginx.conf` — `config.js` (generated at container start by `docker/40-generate-config.sh` from `API_BASE_URL`/`WS_BASE_URL`) is served by the same `location /` block as everything else, with no `Cache-Control` header set. nginx attaches `ETag`/`Last-Modified` but nothing that prevents heuristic browser caching.

**The tradeoff:** The whole point of the runtime-config change is that restarting the frontend container with new `API_BASE_URL`/`WS_BASE_URL` values should redirect clients to a new backend with no rebuild. A returning browser holding a heuristically-cached `config.js` could keep using the old values after such a restart, while `index.html` and the hashed JS/CSS bundles update normally (since their filenames change on rebuild, cache staleness doesn't apply to them the same way). Adding `location = /config.js { add_header Cache-Control "no-store"; }` would fix this, but `index.html` has the exact same uncached/uncontrolled status today, so adding a rule for only `config.js` would be inconsistent with what looks like a deliberate "not worrying about cache headers yet" stance for this pre-production app.

**Options:**
1. Leave as-is — simplest, consistent with `index.html`'s current lack of cache headers, but a stale `config.js` after a redeploy is a real (if narrow) failure mode.
2. Add `no-store` to `config.js` only — fixes the specific risk this feature introduces, but is an inconsistent policy (why is `config.js` special and not `index.html`?).
3. Add a proper cache-control policy to `nginx.conf` for the whole app (e.g. `no-store` for `index.html`/`config.js`, long-lived immutable caching for hashed `/assets/*`) — most correct, but broader scope than this feature and not something to do silently as a side effect of it.

Not resolved here — pick based on whether cache-header hygiene is worth doing now or deferred to a dedicated pass.

## Should compose.md be tracked in this repo? (2026-08-30)

**Where:** `compose.md` at the repo root — deployment notes for running this stack on a specific AWS EC2 instance from pulled Docker images (added, then revised, during this session's Docker/deployment work).

**The tradeoff:** It's operational scratch notes for one specific deployment (hardcodes the `peluhott` Docker Hub account, is framed entirely around "the EC2 instance") rather than general project documentation, and it isn't linked from `README.MD` or anywhere else in the repo, so it's not discoverable as part of normal docs. It's provably secret-free now (only `${VAR}` placeholders, no literal values), so committing it isn't a leak risk — but it's also the kind of file that ages badly (e.g. its instruction to "ask Claude in chat for the current values" stops making sense the moment credentials are rotated, and it silently drifts from the real `docker-compose.yml` since nothing keeps them in sync).

**Options:**
1. Leave as-is, untracked-from-docs but committed — cheap, but it's dead weight nobody will find or maintain.
2. Link it from `README.MD` (e.g. a "Deploying from pushed images" section) and generalize the account name to a placeholder — makes it real, maintained documentation.
3. Remove it from version control and keep it as personal/local deployment notes instead, since it documents one person's specific target rather than a reusable procedure.

Not resolved here — pick based on whether this EC2 deployment path is meant to be a documented, repeatable thing for this project or just how you're running it personally right now.
