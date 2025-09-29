#!/usr/bin/env bash
set -euo pipefail

mkdir -p logs
ts=$(date +%Y%m%d_%H%M%S)
logfile="logs/dev_${ts}.log"

echo "[dev-with-logs] Writing to $logfile"
# MCP fixtures deprecated; ensure external MCP is configured
export MCP_BASE_URL=${MCP_BASE_URL:-http://127.0.0.1:4000}
export BIND_HOST=${BIND_HOST:-0.0.0.0}
export DEBUG=${DEBUG:-vite:*}

pnpm dev 2>&1 | tee "$logfile"

