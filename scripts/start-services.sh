#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# WasteLink - start the supporting services (MongoDB + RabbitMQ)
#
#   Usage:  bash scripts/start-services.sh
#
# On this machine MongoDB and RabbitMQ are portable (zip) builds living under
# .install-logs/ because the MSI/service installers need administrator rights.
# This script is the single place that knows where they live, so the rest of
# the project never has to.
#
# MySQL is expected to run as a normal Windows service (MySQL80).
# ---------------------------------------------------------------------------
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGS="$ROOT/.install-logs"
ERL_BIN="/c/Program Files/Erlang OTP/erts-16.4.0.6/bin"
MONGO_BIN="$LOGS/mongodb/bin/mongod.exe"
MONGO_DATA="$LOGS/mongodb-data"
RMQ="$LOGS/rabbit/rabbitmq_server-4.3.6"

port_open() {
  netstat -ano 2>/dev/null | grep LISTENING | grep -q ":$1 "
}

echo "== WasteLink services =="

# --- MySQL (Windows service) -------------------------------------------
if sc query MySQL80 2>/dev/null | grep -q RUNNING; then
  echo "  MySQL     : already running (service MySQL80)"
else
  echo "  MySQL     : NOT running - start the 'MySQL80' Windows service"
fi

# --- MongoDB ------------------------------------------------------------
if port_open 27017; then
  echo "  MongoDB   : already running on :27017"
elif [ -x "$MONGO_BIN" ]; then
  mkdir -p "$MONGO_DATA"
  nohup "$MONGO_BIN" --dbpath "$MONGO_DATA" --bind_ip 127.0.0.1 --port 27017 \
    > "$LOGS/mongod.log" 2>&1 &
  echo "  MongoDB   : starting on :27017 (pid $!)"
else
  echo "  MongoDB   : portable build not found at $MONGO_BIN"
fi

# --- RabbitMQ -----------------------------------------------------------
if port_open 5672; then
  echo "  RabbitMQ  : already running on :5672"
elif [ -d "$RMQ" ]; then
  if ! "$ERL_BIN/erl.exe" -noshell -eval 'halt(0).' 2>/dev/null; then
    echo "  RabbitMQ  : SKIP - erl.exe at $ERL_BIN is not working"
  else
    mkdir -p "$LOGS/rabbit-mnesia"
    export PATH="$ERL_BIN:$PATH"
    export RABBITMQ_MNESIA_BASE="$LOGS/rabbit-mnesia"
    export RABBITMQ_LOG_BASE="$LOGS"
    export RABBITMQ_PID_FILE="$LOGS/rabbitmq.pid"
    (
      cd "$RMQ" || exit 1
      nohup ./sbin/rabbitmq-server.bat > "$LOGS/rabbit-console.log" 2>&1 &
    )
    OTP_VER=$(cat "/c/Program Files/Erlang OTP/releases/28/OTP_VERSION" 2>/dev/null || echo '?')
    echo "  RabbitMQ  : starting on :5672 (Erlang/OTP $OTP_VER)"
  fi
else
  echo "  RabbitMQ  : portable build not found at $RMQ"
fi

echo
echo "Wait a few seconds, then check:  curl http://localhost:4000/api/health"
