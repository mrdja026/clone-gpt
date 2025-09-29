#!/bin/bash
# codex-session.sh - Run Codex CLI with a rolling session file (default context7)

SESSION_FILE=$1

if [ -z "$SESSION_FILE" ]; then
  echo "Usage: $0 <session-file>"
  exit 1
fi

while true; do
  clear
  echo "======================================================"
  cat "$SESSION_FILE" | codex
  echo "======================================================"
  echo "Session file: $SESSION_FILE"
  echo "Press [ENTER] to continue, [q] to quit."
  read -r input
  if [ "$input" = "q" ]; then
    echo "Exiting Codex session."
    break
  fi
done
