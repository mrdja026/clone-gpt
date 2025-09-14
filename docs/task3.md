# MCP Server Refactor Plan (Barebones + Express Layer)

## 📌 Overview

Currently, the MCP server is running in **barebones STDIO mode**.  
This works locally but creates issues when integrating with the **Vercel AI SDK UI**, specifically around:

- Environment variable inheritance (API tokens not being passed correctly).
- Debugging (stdio logs are harder to trace).
- Future extensibility (OAuth2 and multi-user support).

The proposed refactor is to **add a thin Express layer** that exposes the MCP server over HTTP, while keeping the current barebones MCP implementation intact.

---

# IMportant USE MCP RULES .cursor\rules\general.mdc

## ✅ Why This Needs To Be Done

1. **Fix Environment Variable Inheritance**
   - In STDIO mode, MCP is launched as a subprocess, which doesn’t always inherit `.env` values properly from the UI environment.
   - With Express, the MCP runs as its own Node process with full control of its environment.

2. **Enable Easier Debugging**
   - HTTP allows testing MCP calls with `curl` or Postman.
   - This avoids depending on stdio logs and gives clearer request/response visibility.

3. **Future-Proof for OAuth2**
   - Express makes it straightforward to add authentication middleware (OAuth2, JWT, etc.).
   - This is required for multi-user production scenarios.

4. **SPA Compatibility**
   - The React/Vercel AI SDK frontend can call MCP tools via `fetch("http://localhost:3001/mcp")`.
   - No need to manage subprocesses or stdio pipes in the browser.

---

## 🛠 What Needs To Be Done

1. **Keep Barebones MCP Implementation**
   - Do not change the existing `handleCall`, `handleListTools`, etc. logic.
   - MCP server continues to define tools/resources exactly as before.

2. **Wrap MCP with Express HTTP Layer**
   - Use `@modelcontextprotocol/sdk/server/http.js` transport instead of `stdio`.
   - Expose MCP on `http://localhost:3001/mcp`.

3. **Update Frontend Integration**
   - Point the custom UI (Vercel AI SDK) to call the MCP HTTP endpoint.
   - Ensure MCP responses match the AI SDK schema (`{content: [...]}` objects).

4. **Add Basic Debug Workflow**
   - Confirm MCP responds correctly with `curl`:
     ```bash
     curl -X POST http://localhost:3001/mcp        -H "Content-Type: application/json"        -d '{ "method": "listTools", "id": "1", "jsonrpc": "2.0" }'
     ```

---

# # MCP Server Refactor Plan (Barebones + Express Layer)

## 📂 Project Structure

project-root/
├── client/ # Your React/Vercel AI SDK UI
│ └── ... # (unchanged)
│
├── new_server/ # MCP server + Express
│ ├── src/
│ │ ├── server.js # Barebones MCP logic (tools/resources) Barebones MCP logic can be reused from C:\Users\Mrdjan\Documents\workspace\hello_world_mpc\src\server.js
│ │ ├── server-http.js # Express wrapper with HTTP transport
│ │ └── tools/ # (optional) split tools into modules
│ │ ├── fetchJira.js
│ │ └── addNumbers.js
│ │
│ ├── .env # Jira API token or OAuth creds
│ └── package.json
│
└── shared/ # Shared types/interfaces if needed
└── api.ts

## 🎯 Acceptance Criteria

- [ ] MCP server runs independently via Express (`node server-http.js`).
- [ ] Environment variables (`.env`) load correctly in HTTP mode.
- [ ] MCP tools can be called directly with `curl` or Postman.
- [ ] Vercel AI SDK UI successfully calls MCP tools via HTTP endpoint.
- [ ] Logs are clear and debuggable from Express console.
- [ ] Code remains extensible for OAuth2 (no blocking changes).

---

## 🚀 Next Steps

- Step 1: Refactor MCP server to expose HTTP transport.
- Step 2: Test with `curl` → confirm tool list and tool calls.
- Step 3: Update UI → confirm successful roundtrip MCP calls.
- Step 4: Consider OAuth2 implementation if moving to multi-user or production.

---

## 📐 Decisions (Updated)

- Proxy MCP under existing server in production for a single origin (easiest path). UI calls `/api/mcp/*` and server proxies to MCP HTTP or spawns STDIO in dev as fallback.
- JWT is not used; MCP endpoints are open in dev.
- Latency/SLO target: tool calls should complete in < 60 seconds. Requests exceeding 60s are flagged in logs for follow-up.

## 🔐 Auth

No JWT layer is used for MCP in this app.

## 🔎 Observability & SLO

- Each `/api/mcp/*` request logs duration as `X-Response-Time-ms` and to server logs.
- Any call > 60,000 ms emits an `MCP_SLO_VIOLATION` warning.

## 🧪 cURL Examples (HTTP MCP)

List tools:

```bash
curl -s -X GET http://localhost:8080/api/mcp/tools | jq .
```

Call a tool:

```bash
curl -s -X POST http://localhost:8080/api/mcp/tool \
  -H "Content-Type: application/json" \
  -d '{"name":"jira_whoami","arguments":{}}' | jq .
```

Read a resource:

```bash
curl -s -X POST http://localhost:8080/api/mcp/resource \
  -H "Content-Type: application/json" \
  -d '{"uri":"mcp://local-mcp-server/jira/projects"}' | jq .
```

Note: Authorization header is not required.
