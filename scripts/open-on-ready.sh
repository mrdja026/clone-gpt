#!/usr/bin/env bash
set -euo pipefail

APP_URL=${APP_URL:-http://localhost:8080}

echo "[open-on-ready] Waiting for $APP_URL ..."
wait-on "$APP_URL" --timeout 180000

echo "[open-on-ready] App is up. Opening browser..."

# Try WSL-friendly openers first
if command -v wslview >/dev/null 2>&1; then
  wslview "$APP_URL" || true
elif command -v cmd.exe >/dev/null 2>&1; then
  cmd.exe /C start "$APP_URL" || true
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$APP_URL" || true
else
  echo "[open-on-ready] No browser opener found; please open $APP_URL manually."
fi

echo "[open-on-ready] Done."
