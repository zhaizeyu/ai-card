#!/usr/bin/env sh
set -eu

PORT="${PORT:-3002}"
PID_FILE="${PID_FILE:-.prod/prod-server.pid}"
LOG_FILE="${LOG_FILE:-.prod/prod-server.log}"

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "Production server pid file: pid=$PID"
  else
    echo "Stale pid file: $PID_FILE"
  fi
else
  echo "No pid file: $PID_FILE"
fi

if command -v ss >/dev/null 2>&1; then
  MATCHES="$(ss -ltnp 2>/dev/null | awk -v port=":$PORT" '$4 ~ port "$" { print }' || true)"
  if [ -n "$MATCHES" ]; then
    echo "Port $PORT listener:"
    echo "$MATCHES"
  else
    echo "No listener on port $PORT."
  fi
else
  echo "ss command not available; cannot inspect port $PORT."
fi

if [ -f "$LOG_FILE" ]; then
  echo "Recent log:"
  tail -n 20 "$LOG_FILE" || true
fi
