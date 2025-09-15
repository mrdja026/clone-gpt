How MCP works in this app (Forward-only architecture)

## Architecture Overview

Client: mcpClient calls our server over HTTP: GET /api/mcp/tools, POST /api/mcp/tool, POST /api/mcp/resource (client/lib/mcp-client.ts).
Server controller: /api/mcp/\* routes terminate in server/mcp/mcp.controller.ts → McpService.
Server service: McpService.callRpc() operates in forward-only mode by default:

## Forward-only Mode (Default: MCP_FORWARD_ONLY=1)

- Requires MCP_BASE_URL to be set pointing to external MCP server
- All MCP calls are forwarded as JSON-RPC to <MCP_BASE_URL>/mcp
- No server-side tool implementations; pure proxy behavior
- Recommended for production and development with external MCP servers

## Legacy Mode (Development only: MCP_FORWARD_ONLY=0)

- If MCP_BASE_URL is set, forwards to external MCP first
- Else if MCP_USE_FIXTURES=1, serves deterministic tools/resources
- Else uses built-in adapters with JIRA\_\* envs
- Kept for backward compatibility and local development only

## Connecting External MCP Servers

### Recommended: hello-world-mcp with HTTP support

1. Start the hello-world-mcp server with HTTP enabled:

   ```bash
   cd hello-world-mcp
   MCP_HTTP_PORT=4000 JIRA_BASE_URL=https://your.atlassian.net npm start
   ```

2. Configure clone-gpt to forward to it:

   ```bash
   cd clone-gpt
   MCP_FORWARD_ONLY=1 MCP_BASE_URL=http://127.0.0.1:4000 pnpm dev
   ```

3. The hello-world-mcp provides:
   - add_numbers: Math operations
   - fetch_jira_ticket: JIRA ticket lookup
   - JSON-RPC endpoint at POST /mcp

### Other external MCP servers

Any MCP server that exposes HTTP JSON-RPC at `/mcp` endpoint with methods:

- tools/list (or listTools)
- tools/call (or callTool)
- resources/list
- resources/read (or readResource)

Example: Perplexity MCP server, custom tool servers, etc.

## Environment Configuration

### clone-gpt (Forward-only mode)

```bash
# MCP Configuration
MCP_FORWARD_ONLY=1                    # Enable forward-only mode (default)
MCP_BASE_URL=http://127.0.0.1:4000    # External MCP server endpoint

# Local LLM (independent of MCP)
MODEL_NAME=qwen2                      # Local Ollama model
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
```

### hello-world-mcp (External MCP server)

```bash
# HTTP Mode
MCP_HTTP_PORT=4000                    # Enable HTTP JSON-RPC server
MCP_HTTP_TOKEN=optional_token         # Optional bearer auth

# JIRA Integration
JIRA_BASE_URL=https://your.atlassian.net
JIRA_EMAIL=you@domain.com
JIRA_API_TOKEN=your_jira_token
```

## Verification Commands

### Start both servers:

```bash
# Terminal 1: Start hello-world-mcp with HTTP
cd hello-world-mcp
MCP_HTTP_PORT=4000 npm start

# Terminal 2: Start clone-gpt in forward mode
cd clone-gpt
MCP_FORWARD_ONLY=1 MCP_BASE_URL=http://127.0.0.1:4000 pnpm dev
```

### Test the integration:

```bash
# List available tools
curl http://localhost:8080/api/mcp/tools | cat

# Call a tool
curl -X POST http://localhost:8080/api/mcp/tool \
  -H "Content-Type: application/json" \
  -d '{"name":"add_numbers","arguments":{"numbers":[1,2,3]}}' | cat

# Test chat (uses local LLM, independent of MCP)
# Open http://localhost:8080 and try the chat interface
```

## Key Benefits

- **Clean separation**: MCP handles tools/resources; LLM stays local
- **No process management**: External MCP runs independently
- **Swappable**: Change MCP servers without touching clone-gpt
- **Secure**: MCP secrets stay in external server, not in web app
