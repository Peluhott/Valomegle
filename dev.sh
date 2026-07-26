#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# `mvnw spring-boot:run` forks the actual app into a grandchild JVM that does
# not reliably exit on SIGINT (Ctrl+C) - only SIGTERM. Recursively killing the
# whole descendant tree with SIGTERM is the only way to guarantee it stops.
kill_tree() {
  local pid="$1"
  local child
  for child in $(pgrep -P "$pid" 2>/dev/null); do
    kill_tree "$child"
  done
  kill -TERM "$pid" 2>/dev/null
}

cleanup() {
  trap - EXIT
  for pid in $(jobs -p); do
    kill_tree "$pid"
  done
}
trap cleanup EXIT INT TERM

(cd "$root_dir/valomegle" && ./mvnw spring-boot:run) &
(cd "$root_dir/client/valomegle" && npm run dev) &

wait
