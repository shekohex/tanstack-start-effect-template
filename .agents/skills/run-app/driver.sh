#!/usr/bin/env bash

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
pid_file="/tmp/run-app.pid"
log_file="/tmp/run-app.log"

cd "$root"

wait_for_app() {
  for _ in $(seq 1 60); do
    if curl -fsS http://localhost:3000/api/healthz >/dev/null 2>&1; then
      return 0
    fi

    if [[ -f "$pid_file" ]] && ! kill -0 "$(cat "$pid_file")" 2>/dev/null; then
      tail -n 100 "$log_file" >&2
      return 1
    fi

    sleep 0.5
  done

  tail -n 100 "$log_file" >&2
  return 1
}

start() {
  if curl -fsS http://localhost:3000/api/healthz >/dev/null 2>&1; then
    echo 'App is already running at http://localhost:3000'
    return
  fi

  nohup setsid pnpm exec vp run dev >"$log_file" 2>&1 </dev/null &
  echo $! >"$pid_file"
  wait_for_app
  echo 'App is ready at http://localhost:3000'
}

stop() {
  if [[ -f "$pid_file" ]]; then
    pid="$(cat "$pid_file")"
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    rm -f "$pid_file"
  fi

  for _ in $(seq 1 20); do
    if ! ss -ltn | grep -Eq ':(3000|4100)\b'; then
      break
    fi
    sleep 0.25
  done

  session="$(agent-browser session id --scope worktree --prefix run-app)"
  agent-browser --session "$session" close >/dev/null 2>&1 || true
}

case "${1:-}" in
  setup)
    pnpm exec vp install
    pnpm exec vp run setup
    ;;
  start)
    start
    ;;
  stop)
    stop
    ;;
  down)
    stop
    pnpm exec vp run dev:services:down
    ;;
  *)
    echo 'Usage: driver.sh {setup|start|stop|down}' >&2
    exit 2
    ;;
esac
