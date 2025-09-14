## Task 5 — MCP debugging plan (aligned with README + session)

Goal: Identify and fix 401/405 errors when using MCP endpoints, verify fixture-based flow first (SCRUM-8), then real Jira, and lock in e2e coverage.

### 0) Ground truth references

- Read: `README.md` (MCP endpoints, JWT note, external MCP path), `session.md` (commands, WSL2 notes, fixtures, acceptance).
- Dev topology: Vite 8080 → Nest 3001; all API routes under `/api/*`.
- STDIO IS NOT ALLOWED

### 1) Health + environment sanity

- Start dev with fixtures: `pnpm dev:fixtures` (or `pnpm dev:fixtures:open`).
- `GET /api/healthz` and record:
  - `MCP_USE_FIXTURES` value.
- External MCP is optional. Prefer direct Jira adapter or fixtures. If you run an HTTP MCP, set `MCP_BASE_URL`.
  - Jira env presence flags: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`.
// JWT is not used for MCP; no Authorization header is needed.

### 2) Reproduce with fixtures (expected to pass)

- List tools: `curl -i http://localhost:8080/api/mcp/tools` (should be 200 with tool list).
- Call Jira ticket tool (fixture):
  - `curl -s -X POST http://localhost:8080/api/mcp/tool -H 'Content-Type: application/json' -d '{"name":"fetch_jira_ticket","arguments":{"ticketKey":"SCRUM-8"}}'`
  - Expect JSON containing `key: SCRUM-8`, `summary`, `assignee`, etc. from `server/fixtures/jira/SCRUM-8.json`.
- Project list resource (fixture path):
  - `curl -s -X POST http://localhost:8080/api/mcp/resource -H 'Content-Type: application/json' -d '{"uri":"mcp://local-mcp-server/jira/projects"}'`.
- Run e2e: `pnpm test:e2e` (or `pnpm test:e2e:noserver` if dev already running) and confirm `e2e/mcp-scrum8.spec.ts` passes and renders Jira details for SCRUM-8.

### 3) If 405 occurs

- Validate exact method and path per README:
  - `GET /api/mcp/tools`
  - `GET /api/mcp/resources`
  - `POST /api/mcp/tool` (body: `{ name, arguments }`)
  - `POST /api/mcp/resource` (body: `{ uri }`)
- Avoid posting to `/api/mcp/tools` or `/api/mcp` (JSON-RPC path is internal to the service; do not call it directly).

### 4) If 401 occurs

// No JWT layer is present; endpoints are open in dev.
- For Jira (when fixtures off): 401 means missing/invalid Basic auth. Ensure:
  - `JIRA_BASE_URL=https://your-domain.atlassian.net`
  - `JIRA_EMAIL=you@domain.tld`
  - `JIRA_API_TOKEN=<token>` (personal API token)

### 5) Switch to real Jira (optional, after fixtures are green)

- Disable fixtures: unset `MCP_USE_FIXTURES`.
- Keep the same cURL as in step 2 for `fetch_jira_ticket` but ensure Jira env vars are set.
- Re-check `GET /api/healthz` to confirm presence of Jira envs.
- Expected: 200 with real Jira issue fields; 401/403 indicates credential or project access problems.

### 7) Logging and evidence

- Use `pnpm dev:logs` to tee combined Vite + Nest logs to `logs/dev_*.log`.
- For any failure, capture:
  - Exact command, method, URL, headers, and body (if applicable).
  - Response status + body.
  - Relevant lines from `logs/dev_*.log` around the request.

### 8) Acceptance criteria

- Fixture mode: cURL calls succeed, and UI renders “JIRA Ticket: SCRUM-8 …” (e2e passes).
- Real Jira mode: cURL to `/api/mcp/tool` with `fetch_jira_ticket` returns real issue data (no 401/405) with valid credentials.
- No 401s expected on `/api/mcp/*` in dev; ensure method/path is correct to avoid 404/405.

### Notes

- Random free-text prompts should continue to work; SCRUM-8 is the deterministic fixture for verification.
- If localhost bridging fails on WSL2, get WSL IP and open `http://<WSL_IP>:8080` as documented in `session.md`.

---

## Update — Current Findings and Fixes (WSL2 + Windows Ollama)

### Findings

- LLM 404 “model not found” errors were caused by 127.0.0.1 inside WSL pointing to a different Ollama instance (or none), while the desired model `branko:latest` exists on the Windows host.
- Listing models from WSL `http://127.0.0.1:11434/v1/models` returned a set that did not include `branko:latest`, confirming the mismatch.
- Direct Windows PowerShell showed `branko:latest` available and interactive, confirming the correct target is Windows Ollama.

### Implemented Fixes

- Auto‑proxy on server startup: if `OPENAI_BASE_URL` targets `http://127.0.0.1:11434/v1` and the `MODEL_NAME` is not present locally, the Nest server now attempts to bind a lightweight HTTP proxy on `127.0.0.1:11434` that forwards to the Windows host IP (detected from `/etc/resolv.conf` or `WINDOWS_OLLAMA_HOST_IP`).
  - File: `server/utils/ollama-proxy.ts`
  - Hooked in `server/main.ts` via `startOllamaProxyIfNeeded()`.
  - Safe no‑op if port 11434 is already taken, or model exists locally.
- Chat tool bridge corrected to AI SDK’s `ToolSet` shape and `localhost` URL typo fixed.
- MCP sprint support: added `mcp://local-mcp-server/jira/current-sprint` resource and `get_current_sprint_summary` tool (fixtures + optional Agile API).
- Diagnostics and e2e:
  - Script: `scripts/check-mcp.sh` (`pnpm run check:mcp`).
  - Added `e2e/mcp-sprint.spec.ts`.
- Removed external Repo B / stdio MCP references and code.

### Items Removed (confirmed)

- Deleted: `server/routes/mcp.ts`, `start-with-mcp.(js|mjs)`, `test-mcp.js`, and the `hello_world_mcp` folder (confirmed removed from the repo).
- Cleaned `.env`, `README.md`, `session.md`, `AGENTS.md` to drop Repo B instructions and stdio flow; only built‑in adapters/fixtures or optional HTTP MCP remain.

### Possible Bugs / Pitfalls

- If something else binds `127.0.0.1:11434` inside WSL, the auto‑proxy cannot bind; the server logs a skip and LLM requests will continue to hit the local port (which may not have `branko:latest`).
- Windows Ollama must listen on `0.0.0.0` and Windows Firewall must allow inbound TCP 11434; otherwise WSL cannot reach the host IP and the proxy will forward to an unreachable target.
- When calling `/api/mcp/resource` directly, it must be a POST with a JSON body `{ "uri": "..." }`; calling without a body returns 500 (bad request shape).

### How to Verify (WSL)

1) Ensure `OPENAI_BASE_URL=http://127.0.0.1:11434/v1` and `MODEL_NAME=branko:latest` in `.env`.
2) Free the port inside WSL if taken: `ss -ltnp | grep ':11434'` → `kill -9 <PID>`.
3) On Windows, set `OLLAMA_HOST=0.0.0.0` and restart the Ollama service; open firewall for TCP 11434.
4) Run app: `pnpm dev`.
   - On startup, server prints when the proxy forwards 127.0.0.1 → Windows IP if the model is missing locally.
5) Confirm models: `curl -s http://127.0.0.1:11434/v1/models | jq -r '.data[].id'` includes `branko:latest`.
6) Exercise MCP and chat (fixtures first): `pnpm run check:mcp`, then use the UI with `SCRUM-8` and `current sprint`.

### Next Steps

- Add a clearer log line when the auto‑proxy activates and when it skips due to EADDRINUSE.
- Optionally add a health subfield to `/api/healthz` indicating proxy status and Windows target IP.
