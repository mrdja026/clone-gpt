#!/usr/bin/env bash
set -euo pipefail

# Quick local diagnostics for MCP + LLM + health
# - Respects OPENAI_BASE_URL and MODEL_NAME from .env if exported in the shell
# - Works whether dev server is already running or not

APP_URL=${APP_URL:-http://localhost:8080}
API_URL=${API_URL:-http://localhost:3001}
TIMEOUT=${TIMEOUT:-5000}

say() { printf "\033[1;34m[check]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[warn]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[fail]\033[0m %s\n" "$*"; }

http_json() {
  local method=$1 url=$2 body=${3:-}
  if [ -n "$body" ]; then
    curl -sS --max-time "$((TIMEOUT/1000))" -H 'Content-Type: application/json' -X "$method" "$url" -d "$body"
  else
    curl -sS --max-time "$((TIMEOUT/1000))" -X "$method" "$url"
  fi
}

ok=0
fail=0

say "Health: ${API_URL}/api/healthz"
if out=$(http_json GET "${API_URL}/api/healthz"); then
  echo "$out" | jq '.' 2>/dev/null || echo "$out"
else
  err "healthz request failed"
  fail=$((fail+1))
fi

say "MCP tools: ${API_URL}/api/mcp/tools"
if out=$(http_json GET "${API_URL}/api/mcp/tools"); then
  echo "$out" | jq '.' 2>/dev/null || echo "$out"
  ok=$((ok+1))
else
  err "mcp/tools request failed"
  fail=$((fail+1))
fi

say "MCP ticket (SCRUM-8 via tool)"
if out=$(http_json POST "${API_URL}/api/mcp/tool" '{"name":"fetch_jira_ticket","arguments":{"ticketKey":"SCRUM-8"}}'); then
  echo "$out" | jq '.' 2>/dev/null || echo "$out"
  ok=$((ok+1))
else
  err "mcp/tool fetch_jira_ticket failed"
  fail=$((fail+1))
fi

say "MCP current sprint (resource)"
if out=$(http_json POST "${API_URL}/api/mcp/resource" '{"uri":"mcp://local-mcp-server/jira/current-sprint"}'); then
  echo "$out" | jq '.' 2>/dev/null || echo "$out"
  ok=$((ok+1))
else
  err "mcp/resource current-sprint failed"
  fail=$((fail+1))
fi

if [ -n "${OPENAI_BASE_URL:-}" ]; then
  say "LLM models: ${OPENAI_BASE_URL}/models"
  if out=$(http_json GET "${OPENAI_BASE_URL%/}/models"); then
    echo "$out" | jq '.' 2>/dev/null || echo "$out"
    ok=$((ok+1))
  else
    warn "LLM models request failed (check network/Windows firewall/host)"
  fi
fi

say "Summary: ok=${ok} fail=${fail}"
if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0

