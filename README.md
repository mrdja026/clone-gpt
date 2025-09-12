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
- 🛠️ **MCP Tool Integration** - Connects to local `hello_world_mpc` server for JIRA operations
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

The integration requires the `hello_world_mpc` server, which should be located at:

```
../hello_world_mpc/src/server.js
```

Configure environment variables for the MCP server by creating a `.env` file in the `hello_world_mpc` directory:

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

### Current Bug Status (September 2025)

**❌ Critical Issue: AI SDK Endpoint Mismatch**

The AI SDK is incorrectly calling `/v1/responses` instead of the correct `/v1/chat/completions` endpoint for Ollama. This causes a 404 error when attempting to use the chat functionality.

**Error Details:**

```
APICallError [AI_APICallError]: Not Found
url: 'http://127.0.0.1:11434/v1/responses'
statusCode: 404
responseBody: '404 page not found'
```

**Expected Behavior:** The AI SDK should call `http://127.0.0.1:11434/v1/chat/completions` for OpenAI-compatible streaming.

**Current Workarounds Attempted:**

- ✅ Added `compatibility: "strict"` to force OpenAI-compatible endpoints
- ✅ Set `OPENAI_API_KEY=ollama`
- ✅ Configured `baseURL: "http://127.0.0.1:11434/v1"`
- ❌ Issue persists despite configuration changes

**Impact:**

- MCP integration works correctly (fetches JIRA data)
- Chat/LLM analysis fails due to endpoint mismatch
- Users see raw MCP data without AI enhancement

**⚠️ Secondary Issue: JIRA Authentication**

Some JIRA operations fail with "not found" errors, likely due to:

- Invalid/expired API tokens
- Insufficient JIRA permissions
- Non-existent ticket IDs (e.g., SCRUM-8)

**Error Example:**

```
MCP tool call error: McpError: MCP error -32602: JIRA ticket 'SCRUM-8' not found.
```

**Status:** Requires valid JIRA credentials and existing ticket IDs for testing.

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

## License

This project is licensed under the MIT License.
