#!/bin/sh
set -eu
cat <<EOF > /usr/share/nginx/html/config.js
window.__APP_CONFIG__ = {
  API_BASE_URL: "${API_BASE_URL:-http://localhost:8080}",
  WS_BASE_URL: "${WS_BASE_URL:-ws://localhost:8080}"
};
EOF
