# Clone GPT - AI Chat Application

A production-ready ChatGPT-like application built with React, NestJS, and AI SDK, featuring branching conversations and support for both OpenAI and local Ollama models.

## Features

- 🤖 **Real AI Conversations** - Powered by OpenAI GPT or local Ollama models
- 🌊 **Streaming Responses** - Real-time message streaming for better UX
- 🌳 **Branching Conversations** - Branch off from any message to explore different conversation paths
- 💾 **Persistent Chat History** - Save and resume conversations with Supabase integration
- 📱 **Responsive Design** - Modern UI with TailwindCSS and Radix components
- 🔧 **Flexible AI Provider** - Switch between OpenAI API and local Ollama seamlessly

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
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
MODEL_NAME=llama3.1:latest
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
MODEL_NAME=llama3.1:latest  # or any model you have installed
```

### 3. Start the Application

```bash
pnpm dev
```

The app will now use your local Ollama models instead of OpenAI!

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
- MCP must be used for supported deterministic queries. Communication is STDIO and JSON‑RPC 2, or HTTP if configured.
- The companion MCP server (`hello_world_mcp`) is included in this repo. Use `pnpm dev:mcp` when available.

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

This application integrates with the Model Context Protocol (MCP) to provide enhanced JIRA workflow automation. The system automatically detects deterministic queries and executes MCP tool calls to fetch real-time data from JIRA.

## Features

- 🔍 **Automatic Query Detection** - Recognizes JIRA-related queries and triggers MCP actions
- 🛠️ **MCP Tool Integration** - Connects to local `hello_world_mcp` server for JIRA operations
- 📊 **Structured Data Display** - Formats JIRA ticket data with status, assignee, and blockers
- 🤖 **AI Enhancement** - Combines MCP data with LLM analysis for comprehensive responses

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

We've created a convenience script that starts both the MCP server and the main application:

```bash
pnpm dev:mcp
```

This script:

1. Checks if the MCP server exists at the expected path
2. Creates a `.env` file in the MCP server directory if needed
3. Starts the MCP server on port 3001
4. Starts the main application

### Manual MCP Server Setup

The integration uses the `hello_world_mcp` server, located at:

```
../hello_world_mcp/src/server.js
```

Configure environment variables for the MCP server by creating a `.env` file in the `hello_world_mcp` directory:

```
# JIRA Configuration
JIRA_BASE_URL=your_jira_base_url
JIRA_EMAIL=your_jira_email
JIRA_API_TOKEN=your_jira_api_token
```

### API Endpoints

The application provides these API endpoints for MCP interaction:

- `GET /api/mcp/tools` - List available MCP tools
- `POST /api/mcp/tool` - Execute MCP tool call
- `POST /api/mcp/resource` - Read MCP resource

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
- `server/routes/mcp.ts` - MCP proxy server endpoints
- `start-with-mcp.js` - Convenience script to start both servers

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
- Added middlewares to NestJS MCP routes:
  - `verifyMcpJwt` (JWT optional in dev, enforced when `MCP_JWT_SECRET` is set)
  - `measureMcpLatency` (adds timing logs; soft SLO < 60s)
- Updated `McpService`:
  - Primary path: JSON‑RPC over HTTP to MCP endpoint if configured
  - Fallback: STDIO client transport when HTTP MCP is unavailable (dev-friendly)
  - Fixed DI with explicit `@Inject(ConfigService)` and ESM `__dirname` via `fileURLToPath`
- Vite now proxies `/api` to Nest (port 3001) for a single origin in dev; UI stays on `http://localhost:8080`.

### Cost (trade‑offs and effort)

- Engineering effort: ~1–2 days of refactor + debugging (DI, ESM pathing, dev scripts, proxy, JWT)
- Added dependencies: `jsonwebtoken` and its types
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

### Optional auth (JWT)

```powershell
$env:MCP_JWT_SECRET = "dev-secret"
$env:MCP_JWT = node -e "console.log(require('jsonwebtoken').sign({ sub:'dev-user' }, process.env.MCP_JWT_SECRET, { expiresIn:'1h' }))"
```

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
# Without JWT
Invoke-RestMethod -Uri "http://localhost:3001/api/mcp/tools"

# With JWT
$hdr = @{ Authorization = "Bearer $env:MCP_JWT" }
Invoke-RestMethod -Uri "http://localhost:3001/api/mcp/tools" -Headers $hdr

# Via Vite proxy
Invoke-RestMethod -Uri "http://localhost:8080/api/mcp/tools" -Headers $hdr
```

Call a tool

```powershell
$body = @{ name = "jira_whoami"; arguments = @{} } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri "http://localhost:3001/api/mcp/tool" -Method Post -ContentType "application/json" -Headers $hdr -Body $body
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
