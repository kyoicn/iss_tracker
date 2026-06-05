#!/bin/bash
# Canonical dev-server lifecycle for the QA agent.
# The QA agent uses this script as its ONLY interface for dev-server
# operations. Do not invoke npm/kill/lsof/tail directly during QA.
set -e

DEV_CMD="npm run dev"
DEV_PORT="5173"
PID_FILE=".qa-dev-server.pid"
LOG_FILE=".qa-dev-server.log"

running() {
  [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

case "${1:-}" in
  start)
    if running; then
      echo "already running (pid $(cat "$PID_FILE"), port $DEV_PORT). use 'restart' or 'stop' first."
      exit 1
    fi
    rm -f "$PID_FILE"
    nohup $DEV_CMD > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    # Wait for the port to start responding (max ~15s).
    for i in $(seq 1 30); do
      if curl -fsS "http://localhost:$DEV_PORT/" > /dev/null 2>&1; then
        echo "ready (pid $(cat "$PID_FILE"), port $DEV_PORT, log $LOG_FILE)"
        exit 0
      fi
      sleep 0.5
    done
    echo "did not become ready in 15s; last log lines:"
    tail -n 20 "$LOG_FILE"
    exit 1
    ;;
  stop)
    if [ -f "$PID_FILE" ]; then
      kill "$(cat "$PID_FILE")" 2>/dev/null || true
      rm -f "$PID_FILE"
      echo "stopped"
    else
      echo "not running (no $PID_FILE)"
    fi
    ;;
  restart)
    "$0" stop
    "$0" start
    ;;
  status)
    if running; then
      echo "running (pid $(cat "$PID_FILE"), port $DEV_PORT)"
    else
      echo "not running"
      exit 1
    fi
    ;;
  logs)
    N="${2:-20}"
    [ -f "$LOG_FILE" ] && tail -n "$N" "$LOG_FILE" || echo "no log yet"
    ;;
  *)
    echo "usage: $0 {start|stop|restart|status|logs [N]}"
    exit 1
    ;;
esac
