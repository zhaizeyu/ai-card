#!/usr/bin/env sh
set -eu

PORT="${PORT:-3002}"
PID_FILE="${PID_FILE:-.prod/prod-server.pid}"

stop_pid() {
  PID="$1"
  if [ -z "$PID" ] || ! kill -0 "$PID" 2>/dev/null; then
    return 1
  fi

  echo "Stopping production server: pid=$PID"
  kill "$PID" 2>/dev/null || true

  i=0
  while kill -0 "$PID" 2>/dev/null && [ "$i" -lt 20 ]; do
    i=$((i + 1))
    sleep 0.25
  done

  if kill -0 "$PID" 2>/dev/null; then
    echo "Process did not exit cleanly; sending SIGKILL."
    kill -9 "$PID" 2>/dev/null || true
  fi
}

STOPPED=0

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if stop_pid "$PID"; then
    STOPPED=1
  fi
  rm -f "$PID_FILE"
fi

if command -v ss >/dev/null 2>&1; then
  PIDS="$(ss -ltnp 2>/dev/null | awk -v port=":$PORT" '$4 ~ port "$" { print $0 }' | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | sort -u)"
  for PID in $PIDS; do
    if stop_pid "$PID"; then
      STOPPED=1
    fi
  done
fi

if [ "$STOPPED" -eq 0 ]; then
  echo "No production server found for port $PORT."
else
  echo "Production server stopped."
fi
