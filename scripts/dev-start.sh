#!/usr/bin/env sh
set -eu

PORT="${PORT:-3002}"
HOST="${HOST:-0.0.0.0}"
PID_FILE="${PID_FILE:-.dev/dev-server.pid}"
LOG_FILE="${LOG_FILE:-.dev/dev-server.log}"
DEV_DIST_DIR="${NEXT_DIST_DIR:-.next-dev}"

mkdir -p "$(dirname "$PID_FILE")" "$(dirname "$LOG_FILE")"

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "Dev server already running: pid=$PID port=$PORT"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "(:|\\])${PORT}$"; then
  echo "Port $PORT is already in use. Run npm run app:status to inspect it."
  exit 1
fi

echo "Starting dev server on http://$HOST:$PORT"
rm -rf "$DEV_DIST_DIR"
if command -v setsid >/dev/null 2>&1; then
  NEXT_DIST_DIR="$DEV_DIST_DIR" setsid ./node_modules/.bin/next dev --turbo -H "$HOST" -p "$PORT" >"$LOG_FILE" 2>&1 < /dev/null &
else
  NEXT_DIST_DIR="$DEV_DIST_DIR" nohup ./node_modules/.bin/next dev --turbo -H "$HOST" -p "$PORT" >"$LOG_FILE" 2>&1 &
fi
PID="$!"
echo "$PID" >"$PID_FILE"

READY=0
i=0
while kill -0 "$PID" 2>/dev/null && [ "$i" -lt 40 ]; do
  if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "(:|\\])${PORT}$"; then
    READY=1
    break
  fi
  i=$((i + 1))
  sleep 0.25
done

if [ "$READY" -eq 1 ]; then
  sleep 1
fi

if [ "$READY" -eq 1 ] && kill -0 "$PID" 2>/dev/null; then
  echo "Dev server started: pid=$PID"
  echo "Log: $LOG_FILE"
else
  echo "Dev server failed to start. Last log lines:"
  tail -n 40 "$LOG_FILE" || true
  rm -f "$PID_FILE"
  exit 1
fi
