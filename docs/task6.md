## Task 6 — WSL2 Ollama Proxy: Auto‑Pick Alternate Port (Dev Convenience)

Goal: Eliminate local friction when 127.0.0.1:11434 is already in use inside WSL. Automatically bind the local forward proxy on the first free port in a small range and transparently route all server LLM calls through it, with clear diagnostics.

Background

- Current behavior:
  - If `OPENAI_BASE_URL` is `http://127.0.0.1:11434/v1` and the requested model is missing locally, the server tries to bind a WSL proxy on `127.0.0.1:11434` → forwards to `WINDOWS_OLLAMA_HOST_IP:11434`.
  - If the port is already in use (e.g., WSL Ollama), the proxy skips and server falls back to direct Windows IP: `http://<WINDOWS_OLLAMA_HOST_IP>:11434/v1`.
  - This works, but logs show `SKIP` and some devs prefer a localhost endpoint.

Proposal (Plan C)

- When `127.0.0.1:11434` is occupied, auto‑bind the proxy on the first free port in a short range, e.g. `11435..11440`.
- Centralize an “effective base URL” resolver used by all server LLM clients:
  1. If proxy is active: `http://127.0.0.1:<boundPort>/v1`
  2. Else if `WINDOWS_OLLAMA_HOST_IP` is set: `http://<WINDOWS_OLLAMA_HOST_IP>:11434/v1`
  3. Else: `process.env.OPENAI_BASE_URL`
- Health/diagnostics enhancements:
  - `/api/healthz` exposes `ollamaProxy.port` when active and the `effectiveBaseUrl` actually used.
  - Diagnostics page shows the chosen port and route (proxy or direct).

Steps

1. Proxy binder
   - Try `11434`. If `EADDRINUSE`, try `11435..11440` (configurable via env: `OLLAMA_PROXY_START_PORT`, `OLLAMA_PROXY_PORT_TRIES`).
   - Record status: `{ active, port, targetHost, note }`.
2. Effective URL
   - Implement `getEffectiveOllamaBaseUrl()` (done) and add port support.
   - Ensure all server call sites use it (chat services/controllers, legacy route).
3. Health/diagnostics
   - Add `ollamaProxy.port` and `effectiveBaseUrl` to `/api/healthz`.
   - Render on `/diagnostics`.
4. Docs
   - README “WSL2: Windows Ollama” section: mention auto‑pick port and how to verify.
   - session.md: add notes under “Follow‑Up — WSL2 Ollama Bridging and Proxy”.

Pros

- Zero manual port killing in WSL dev.
- Keeps a stable localhost address (albeit with a different port) for tools that prefer local endpoints.
- Transparent — healthz and diagnostics clearly expose the active route.

Cons

- External tools hard‑coded to `:11434` won’t see our elected port; they must use the reported port or the Windows IP.
- Slightly more complexity in proxy setup and diagnostics.

Acceptance Criteria

- With WSL `127.0.0.1:11434` occupied, dev starts without error; healthz shows `ollamaProxy.port=11435` (or first free in range) and `effectiveBaseUrl` using that port.
- LLM calls succeed using Windows Ollama.
- Diagnostics page displays the elected port/route.

Rollout Notes

- Keep the existing direct Windows IP fallback path — if port binding fails entirely, calls still succeed.
- Provide env switches:
  - `WINDOWS_OLLAMA_HOST_IP` — IP of the Windows host (no scheme/port).
  - `OLLAMA_PROXY_START_PORT` (default 11434), `OLLAMA_PROXY_PORT_TRIES` (default 7).

You’re seeing the SCRUM-8 content from the fixture file, not live Jira. That fixture currently says “Improve
onboarding flow…” with assignee “Jane Doe,” which you’ve identified as incorrect.

Two clean options:

- Use live Jira for SCRUM-8
  - Set MCP_USE_FIXTURES=0 in .env and restart pnpm dev.
  - Then test: the server will call Jira directly and show the real data.
- Update the SCRUM-8 fixture to match Jira
  - I added a PowerShell script to fetch the real ticket and overwrite the fixture in the expected format.

PowerShell: export real Jira ticket to fixture

      - You have access to SCRUM-8

- Command:
  - powershell -NoProfile -ExecutionPolicy Bypass -File scripts/jira-export-fixture.ps1 -Key SCRUM-8
- What it does: - Reads .env if needed - Calls Jira /rest/api/3/issue/SCRUM-8 with Basic auth - Normalizes fields into the expected fixture shape: - key, summary, status.name, assignee.displayName, priority.name, description (best-effort from ADF),
  blockers: [] - Writes to server/fixtures/jira/SCRUM-8.json

Re-run tests after update

- powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-mcp-fixtures.ps1
  - SCRUM-8 should reflect your live values
  - ABC-123 remains error path (for negative-case validation)

If you’d rather keep fixtures off and always use live Jira for keys like SCRUM-8, set MCP_USE_FIXTURES=0 and you’re
done. If you want, I can also add a small log line to server when a fixture is used so it’s obvious in the console.
