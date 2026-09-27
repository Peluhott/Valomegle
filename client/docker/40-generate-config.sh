#!/bin/sh
set -eu
# "-" rather than ":-": set-but-empty means "same origin as the page" (prod, behind
# nginx's /api and /ws proxy); only a fully unset var falls back to localhost.
cat <<EOF > /usr/share/nginx/html/config.js
window.__APP_CONFIG__ = {
  API_BASE_URL: "${API_BASE_URL-http://localhost:8080}",
  WS_BASE_URL: "${WS_BASE_URL-ws://localhost:8080}"
};
EOF
