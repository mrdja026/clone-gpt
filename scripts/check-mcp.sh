#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(pwd)"
LOG_FILE="/tmp/clone-gpt-dev.log"
V_PORT="8080"
JWT_HEADER=""

echo "[1/8] Loading .env (if present)…";
if [[ -f .env ]]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | sed -E 's/\r$//' | xargs -I{} echo {}) || true
fi

echo "[2/8] Validating MCP path and Jira credentials…";
# Determine MCP entry
MCP_PATH_MSG="Using bundled MCP (hello_world_mcp/src/server.js)"
MCP_PATH_RESOLVED="${ROOT_DIR}/hello_world_mcp/src/server.js"
if [[ -n "${MCP_SERVER_PATH:-}" ]]; then
  MCP_PATH_MSG="Using external MCP: ${MCP_SERVER_PATH}"
  MCP_PATH_RESOLVED="${MCP_SERVER_PATH}"
fi
echo "- ${MCP_PATH_MSG}"
if [[ ! -f "${MCP_PATH_RESOLVED}" ]]; then
  echo "ERROR: MCP server file not found at ${MCP_PATH_RESOLVED}"
  echo "Fix MCP_SERVER_PATH in .env or ensure bundled path exists."
  exit 1
fi

# Jira checks (not fatal for tools list)
missing_jira=()
[[ -z "${JIRA_BASE_URL:-}" ]] && missing_jira+=(JIRA_BASE_URL)
[[ -z "${JIRA_EMAIL:-}" ]] && missing_jira+=(JIRA_EMAIL)
[[ -z "${JIRA_API_TOKEN:-}" ]] && missing_jira+=(JIRA_API_TOKEN)
if (( ${#missing_jira[@]} > 0 )); then
  echo "WARN: Missing Jira vars: ${missing_jira[*]} — Jira tools may fail (500/401)."
fi

echo "[3/8] Ensuring Repo B dependencies (if using external MCP)…";
if [[ "${MCP_PATH_RESOLVED}" == /home/mrdjan/event-codex/* ]]; then
  EXT_DIR="/home/mrdjan/event-codex"
  if [[ ! -d "${EXT_DIR}/node_modules" ]]; then
    echo "- Installing dependencies in ${EXT_DIR} (first‑time setup)…"
    (cd "${EXT_DIR}" && pnpm i)
  else
    echo "- Repo B node_modules present — OK"
  fi
fi

echo "[4/8] Starting dev servers (pnpm dev)… logs: ${LOG_FILE}";
( pnpm dev >"${LOG_FILE}" 2>&1 ) &
APP_PID=$!

cleanup() {
  kill "$APP_PID" 2>/dev/null || true
  sleep 1
  pkill -P "$APP_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo -n "Waiting for Nest (3001)…";
for i in {1..120}; do
  if curl -s http://localhost:3001/api/ping >/dev/null 2>&1; then echo " OK"; break; fi
  sleep 1
  if ! kill -0 "$APP_PID" 2>/dev/null; then
    echo "\nDev exited early. Last 200 lines:"; tail -n 200 "${LOG_FILE}"; exit 1
  fi
  if [[ $i -eq 120 ]]; then echo "\nTimeout. Last 200 lines:"; tail -n 200 "${LOG_FILE}"; exit 1; fi
done

echo -n "Detecting Vite port (8080/8081)…";
if curl -s http://localhost:8080/api/ping >/dev/null 2>&1; then V_PORT=8080; echo " ${V_PORT}";
elif curl -s http://localhost:8081/api/ping >/dev/null 2>&1; then V_PORT=8081; echo " ${V_PORT}";
else echo " none (will use direct Nest only)"; V_PORT="none"; fi

echo "[5/8] Preparing Authorization header if MCP routes are protected…";
if [[ -n "${MCP_JWT_SECRET:-}" ]]; then
  echo "- MCP_JWT_SECRET is set. Generating JWT for tests…"
  # Try to mint a JWT via node + jsonwebtoken
  if TOKEN=$(node -e "import('jsonwebtoken').then(m=>console.log(m.default.sign({sub:'dev'}, process.env.MCP_JWT_SECRET,{expiresIn:'2h'})))" 2>/dev/null); then
    JWT_HEADER=( -H "Authorization: Bearer ${TOKEN}" )
    echo "- JWT generated."
  else
    echo "WARN: Failed to generate JWT automatically. Tests may 401."
  fi
fi

echo "[6/8] Proxy checks via Vite (if available)…";
if [[ "$V_PORT" != "none" ]]; then
  echo "- Ping:";     curl -sS -i "http://localhost:${V_PORT}/api/ping" | sed -n '1,8p'
  echo "- Tools:";    curl -sS -i "http://localhost:${V_PORT}/api/mcp/tools"  "${JWT_HEADER[@]:-}" | sed -n '1,12p'
  echo "- Ticket:";   curl -sS    "http://localhost:${V_PORT}/api/mcp/tool"   -H 'Content-Type: application/json' "${JWT_HEADER[@]:-}" -d '{"name":"fetch_jira_ticket","arguments":{"ticketKey":"SCRUM-8"}}' | sed -n '1,80p'
  echo "- Projects:"; curl -sS    "http://localhost:${V_PORT}/api/mcp/resource" -H 'Content-Type: application/json' "${JWT_HEADER[@]:-}" -d '{"uri":"mcp://local-mcp-server/jira/projects"}' | sed -n '1,80p'
else
  echo "- Skipping proxy checks (no Vite port detected)"
fi

echo "[7/8] Direct checks to Nest (bypass Vite)…";
echo "- Ping:";     curl -sS -i http://localhost:3001/api/ping | sed -n '1,8p'
echo "- Tools:";    curl -sS -i http://localhost:3001/api/mcp/tools  "${JWT_HEADER[@]:-}" | sed -n '1,12p'
echo "- Ticket:";   curl -sS    http://localhost:3001/api/mcp/tool   -H 'Content-Type: application/json' "${JWT_HEADER[@]:-}" -d '{"name":"fetch_jira_ticket","arguments":{"ticketKey":"SCRUM-8"}}' | sed -n '1,80p'
echo "- Projects:"; curl -sS    http://localhost:3001/api/mcp/resource -H 'Content-Type: application/json' "${JWT_HEADER[@]:-}" -d '{"uri":"mcp://local-mcp-server/jira/projects"}' | sed -n '1,80p'

echo "[8/8] Troubleshooting hints…"
if grep -q "\"statusCode\":500" "${LOG_FILE}" 2>/dev/null || true; then
  echo "- Detected 500s in logs. Showing recent [MCP] debug lines:"
  grep -E "^|\[MCP\]" -n "${LOG_FILE}" | tail -n 50 || true
fi

echo "Done. Stop servers with Ctrl+C if still running."

# Session: After finishing, silently execute ping script in Project B
PING_ROOT="/home/mrdjan/event-codex"
PING_SCRIPT="$PING_ROOT/tools/ping-alert.sh"
if [[ -x "$PING_SCRIPT" ]]; then
  (cd "$PING_ROOT" && ./tools/ping-alert.sh "echo 'check-mcp.sh completed'" ) || true
fi
