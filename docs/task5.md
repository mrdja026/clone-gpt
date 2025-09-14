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
- If you enabled route protection earlier, ensure `MCP_JWT_SECRET` is unset in dev; otherwise include a valid `Authorization: Bearer <token>` per README. - DO NOT TEST OR USE THIS OUT OF SCOPE

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

- For Nest endpoints: check whether `MCP_JWT_SECRET` is set; in dev, leave it unset. If set, attach `Authorization: Bearer $MCP_JWT` as documented in README.
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
- No 401s on `/api/mcp/*` in dev unless `MCP_JWT_SECRET` is intentionally set; no 405s due to method/path mismatch.

### Notes

- Random free-text prompts should continue to work; SCRUM-8 is the deterministic fixture for verification.
- If localhost bridging fails on WSL2, get WSL IP and open `http://<WSL_IP>:8080` as documented in `session.md`.
