# EC2 docker-compose.yml

The backend image no longer has secrets baked in (reverted back to the normal `.env` pattern), so this now needs a sibling `.env` file on the instance, same as local dev — this `compose.md` file itself has no secrets in it and is safe to commit.

This is a deliberate variant of the root `docker-compose.yml` for a specific deployment (pulled images, no `redis` port published, no `:-` defaults since the values below are required, not optional) — not something that auto-syncs with it. If the root compose file's service shape changes, update this by hand.

## 1. `docker-compose.yml` (paste via `cat > docker-compose.yml <<'EOF' ... EOF`, or any editor)

```yaml
services:
  redis:
    image: redis:7-alpine
  backend:
    image: peluhott/valomegle-backend:latest
    ports: ["8080:8080"]
    depends_on: [redis]
    environment:
      DB_URL: ${DB_URL}
      DB_USERNAME: ${DB_USERNAME}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
      REDIS_HOST: redis
      REDIS_PORT: 6379
  frontend:
    image: peluhott/valomegle-frontend:latest
    ports: ["5173:80"]
    environment:
      API_BASE_URL: ${API_BASE_URL}
      WS_BASE_URL: ${WS_BASE_URL}
    depends_on: [backend]
```

## 2. `.env` in the same directory (real values — do not commit; not needed in this repo, only on the instance)

Ask Claude in chat for the current values (same ones as the local root `.env`, with `ALLOWED_ORIGINS`/`API_BASE_URL`/`WS_BASE_URL` swapped to the instance's public IP) rather than storing them here.

## 3. Run it

```bash
sudo docker compose pull
sudo docker compose up -d
```

If the instance's public IP ever changes (e.g. after a stop/start without an Elastic IP), update `ALLOWED_ORIGINS`/`API_BASE_URL`/`WS_BASE_URL` in the `.env` file and `sudo docker compose up -d` again — no rebuild needed.
