#!/usr/bin/env bash
# Always-audio ping when the agent awaits user input.
# Usage: scripts/ping-wait.sh "Message to display"

set -euo pipefail

MSG="${1:-Awaiting your input}" 

PING_ROOT="/home/mrdjan/event-codex"
PING_SCRIPT="$PING_ROOT/tools/ping-alert.sh"

if [[ ! -x "$PING_SCRIPT" ]]; then
  echo "WARN: Ping script not found at $PING_SCRIPT" >&2
  exit 0
fi

pushd "$PING_ROOT" >/dev/null 2>&1 || true
./tools/ping-alert.sh "echo '$MSG'" || true
popd >/dev/null 2>&1 || true

