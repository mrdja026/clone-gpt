How MCP works in this app
Client: mcpClient calls our server over HTTP: GET /api/mcp/tools, POST /api/mcp/tool, POST /api/mcp/resource (client/lib/mcp-client.ts).
Server controller: /api/mcp/_ routes terminate in server/mcp/mcp.controller.ts → McpService.
Server service: McpService.callRpc() resolves where to execute:
If MCP_BASE_URL is set, it forwards JSON‑RPC to <MCP_BASE_URL>/mcp (HTTP MCP).
Else if MCP_USE_FIXTURES=1, it serves deterministic tools/resources (and reads server/fixtures/jira/_).
Else it uses a built‑in adapter that calls Jira APIs with JIRA\__ envs.
Supported tools include Jira fetches and a simple process_text. Resources expose projects/sprint summaries.
Connect Perplexity: two supported approaches
Option A — External HTTP MCP (recommended for clean separation)
Run a Perplexity MCP server (e.g., community “Perplexity MCP Server” or your own) that exposes tools via MCP JSON‑RPC endpoints: tools/list, callTool, readResource [MCP spec via Context7].
Configure our server to route to it:
Set MCP_BASE_URL=http://localhost:4000 (the server must answer POSTs at <base>/mcp).
Keep MCP_USE_FIXTURES=0.
That server should define a tool like:
name: perplexity_chat
input schema: { model: string; messages: Array<{ role: 'system'|'user'|'assistant', content: string }> }
handler: POST https://api.perplexity.ai/chat/completions with header Authorization: Bearer <PPLX_API_KEY>, body {"model":"sonar-pro","messages":[...]} [Perplexity API docs via Context7].
Our client keeps using /api/mcp/tool and the new tool appears in /api/mcp/tools.
Option B — Built‑in tool in our server (fastest to try; secrets stay server‑side)
Add a new tool in McpService.callRpc('callTool') named perplexity_chat that:
Reads PPLX_API_KEY from env.
POSTs to https://api.perplexity.ai/chat/completions with:
Headers: Authorization: Bearer ${PPLX_API_KEY}, Content-Type: application/json.
Body: {"model":"sonar-pro","messages":[...],"stream":false}.
Returns { content:[{ type:'text', text: <model_text> }] }.
Leave MCP_BASE_URL unset; set MCP_USE_FIXTURES=0.
Minimal payload example (Perplexity)
Env you’ll need
For Option A (external MCP):
MCP_BASE_URL=http://localhost:<your-mcp-port>
The external server holds PPLX_API_KEY and performs the Perplexity call.
For Option B (built‑in tool):
PPLX_API_KEY=<your_perplexity_key>
Ensure MCP_USE_FIXTURES=0.
Verify end‑to‑end
Start dev with fixtures OFF:
List tools:
Call tool (see curl above). Also from UI, the “Perplexity” page is a placeholder; real secret should stay in env on the server.
Notes from MCP spec (Context7)
Tools expose name, description, and inputSchema; discovery happens via tools/list.
Servers should accept JSON‑RPC on a single endpoint and implement tools/list, callTool, resources/_ as needed.
Perplexity API requires Authorization: Bearer <token> and supports messages with system/user/assistant roles; use model: "sonar-pro" or another supported model.
If you want, I can implement Option B now and add a smoke test plus a small UI wire to trigger perplexity_chat. I’ll include run commands after the change
