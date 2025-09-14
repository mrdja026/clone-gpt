# Clone GPT - AI Chat Application

A production-ready ChatGPT-like application built with React, NestJS, and AI SDK, featuring branching conversations and support for both OpenAI and local Ollama models.

## Features

- 🤖 **Real AI Conversations** - Powered by OpenAI GPT or local Ollama models
- 🌊 **Streaming Responses** - Real-time message streaming for better UX
- 🌳 **Branching Conversations** - Branch off from any message to explore different conversation paths
- 💾 **Persistent Chat History** - Save and resume conversations with Supabase integration
- 📱 **Responsive Design** - Modern UI with TailwindCSS and Radix components
- 🔧 **Flexible AI Provider** - Switch between OpenAI API and local Ollama seamlessly
- ✅ **E2E Test Suite** - Playwright tests included and passing on fixtures

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: NestJS + Express + TypeScript
- **AI**: Vercel AI SDK with OpenAI provider (compatible with Ollama)
- **Database**: Supabase (optional, for chat persistence)
- **UI Components**: Radix UI + Lucide React icons

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure it:

```bash
cp env.example .env
```

**For OpenAI (Cloud):**

```bash
OPENAI_API_KEY=your_openai_api_key_here
# Leave OPENAI_BASE_URL commented out for OpenAI
# MODEL_NAME=gpt-4o-mini
```

**For Ollama (Local):**

```bash
OPENAI_BASE_URL=ollama
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
MODEL_NAME=branko:latest
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:8080`

## Testing

- Run e2e (auto-starts dev with fixtures): `pnpm test:e2e`
- Or run against an already started dev server: `pnpm dev:fixtures` then `pnpm test:e2e:noserver`
- Specs live in `e2e/`, config in `playwright.config.ts`. Current suite is passing using fixtures.

## MCP (Model Context Protocol) Integration

MCP exposes tools and resources that the app calls for deterministic queries (e.g., Jira ticket lookups). This app supports three modes — all controlled by env vars (no code changes needed):

- Direct Jira adapter (default)
  - Leave `MCP_BASE_URL` unset and `MCP_USE_FIXTURES` empty/0.
  - The server calls Jira directly from `server/mcp/mcp.service.ts` using `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`.
  - Tools: `fetch_jira_ticket`, `fetch_jira_myself`. Resource: `mcp://local-mcp-server/jira/projects`.

- External HTTP MCP (optional)
  - Set `MCP_BASE_URL=http://localhost:<port>` to route all MCP calls to `${MCP_BASE_URL}/mcp` (JSON‑RPC over HTTP).
  - No stdio is used.

- Fixtures (dev/testing)
  - Set `MCP_USE_FIXTURES=1` to return deterministic data from `server/fixtures/` (e.g., `SCRUM-8.json`).

Quick verification (with `pnpm dev` running):

- Health: `curl -s http://localhost:3001/api/healthz | jq`
- Tools: `curl -s http://localhost:3001/api/mcp/tools | jq`
- Ticket: `curl -s -X POST http://localhost:3001/api/mcp/tool -H 'content-type: application/json' -d '{"name":"fetch_jira_ticket","arguments":{"ticketKey":"SCRUM-8"}}' | jq`
- Jira sanity: `curl -i http://localhost:3001/api/jira/myself`

Run tests:

- Fixtures (default): `pnpm test:e2e`
- Real Jira: `REAL_JIRA=1 pnpm test:e2e` (auto‑starts dev with fixtures OFF)
- Only Jira tests vs running dev: `PW_SKIP_WEBSERVER=1 BASE_URL=http://localhost:8080 pnpm playwright test e2e/jira-myself-route.spec.ts e2e/jira-myself.spec.ts`

### External HTTP MCP example (optional)

If you prefer to run an external MCP server, expose a simple HTTP JSON‑RPC endpoint at `/mcp` that accepts `{ jsonrpc, id, method, params }` and returns `{ jsonrpc, id, result }`. For example, a minimal Express server:

```ts
import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

// Example tools/resources (replace with your own)
const tools = [
  {
    name: "fetch_jira_ticket",
    description: "Fetch a Jira ticket",
    parameters: { ticketKey: { type: "string" } },
  },
  {
    name: "fetch_jira_myself",
    description: "Fetch current Jira user",
    parameters: {},
  },
];

app.post("/mcp", async (req, res) => {
  const { method, params, id } = req.body || {};
  try {
    if (method === "listTools")
      return res.json({ jsonrpc: "2.0", id, result: { tools } });
    if (method === "callTool") {
      const { name, arguments: args } = params || {};
      if (name === "fetch_jira_ticket") {
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              { type: "text", text: JSON.stringify({ key: "DEMO-1" }) },
            ],
          },
        });
      }
      if (name === "fetch_jira_myself") {
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              { type: "text", text: JSON.stringify({ accountId: "me" }) },
            ],
          },
        });
      }
      return res
        .status(400)
        .json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unknown tool: ${name}` },
        });
    }
    return res
      .status(400)
      .json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Unknown method: ${method}` },
      });
  } catch (e) {
    return res
      .status(500)
      .json({
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: e?.message || "Internal error" },
      });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () =>
  console.log(`MCP HTTP listening at http://localhost:${port}/mcp`),
);
```

Then set `MCP_BASE_URL=http://localhost:4000` in `.env` and restart. All MCP calls will route to your server.

## Using with Ollama

This application supports local AI models via Ollama out of the box:

### 1. Install and Start Ollama

```bash
# Install Ollama (see https://ollama.ai)
# Then pull a model:
ollama pull llama3.1:latest

# Start Ollama server
ollama serve
```

### 2. Configure Environment

Update your `.env` file with Ollama settings:

```bash
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
MODEL_NAME=branko:latest  # or any model you have installed
```

### 3. Start the Application

```bash
pnpm dev
```

The app will now use your local Ollama models instead of OpenAI!

### WSL2: Windows Ollama via localhost (Proxy + Auto‑Port)

If Ollama runs on Windows (not inside WSL) and you want to keep `OPENAI_BASE_URL=http://127.0.0.1:11434/v1` in WSL:

```bash
# Windows (PowerShell as admin):
# Listen externally and allow inbound TCP 11434
setx OLLAMA_HOST 0.0.0.0
# Restart the Ollama service and open port 11434 in Windows Firewall

# WSL: free port 11434 if in use
ss -ltnp | grep ':11434'   # kill the PID if needed

# Start app normally
pnpm dev
```

The server checks if your `MODEL_NAME` (e.g., `branko:latest`) exists at `127.0.0.1:11434` inside WSL. If not, it binds a tiny proxy on `127.0.0.1:11434` and forwards to the Windows host IP (detected from `/etc/resolv.conf` or `WINDOWS_OLLAMA_HOST_IP`).

If `127.0.0.1:11434` is already in use in WSL, the server auto‑picks the first free port in a short range (default `11434..11440`) and binds a local forward proxy there. All LLM calls then use `http://127.0.0.1:<electedPort>/v1`. If no port in the range is free, it falls back to the Windows IP directly: `http://<WINDOWS_OLLAMA_HOST_IP>:11434/v1`.

Quick verification:

- `GET /api/healthz` returns `ollamaProxy.port` when the proxy is active and `effectiveBaseUrl` reflecting the URL actually used.
- Open `/diagnostics` in the app to see the chosen route and port.

Env switches:

- `WINDOWS_OLLAMA_HOST_IP` — IP of the Windows host (no scheme/port)
- `OLLAMA_PROXY_START_PORT` (default `11434`), `OLLAMA_PROXY_PORT_TRIES` (default `7`)

### Supported Models

Any model available in Ollama can be used by setting the `MODEL_NAME` environment variable:

- `llama3.1:latest`
- `llama3.2:latest`
- `mistral:latest`
- `codellama:latest`
- And many more...

## Project Structure

```
client/                   # React frontend
├── components/          # UI components
│   ├── chat/           # Chat-specific components
│   └── ui/             # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and API functions
└── pages/              # Route components

server/                   # NestJS backend
├── chat/               # Chat module (services, controllers, DTOs)
├── routes/             # Express route handlers (legacy)
├── services/           # Business logic services
└── entities/           # Database entities

shared/                   # Shared types between client/server
└── api.ts              # API interfaces and types
```

## Routing Overview

- `/` – Post‑login onboarding page (hero, lookahead search, rounded chat)
- `/chat` – Full chat workspace (branches, history, right sidebar queries)

The onboarding page lets you try a prompt and see a streaming response. After the first answer arrives, you are automatically redirected to `/chat`, and the session appears alongside your other conversations.

## Post‑Login Onboarding Page

- Hero section with a relaxed SaaS tone and a quick CTA to “Open Full Chat”.
- Lookahead search over deterministic queries (local today, DB-ready):
  - Uses `client/components/ui/command`.
  - Keyboard shortcut: Cmd/Ctrl+K to focus the search.
- Rounded chat preview powered by the same `ChatArea` as the main workspace to preserve visual consistency.
- On first streamed response, the conversation is saved and you are redirected to `/chat`.

Key files:

- `client/pages/PostLogin.tsx` – onboarding page (hero + search + chat)
- `client/components/QuerySearch.tsx` – lookahead search component
- `client/lib/queries.ts` – shared deterministic query templates
- `client/pages/Index.tsx` – full chat workspace

## API Endpoints

- `GET /api/ping` - Health check
- `POST /api/chat` - Non-streaming chat completion
- `POST /api/chat/stream` - Streaming chat completion
- `POST /api/chat/persistent` - Chat with database persistence
- `POST /api/chat/persistent/stream` - Streaming chat with persistence

## Development Commands

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm typecheck        # TypeScript validation
pnpm test             # Run tests
```

## Coding Standards & Agent Behavior

These rules combine our internal `.cursor/rules/general.mdc` with the repo’s conventions. They guide how to implement features, structure code, and operate as an agent on this project.

**Pages**

- If unauthenticated, show login/signup.
- If authenticated, go to the home where the user sees their chats.

**Tech Stack Alignment**

- React 18 + TypeScript + Vite + TailwindCSS + Radix UI + Lucide.
- AI via Vercel AI SDK; for Ollama use `@ai-sdk/openai-compatible` and `chatModel()`.
- Supabase planned for CRUD/persistence (optional; wire later as needed).

**Best Practices**

- Always create a brief plan before implementing a task and get approval to execute when collaborating. Do not auto‑execute large changes without agreement.
- Keep it simple and make it work (KISS). Avoid speculative features (YAGNI). Follow clean code practices.
- Reuse existing components where possible (`client/components`). If new, add under an appropriate subfolder there and make it theme‑aware.
- After each fix/implementation, provide exact commands to test end‑to‑end.
- Do not use emojis in logs.

**Implementation Rules**

- Prefer client‑side changes. Only add server endpoints when strictly necessary (secrets, DB, private integrations).
- Use NestJS controllers/services for backend work; avoid adding ad‑hoc Express routes.
- Preserve streaming behavior: server uses AI SDK DataStream; client parses SSE `text-delta` and falls back to raw chunks.
- Keep environment secrets on the server. Do not attempt to read local `.env` via agent/tooling calls.

**MCP Usage (JIRA Automation)**

- MCP is used for supported deterministic queries. Communication is JSON‑RPC 2 over HTTP when `MCP_BASE_URL` is set, fixtures when `MCP_USE_FIXTURES=1`, or direct Jira calls by default. Stdio is not used.

For more operational guidance, see `AGENTS.md`.

## Deployment

### Build for Production

```bash
pnpm build
```

### Environment Variables for Production

Set the following environment variables in your deployment platform:

```bash
# AI Provider Configuration
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.openai.com/v1  # or your Ollama URL
MODEL_NAME=gpt-4o-mini  # or your preferred model

# Database (optional)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server
PORT=3000
```

## Features Documentation

### Branching Conversations

- Click the "Branch" button on any message to create a new conversation thread
- Each branch maintains its own conversation history
- Navigate between branches using the conversation tree

### Streaming Responses

- Messages appear in real-time as the AI generates them
- Supports both OpenAI and Ollama streaming
- Graceful fallback for connection issues

### Chat Persistence

- Conversations are automatically saved to Supabase (when configured)
- Resume conversations across sessions
- Full conversation history and branching preserved

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

# Model Context Protocol (MCP) Integration

This application integrates with MCP to enhance JIRA workflow automation. The system detects deterministic queries and executes MCP tool/resource calls to fetch data. No external MCP repo is required; the server provides built‑in adapters and supports fixtures. The legacy `hello_world_mcp` example has been removed as part of repo cleanup.

### Upstash Health Snapshots

The server can publish a health snapshot to Upstash Redis so you can inspect environment and proxy status remotely.

- Configure `.env`:

```
UPSTASH_REDIS_REST_URL=https://<your-upstash-endpoint>
UPSTASH_REDIS_REST_TOKEN=<your-upstash-rest-token>
# Optional overrides
UPSTASH_HEALTH_KEY=healthz:last
UPSTASH_HEALTH_INTERVAL_SEC=60
```

- Behavior:
  - On startup, a snapshot is written to `UPSTASH_HEALTH_KEY` (default `healthz:last`).
  - If `UPSTASH_HEALTH_INTERVAL_SEC` > 0, it continues to publish every N seconds.
  - Snapshot includes: `status`, `port`, `host`, `env` summary, `ollamaProxy` status, and `time`.

- CLI helper:
  - `scripts/upstash get healthz:last`
  - `scripts/upstash set some:key someValue`

## Supported Deterministic Queries

The system automatically handles these query patterns:

1. **JIRA Ticket Details**
   - `"Show details for issue SCRUM-8 including status, assignee, and blockers"`
   - Executes: `fetch_jira_ticket` tool

2. **Issue Listing**
   - `"List all issues assigned to me ordered by priority"`
   - Executes: `fetch_jira_projects` tool

3. **Release Notes**
   - `"Generate concise release notes for version v1.2.3 from merged tickets"`
   - Executes: `fetch_jira_projects` tool

4. **Blocker Analysis**
   - `"What are the current blockers for epic EPIC-1?"`
   - Executes: `fetch_jira_ticket` tool

5. **Sprint Planning**
   - `"Create a 2-week sprint plan for team TEAM-A"`
   - Executes: `fetch_current_sprint` tool

## Setup and Configuration

### Quick Start with MCP

Default modes:

- Direct Jira adapter: no extra setup; reads `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`.
- Fixtures: set `MCP_USE_FIXTURES=1`.
- External HTTP MCP (optional): set `MCP_BASE_URL` (e.g., `http://localhost:4000`).

### API Endpoints

The application provides these API endpoints for MCP interaction:

- `GET /api/mcp/tools` - List available MCP tools
- `POST /api/mcp/tool` - Execute MCP tool call
- `POST /api/mcp/resource` - Read MCP resource

### Fixture/Internal Adapter Mode

For deterministic local runs and CI, the server can serve MCP responses from fixtures without spawning an external MCP process. Enable fixtures:

```
MCP_USE_FIXTURES=1
```

With fixtures on, a minimal internal adapter is used (no spawn) that supports:

- Tools: `process_text`, `fetch_jira_ticket`
- Resources: `mcp://local-mcp-server/jira/projects`

It reads Jira values from `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` when needed and returns MCP‑compatible response shapes, so the client/UI requires no changes. To use a real MCP via stdio instead, unset `MCP_USE_FIXTURES` and configure `MCP_SERVER_PATH`.

## How It Works

### Query Processing Flow

1. **Detection**: User query is analyzed for deterministic patterns using `query-matcher.ts`
2. **MCP Execution**: Matching queries trigger appropriate MCP tool calls
3. **Data Formatting**: MCP responses are formatted for structured display
4. **AI Analysis**: LLM provides additional insights based on retrieved data
5. **Response**: Combined MCP data + AI analysis shown to user

### Fallback Mechanism

If the MCP server is unavailable or returns an error, the system falls back to:

1. Simulated responses for testing/demo purposes
2. Regular LLM processing without the additional context

### Files

The MCP integration consists of these key files:

- `client/lib/mcp-client.ts` - MCP client communication
- `client/lib/query-matcher.ts` - Query pattern detection and response formatting
- `server/mcp/*` - MCP tools/resources, fixtures, adapters

## E2E Tests

- Run all: `pnpm test:e2e` (auto-starts Vite+Nest with fixtures enabled)
- Or run against a manually started dev server: `pnpm dev:fixtures` then `pnpm test:e2e:noserver`
- Specs live in `e2e/` and the config is `playwright.config.ts`.

## Example Response

When a deterministic query is detected, the response will include both the structured data from JIRA and AI-generated analysis:

```
**JIRA Ticket: SCRUM-8**
📋 **Summary:** Sample ticket SCRUM-8 - API Integration Issue
📊 **Status:** In Progress
👤 **Assignee:** John Doe
⚡ **Priority:** High
📝 **Description:** This is a simulated JIRA ticket...
🚫 **Blockers:**
  • Waiting for API documentation
  • Security review pending

**Analysis:**
[AI-generated insights based on the ticket data]
```

## Known Issues

### Fixed Issues (September 2025)

**✅ Fixed: Chat Streaming Endpoint Crash (streamResponse undefined)**

Symptoms:

- Server logs showed: `TypeError: Cannot read properties of undefined (reading 'streamResponse')` when calling `POST /api/chat/stream`.
- Root cause: legacy controller relied on a DI-provided service method shape that changed and returned an unexpected value.

Solution Applied:

- Migrated `POST /api/chat/stream` to use the AI SDK DataStream directly in `server/chat/chat.controller.ts`.
- Prefer SSE DataStream via `pipeDataStreamToResponse`; fallback to plain text chunks if not available.
- This aligns with Context7 and Vercel AI SDK v5 streaming behavior.

Impact:

- Robust streaming on both OpenAI and Ollama-compatible backends.
- Enables future tool/event streaming compatibility.

Test:

```powershell
$b = @'
{"messages":[{"role":"user","content":"Say hello"}]}
'@
Set-Content -Path body.json -Value $b -Encoding UTF8
curl.exe -N -H "Content-Type: application/json" --data-binary "@body.json" http://localhost:3001/api/chat/stream
```

**✅ Fixed: Non‑Streaming Chat Endpoint Crash (getResponse undefined)**

Symptoms:

- Server logs showed: `TypeError: Cannot read properties of undefined (reading 'getResponse')` on `POST /api/chat`.
- Root cause: DI timing/shape mismatch when invoking the service from the controller.

Solution Applied:

- Updated `POST /api/chat` to call the AI SDK directly (same parameters as streaming), then return the accumulated text and usage metrics.

Test:

```powershell
$b = @'
{"messages":[{"role":"user","content":"Say hello"}]}
'@
Invoke-WebRequest -Uri http://localhost:3001/api/chat -Method Post -ContentType 'application/json' -Body $b | Select-Object -ExpandProperty Content
```

**✅ Fixed: Client Streaming Parser Compatibility**

Symptoms:

- Client expected raw chunked text only; newer AI SDK streams use DataStream SSE with `text-delta` events.

Solution Applied:

- `client/lib/api.ts` now detects `text/event-stream` and parses AI SDK DataStream events; otherwise falls back to raw chunked text.

Impact:

- Works across SDK versions and providers, preparing for Context7 tool events.

**✅ Fixed: Type Safety for `DBMessage.role`**

Symptoms:

- Type errors on `use-chats.ts` due to `role` being a generic string from the DB.

Solution Applied:

- Coerce/guard DB `role` into the strict union (`"user" | "assistant"`) when setting state.

—

Why we found these:

-Observed during end‑to‑end streaming tests and PowerShell curl/iwr runs in Windows. The specific DI errors surfaced in server logs when exercising both streaming and non‑streaming endpoints. We also hit Windows quoting issues while testing; the here‑string and file‑based JSON examples above avoid escaping pitfalls.

Recommended versions:

- Keep `ai` on latest 5.x and `@ai-sdk/*` on latest 1.x minor updates to preserve DataStream behavior. We continue to use `@ai-sdk/openai-compatible` + `chatModel()` for Ollama compatibility.

Note: The commands above are included to make it easy to validate fixes locally [[memory:8815693]].

**✅ Fixed: OAuth 2.0 Client Credentials Implementation**

Added full OAuth 2.0 client credentials support for JIRA Cloud integration to replace deprecated Basic Auth. The MCP server now supports both authentication methods with automatic fallback.

**Solution Applied:**

```javascript
// OAuth 2.0 client credentials implementation in hello_world_mcp/src/server.js
const JIRA_CONFIG = {
  // Basic Auth (fallback)
  baseUrl: process.env.JIRA_BASE_URL || "https://mrdjanstajic.atlassian.net",
  email: process.env.JIRA_EMAIL || "mrdjanstajic@gmail.com",
  apiToken: process.env.JIRA_API_TOKEN || "",
  // OAuth 2.0 (preferred)
  oauthClientId: process.env.JIRA_OAUTH_CLIENT_ID || "",
  oauthClientSecret: process.env.JIRA_OAUTH_CLIENT_SECRET || "",
  oauthAudience: process.env.JIRA_OAUTH_AUDIENCE || "api.atlassian.com",
  oauthEnabled: !!process.env.JIRA_OAUTH_CLIENT_ID && !!process.env.JIRA_OAUTH_CLIENT_SECRET,
};

async getJiraClient() {
  if (JIRA_CONFIG.oauthEnabled) {
    const token = await this.getOAuthToken();
    return {
      baseURL: `https://api.atlassian.com/ex/jira/${process.env.JIRA_CLOUD_ID}`,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    };
  }
  // Fallback to Basic Auth...
}
```

**Environment Configuration:**

```bash
# OAuth 2.0 (recommended)
JIRA_OAUTH_CLIENT_ID=your_client_id_from_developer_console
JIRA_OAUTH_CLIENT_SECRET=your_client_secret
JIRA_OAUTH_AUDIENCE=api.atlassian.com
JIRA_CLOUD_ID=your_cloud_id_uuid

# Basic Auth (fallback)
JIRA_BASE_URL=https://your-instance.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_classic_api_token
```

**✅ Fixed: AI SDK Endpoint Mismatch**

The AI SDK was incorrectly calling `/v1/responses` instead of the correct `/v1/chat/completions` endpoint for Ollama. This has been fixed by replacing `@ai-sdk/openai` with `@ai-sdk/openai-compatible` and using the `chatModel()` method.

**Solution Applied:**

```typescript
// Old approach with incompatibility
import { createOpenAI } from "@ai-sdk/openai";
const ollama = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "branko:latest",
  baseURL: process.env.OPENAI_BASE_URL || "http://127.0.0.1:11434/v1",
  compatibility: "strict", // This didn't work properly
});
const result = streamText({
  model: ollama(modelName),
  // ...
});

// New approach with full compatibility
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
const ollama = createOpenAICompatible({
  baseURL: process.env.OPENAI_BASE_URL || "http://127.0.0.1:11434/v1",
  name: "ollama",
  apiKey: process.env.OPENAI_API_KEY || "ollama",
});
const result = streamText({
  model: ollama.chatModel(modelName), // Use chatModel for proper endpoint routing
  // ...
});
```

**Impact of Fix:**

- MCP integration works correctly (fetches JIRA data)
- Chat/LLM analysis now works properly with Ollama
- Users receive complete AI-enhanced responses

**✅ Fixed: JIRA Authentication**

Some JIRA operations were failing with "not found" errors due to:

- Invalid/expired API tokens
- Incorrect JIRA instance URL
- Non-existent ticket IDs (e.g., SCRUM-8)

**Solution:**

The issue has been fixed by correctly configuring the JIRA credentials in the `../hello_world_mcp/.env` file:

```
# JIRA Configuration
JIRA_BASE_URL=https://your-instance.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_valid_api_token

# Log level
LOG_LEVEL=debug
```

**Important:** You must use valid JIRA ticket IDs that actually exist in your JIRA instance.

### Current Issues (September 2025)

**🔧 In Progress: OAuth Scopes Configuration**

OAuth 2.0 authentication is working but returns 403 Forbidden errors due to insufficient scopes in the Atlassian OAuth app configuration.

**Current Status:**

- ✅ OAuth token generation successful
- ✅ CloudId discovery implemented
- ✅ Bearer authentication working
- ❌ Missing required JIRA scopes causing 403 errors

**Required Actions:**

1. Configure OAuth app in Atlassian Developer Console (https://developer.atlassian.com/console/myapps/)
2. Add required scopes:
   - `read:jira-work` (for reading issues)
   - `read:jira-user` (for user data)
   - `manage:jira-project` (for project operations)
3. Wait 5-10 minutes for scope propagation

**❌ Missing: JIRA Issue Creation for Testing**

The test ticket SCRUM-8 doesn't exist in the JIRA instance, causing "not found" errors even with proper authentication.

**Solution Needed:**

- Create actual JIRA issues for testing
- Or implement issue creation in MCP tools
- Or use existing ticket IDs from your JIRA instance

**Testing Commands:**

```bash
# Test OAuth token generation
curl -sS -X POST https://auth.atlassian.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"YOUR_CLIENT_ID","client_secret":"YOUR_CLIENT_SECRET","audience":"api.atlassian.com"}'

# Test JIRA API with Bearer token
curl -sS -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.atlassian.com/ex/jira/YOUR_CLOUD_ID/rest/api/3/myself"

# Test MCP tool call
curl -sS -X POST http://localhost:8080/api/mcp/tool \
  -H "Content-Type: application/json" \
  -d '{"name":"fetch_jira_ticket","arguments":{"ticketKey":"SCRUM-8"}}'
```

**Logs Location:** Check `hello_world_mcp/logs/mcp_server.log` for detailed OAuth and JIRA API call logs.

### Debugging Steps

1. **Verify Ollama is running:**

   ```bash
   curl http://127.0.0.1:11434/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{"model":"qwen2:7b-instruct","messages":[{"role":"user","content":"test"}]}'
   ```

2. **Test MCP server independently:**

   ```bash
   cd ../hello_world_mcp
   node src/server.js
   ```

3. **Update JIRA credentials in `../hello_world_mcp/.env`**

### Technical Notes

The core MCP integration is functional - the stdio communication, query matching, and data formatting all work correctly. The primary blocker is the AI SDK configuration for Ollama compatibility.

## MCP HTTP Integration Migration (Problem, Solution, Cost, Tests)

### Problem we solved

- MCP ran only via STDIO and was proxied through a legacy Express integration bundled in Vite dev server. This caused:
  - Environment variable inheritance issues (tokens not reliably available to the MCP subprocess)
  - Poor observability (stdio-only logs, hard to trace)
  - CORS/origin confusion and port conflicts during dev
  - NestJS vs Express duplication of API surfaces
  - Fragile dev wiring (accidental double `/api/api` paths, controller DI context issues, ESM `__dirname` problems, and headers-sent warnings)

### What we changed

- Consolidated on NestJS for the API surface and removed the legacy Express wiring from Vite.
- Added middleware to NestJS MCP routes:
  - `measureMcpLatency` (adds timing logs; soft SLO < 60s)
- Updated `McpService`:
  - Primary path: JSON‑RPC over HTTP to MCP endpoint if configured
  - Fallback: STDIO client transport when HTTP MCP is unavailable (dev-friendly)
  - Fixed DI with explicit `@Inject(ConfigService)` and ESM `__dirname` via `fileURLToPath`
- Vite now proxies `/api` to Nest (port 3001) for a single origin in dev; UI stays on `http://localhost:8080`.

### Cost (trade‑offs and effort)

- Engineering effort: ~1–2 days of refactor + debugging (DI, ESM pathing, dev scripts, proxy, JWT)
- Removed JWT-based guarding. No auth is used for MCP routes in this app.
- Operational trade‑off: separate MCP HTTP service is optional; when used, must run on a port different from Nest; otherwise STDIO fallback is used in dev
- Benefit: clear API boundary, better observability, JWT guard path to production, no Express-in-Vite coupling

### How to run (dev)

PowerShell

```powershell
# 1) Start Nest (API) on 3001
$env:PORT = 3001
pnpm dev:server

# 2) In a second terminal, start Vite (UI) on 8080
pnpm exec vite
```

Vite proxies `/api/*` → `http://localhost:3001/*`.

### Optional HTTP MCP

- Default dev uses STDIO fallback. To use HTTP MCP instead, run it on a different port (e.g., 3101) and set:

```powershell
$env:MCP_BASE_URL = "http://localhost:3101"
```

### Test scripts (PowerShell)

Health

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/ping"
Invoke-RestMethod -Uri "http://localhost:8080/api/ping"
```

List MCP tools (through Nest)

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/mcp/tools"

# Via Vite proxy
Invoke-RestMethod -Uri "http://localhost:8080/api/mcp/tools"
```

Call a tool

```powershell
$body = @{ name = "jira_whoami"; arguments = @{} } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri "http://localhost:3001/api/mcp/tool" -Method Post -ContentType "application/json" -Body $body
```

Read a resource

```powershell
$body = @{ uri = "mcp://local-mcp-server/jira/projects" } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri "http://localhost:3001/api/mcp/resource" -Method Post -ContentType "application/json" -Headers $hdr -Body $body
```

SLO/observability

- Responses include timing in logs; violations print `MCP_SLO_VIOLATION` if > 60s.
- Check server logs while invoking endpoints.

## License

This project is licensed under the MIT License.

#TODO

- [ ] still halucinates
- [ ] lots of duplicate files/stubbs remove them
