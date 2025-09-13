#!/usr/bin/env bash
set -euo pipefail

mkdir -p logs
ts=$(date +%Y%m%d_%H%M%S)
logfile="logs/dev_${ts}.log"

echo "[dev-with-logs] Writing to $logfile"
export MCP_USE_FIXTURES=${MCP_USE_FIXTURES:-1}
export BIND_HOST=${BIND_HOST:-0.0.0.0}
export DEBUG=${DEBUG:-vite:*}

pnpm dev 2>&1 | tee "$logfile"

