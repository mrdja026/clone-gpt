## Task: Add Perplexity Tool + History Resource to MCP

This task adds:

- A new MCP tool: perplexity_search
- A new MCP resource namespace: perplexity://history/\*
- Health check endpoint and minimal caching

All snippets are TypeScript-focused and compatible with OpenAI-style Perplexity API usage.

### Prerequisites

- Perplexity API key in environment: PERPLEXITY_API_KEY=[key][^1][^2][^3]
- Node.js 18+ with fetch or install axios/node-fetch[^4][^5]
- Your existing HTTP MCP server/controller skeleton

### 1) Install Dependencies

### LOCATION

- server

```bash
pnpm install @modelcontextprotocol/sdk zod
# optional if not on Node 18+ or prefer axios:
pnpm install axios
```

### 2) Env Configuration

Create .env:

```env
PERPLEXITY_API_KEY=sk-xxxx
PERPLEXITY_API_BASE=https://api.perplexity.ai
PERPLEXITY_MODEL=sonar-pro
```

Notes:

- Perplexity is OpenAI-compatible; endpoint is /chat/completions and uses Bearer key auth.[^2][^6][^1]
- sonar/sonar-pro are common model identifiers; adjust as needed.[^7][^2]

### 3) Wire Server Capabilities

In server boot (e.g., server/mcp/mcp.service.ts), ensure MCP capabilities include tools and resources:

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

export const mcpServer = new McpServer({
  name: "local-mcp",
  version: "0.1.0",
  capabilities: {
    tools: {},
    resources: {
      subscribe: false,
      listChanged: false,
    },
  },
});
```

### 4) Perplexity Search Tool

Add tool definition (e.g., server/mcp/tools/perplexity.ts):

```ts
import { z } from "zod";
import { mcpServer } from "../mcp.service";

const schema = {
  query: z.string(),
  system: z.string().optional(),
  recency: z.enum(["day", "week", "month", "year"]).optional(),
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
  stream: z.boolean().optional(),
  // simple domain filter instruction for prompt engineering
  domain: z.string().optional(),
};

type Args = z.infer<(typeof mcpServer)["tools"]["perplexity_search"]["schema"]>;

function buildMessages(args: any) {
  const sys = args.system || "Be precise and concise.";
  const domainHint = args.domain
    ? ` Only use or prioritize sources from domain: ${args.domain}`
    : "";
  return [
    { role: "system", content: sys },
    { role: "user", content: `${args.query}${domainHint}` },
  ];
}

async function callPerplexity(args: any) {
  const base = process.env.PERPLEXITY_API_BASE || "https://api.perplexity.ai";
  const model = process.env.PERPLEXITY_MODEL || "sonar-pro";
  const body: any = {
    model,
    messages: buildMessages(args),
  };
  if (args.max_tokens) body.max_tokens = args.max_tokens;
  if (args.temperature !== undefined) body.temperature = args.temperature;
  if (args.stream) body.stream = true;
  if (args.recency) body.search_recency_filter = args.recency;

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Perplexity API error: ${res.status} ${errText}`);
  }
  return res.json();
}

// simple in-memory cache by query hash
const cache = new Map<string, any>();
function key(args: any) {
  return JSON.stringify({
    q: args.query,
    r: args.recency,
    d: args.domain,
    t: args.temperature,
    m: args.max_tokens,
  });
}

// In-memory history
const history: Array<{
  ts: number;
  query: string;
  params: any;
  result: any;
}> = [];

mcpServer.tool("perplexity_search", schema, async (args) => {
  const k = key(args);
  if (cache.has(k)) {
    const cached = cache.get(k);
    history.push({
      ts: Date.now(),
      query: args.query,
      params: args,
      result: cached,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(cached, null, 2) }],
    };
  }

  const result = await callPerplexity(args);
  cache.set(k, result);
  history.push({ ts: Date.now(), query: args.query, params: args, result });
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
});

// export history for resources
export function getPerplexityHistory() {
  return history;
}
```

Key points:

- Uses Perplexity chat completions endpoint with OpenAI-style schema.[^6][^1][^2]
- Implements simple recency filter mapped to search_recency_filter.[^2]
- Optional streaming flag laid out; actual server-sent events handling can be added later.[^2]
- Caching reduces cost and latency.[^3]

### 5) History Resource Namespace

Expose history with URIs: perplexity://history/ and filters.

```ts
// server/mcp/resources/perplexity-history.ts
import { mcpServer } from "../mcp.service";
import { getPerplexityHistory } from "../tools/perplexity";

mcpServer.resource("perplexity://history/*", async (uri) => {
  // Supported forms:
  // perplexity://history/              -> all
  // perplexity://history/since/<ms>   -> since epoch ms
  // perplexity://history/last/<n>     -> last N entries
  const parts = uri.replace("perplexity://history/", "").split("/").filter(Boolean);
  const all = getPerplexityHistory();

  let items = all;
  if (parts === "since" && parts[^21]) {
    const since = Number(parts[^21]);
    if (!Number.isNaN(since)) items = all.filter(h => h.ts >= since);
  } else if (parts === "last" && parts[^21]) {
    const n = Number(parts[^21]);
    if (!Number.isNaN(n)) items = all.slice(-n);
  }

  return {
    contents: [
      { type: "text", text: JSON.stringify(items, null, 2) },
    ],
  };
});
```

Notes:

- Declares a resource namespace per MCP spec; resources provide contextual data via URIs.[^8][^9]
- Keeps it simple with in-memory history for low complexity start.

### 6) HTTP Controller Wiring

If your controller dispatches JSON-RPC over HTTP:

- Continue terminating /api/mcp/\* into your McpService.callRpc
- Ensure the McpServer is bound to those handlers

Example minimal express glue:

```ts
import express from "express";
import bodyParser from "body-parser";
import { mcpServer } from "./server/mcp/mcp.service"; // from above

const app = express();
app.use(bodyParser.json());

app.get("/api/mcp/tools", async (req, res) => {
  const tools = mcpServer.listTools();
  res.json(tools);
});

app.post("/api/mcp/tool", async (req, res) => {
  const { name, args } = req.body;
  const out = await mcpServer.runTool(name, args);
  res.json(out);
});

app.post("/api/mcp/resource", async (req, res) => {
  const { uri } = req.body;
  const out = await mcpServer.getResource(uri);
  res.json(out);
});

// Health check with a 1-token probe
app.get("/health", async (_req, res) => {
  let perplexity = "unknown";
  try {
    const r = await fetch(
      `${process.env.PERPLEXITY_API_BASE || "https://api.perplexity.ai"}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.PERPLEXITY_MODEL || "sonar-pro",
          messages: [{ role: "user", content: "health check" }],
          max_tokens: 1,
        }),
      },
    );
    perplexity = r.ok ? "healthy" : "unhealthy";
  } catch {
    perplexity = "unhealthy";
  }
  res.json({ mcp_server: "healthy", perplexity_api: perplexity });
});

app.listen(3030, () => console.log("MCP HTTP server on :3030"));
```

This aligns with your “controller routes terminate in McpService” pattern and keeps auth simple.[^10][^2]

### 7) Example Calls

- Search:

```bash
curl -X POST http://localhost:3030/api/mcp/tool \
  -H "Content-Type: application/json" \
  -d '{
    "name": "perplexity_search",
    "args": {
      "query": "Compare WebGPU vs CUDA for LLM inference",
      "recency": "month",
      "temperature": 0.2
    }
  }'
```

- History (all):

```bash
curl -X POST http://localhost:3030/api/mcp/resource \
  -H "Content-Type: application/json" \
  -d '{"uri":"perplexity://history/"}'
```

- History (last 5):

```bash
curl -X POST http://localhost:3030/api/mcp/resource \
  -H "Content-Type: application/json" \
  -d '{"uri":"perplexity://history/last/5"}'
```

- Health:

```bash
curl http://localhost:3030/health
```

### 8) Notes on Streaming

If enabling streaming, set stream: true and implement event parsing. The Perplexity API supports stream parameter per OpenAI-compatible spec. Keep this as a later enhancement.[^6][^2]

---

## Manual Steps to Execute

Follow these concrete steps to bring this live:

### Step 1: Get API Key

- Retrieve Perplexity API key from account settings and note the /chat/completions endpoint is OpenAI-compatible.[^11][^1][^2]

### Step 2: Configure Environment

- Add PERPLEXITY_API_KEY and optionally PERPLEXITY_MODEL, PERPLEXITY_API_BASE to .env.[^1][^2]

### Step 3: Install Libraries

- Install @modelcontextprotocol/sdk and zod; install axios only if desired.[^12][^4][^5]

### Step 4: Add MCP Capabilities

- Ensure your McpServer exposes tools and resources per MCP spec in the initialization.[^13][^9]

### Step 5: Implement the Tool

- Create perplexity_search tool using the POST /chat/completions endpoint and forward parameters for recency, temperature, tokens.[^7][^1][^2]

### Step 6: Implement History Resource

- Add perplexity://history/\* resource to expose in-memory logs; support since and last filters.[^9][^8]

### Step 7: Wire HTTP Endpoints

- Ensure /api/mcp/tools, /api/mcp/tool, /api/mcp/resource call through McpService to tool/resource handlers.[^4][^13]

### Step 8: Add Health Check

- Implement /health that posts a 1-token probe to Perplexity and returns healthy/unhealthy.[^10][^2]

### Step 9: Test

- Start server, run curl calls for tool, resource, and health. Validate responses and logs.[^2][^9]

### Step 10: Iterate OUT OF SCOPE

- Add caching TTL, domain filters, improved error messages, and optional streaming later.[^3][^2]

This plan uses Perplexity’s OpenAI-compatible chat completions API to keep auth and integration minimal, and leverages MCP tools/resources per spec for clean client interoperability.[^13][^1][^9][^2]
<span style="display:none">[^14][^15][^16][^17][^18][^19][^20][^22]</span>

<div style="text-align: center">⁂</div>

[^1]: https://docs.perplexity.ai/getting-started/quickstart

[^2]: https://docs.perplexity.ai/api-reference/chat-completions-post

[^3]: https://zuplo.com/learning-center/perplexity-api

[^4]: https://hackteam.io/blog/build-your-first-mcp-server-with-typescript-in-under-10-minutes/

[^5]: https://mcpcat.io/guides/adding-custom-tools-mcp-server-typescript/

[^6]: https://docs.perplexity.ai/guides/chat-completions-guide

[^7]: https://www.byteplus.com/en/topic/376356

[^8]: https://modelcontextprotocol.info/docs/concepts/resources/

[^9]: https://modelcontextprotocol.io/docs/concepts/resources

[^10]: https://mcpcat.io/guides/building-health-check-endpoint-mcp-server/

[^11]: https://www.apideck.com/blog/how-to-get-your-perplexity-api-key

[^12]: https://github.com/modelcontextprotocol/typescript-sdk

[^13]: https://modelcontextprotocol.io/docs/concepts/tools

[^14]: https://apidog.com/blog/perplexity-ai-api/

[^15]: https://www.heise.de/en/background/Model-Context-Protocol-Application-example-in-TypeScript-10553218.html

[^16]: https://docs.perplexity.ai/llms-full.txt

[^17]: https://learn.microsoft.com/en-us/azure/developer/ai/build-mcp-server-ts

[^18]: https://modelcontextprotocol.io/examples

[^19]: https://www.linkup.so/blog/perplexity-sonar-vs-linkup

[^20]: https://modelcontextprotocol.info/docs/concepts/tools/

[^21]: https://dev.to/shadid12/how-to-build-mcp-servers-with-typescript-sdk-1c28

[^22]: https://docs.perplexity.ai/guides/mcp-server
