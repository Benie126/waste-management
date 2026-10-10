#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# WasteLink - stop the supporting services started by start-services.sh
#   Usage:  bash scripts/stop-services.sh
# ---------------------------------------------------------------------------
set -u

echo "== Stopping WasteLink services =="

# --- RabbitMQ (Erlang VM) ----------------------------------------------
RABBIT_PID=$(netstat -ano 2>/dev/null | grep LISTENING | grep ":5672 " | head -1 | awk '{print $NF}')
if [ -n "$RABBIT_PID" ]; then
  taskkill //F //PID "$RABBIT_PID" >/dev/null 2>&1 && echo "  RabbitMQ  : stopped (pid $RABBIT_PID)" \
    || echo "  RabbitMQ  : could not stop pid $RABBIT_PID"
else
  echo "  RabbitMQ  : not running"
fi
# epmd is shared by Erlang nodes; stop it once nothing else needs it.
taskkill //F //IM epmd.exe >/dev/null 2>&1

# --- MongoDB ------------------------------------------------------------
MONGO_PID=$(netstat -ano 2>/dev/null | grep LISTENING | grep ":27017 " | head -1 | awk '{print $NF}')
if [ -n "$MONGO_PID" ]; then
  taskkill //F //PID "$MONGO_PID" >/dev/null 2>&1 && echo "  MongoDB   : stopped (pid $MONGO_PID)" \
    || echo "  MongoDB   : could not stop pid $MONGO_PID"
else
  echo "  MongoDB   : not running"
fi

echo
echo "Note: MySQL is a Windows service and is left running."
