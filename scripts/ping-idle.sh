#!/usr/bin/env bash
# Small helper to trigger the Repo B ping alert script with a message.
# Usage: scripts/ping-idle.sh "Message to display" [--no-audio]

set -euo pipefail

MSG="${1:-Agent is idle}"
NO_AUDIO_FLAG="${2:-}"

PING_ROOT="/home/mrdjan/event-codex"
PING_SCRIPT="$PING_ROOT/tools/ping-alert.sh"

if [[ ! -x "$PING_SCRIPT" ]]; then
  echo "WARN: Ping script not found at $PING_SCRIPT" >&2
  exit 0
fi

pushd "$PING_ROOT" >/dev/null 2>&1 || true
if [[ "$NO_AUDIO_FLAG" == "--no-audio" ]]; then
  ./tools/ping-alert.sh --no-audio "echo '$MSG'" || true
else
  ./tools/ping-alert.sh "echo '$MSG'" || true
fi
popd >/dev/null 2>&1 || true
