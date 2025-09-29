# Local LLM + Perplexity Data MCP Server Implementation

**Architecture**: Perplexity API for data fetching → Local LLM for processing/reasoning

## Prerequisites

- Perplexity API key: PERPLEXITY_API_KEY (only API key needed)
- Local LLM running (your existing local model setup)
- Node.js 18+ with fetch
- Your existing HTTP MCP server/controller skeleton
- Model is defined in .env .env.backup
- Adress to llm is defined in .env .env.backup

## Step 1: Install Dependencies

```bash
cd server
pnpm install @modelcontextprotocol/sdk zod
```

## Step 2: Environment Configuration

Create/update `.env`:

```env
PERPLEXITY_API_KEY=pplx-your-key-here
PERPLEXITY_API_BASE=https://api.perplexity.ai
```

## Step 3: MCP Server Setup

Create or expand `server/mcp/mcp.service.ts`:

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

export const mcpServer = new McpServer({
  name: "local-llm-mcp",
  version: "1.0.0",
  capabilities: {
    tools: {},
    resources: {
      subscribe: false,
      listChanged: false,
    },
  },
});
```

## Step 4: Perplexity Data Fetcher Tool

Create `server/mcp/tools/perplexity-data.ts`:

```ts
import { z } from "zod";
import { mcpServer } from "../mcp.service";

const schema = {
  query: z.string(),
  recency: z.enum(["day", "week", "month", "year"]).optional(),
  domain: z.string().optional(),
  return_citations: z.boolean().optional(),
  return_sources: z.boolean().optional(),
  max_results: z.number().optional(),
};

async function fetchPerplexityData(args: any) {
  const base = process.env.PERPLEXITY_API_BASE || "https://api.perplexity.ai";

  // System prompt optimized for data collection, not reasoning
  const systemPrompt =
    "Return comprehensive, detailed search results with all relevant information and sources. Do not summarize or analyze - provide complete data for further processing.";

  const body = {
    model: "sonar-pro",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: args.domain
          ? `Search for: ${args.query}. Focus on domain: ${args.domain}`
          : args.query,
      },
    ],
    search_recency_filter: args.recency || "month",
    return_citations: args.return_citations !== false,
    return_sources: args.return_sources !== false,
    max_tokens: args.max_results
      ? Math.min(args.max_results * 100, 4000)
      : 4000,
  };

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

  const result = await res.json();

  // Format data specifically for local LLM consumption
  const formattedData = {
    search_metadata: {
      query: args.query,
      timestamp: new Date().toISOString(),
      recency_filter: args.recency || "month",
      domain_filter: args.domain || null,
    },
    content: result.choices?.[0]?.message?.content || "",
    citations: result.citations || [],
    sources: result.sources || [],
    raw_response: result,
    instructions_for_local_llm:
      "Process this search data according to the user's needs. Analyze, summarize, compare, or answer questions based on this information.",
  };

  return formattedData;
}

// Simple in-memory cache by query hash
const cache = new Map<string, any>();
function cacheKey(args: any) {
  return JSON.stringify({
    q: args.query.toLowerCase(),
    r: args.recency,
    d: args.domain,
  });
}

// Search history for local LLM context
const searchHistory: Array<{
  id: string;
  timestamp: number;
  query: string;
  params: any;
  data: any;
}> = [];

mcpServer.tool("fetch_perplexity_data", schema, async (args) => {
  const k = cacheKey(args);

  if (cache.has(k)) {
    const cached = cache.get(k);
    const id = Date.now().toString(36);
    searchHistory.push({
      id,
      timestamp: Date.now(),
      query: args.query,
      params: args,
      data: cached,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ...cached,
              cache_hit: true,
              search_id: id,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  const data = await fetchPerplexityData(args);
  cache.set(k, data);

  const id = Date.now().toString(36);
  searchHistory.push({
    id,
    timestamp: Date.now(),
    query: args.query,
    params: args,
    data,
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            ...data,
            cache_hit: false,
            search_id: id,
          },
          null,
          2,
        ),
      },
    ],
  };
});

// Export history for resources
export function getSearchHistory() {
  return searchHistory;
}
```

## Step 5: Search History Resource

Create `server/mcp/resources/search-history.ts`:

```ts
import { mcpServer } from "../mcp.service";
import { getSearchHistory } from "../tools/perplexity-data";

mcpServer.resource("search://history/*", async (uri) => {
  // Supported forms:
  // search://history/              -> all searches
  // search://history/recent/5      -> last 5 searches
  // search://history/since/1672531200000  -> since timestamp
  // search://history/query/tesla   -> searches containing "tesla"

  const parts = uri.replace("search://history/", "").split("/").filter(Boolean);
  const history = getSearchHistory();

  let filtered = history;

  if (parts.length === 0) {
    // Return all history
    filtered = history;
  } else if (parts[0] === "recent" && parts[1]) {
    const count = parseInt(parts[1]);
    filtered = history.slice(-count);
  } else if (parts[0] === "since" && parts[1]) {
    const since = parseInt(parts[1]);
    if (!isNaN(since)) {
      filtered = history.filter((h) => h.timestamp >= since);
    }
  } else if (parts[0] === "query" && parts[1]) {
    const searchTerm = decodeURIComponent(parts[1]).toLowerCase();
    filtered = history.filter((h) =>
      h.query.toLowerCase().includes(searchTerm),
    );
  }

  // Format for local LLM context consumption
  const contextData = {
    resource_type: "search_history",
    total_searches: history.length,
    filtered_count: filtered.length,
    searches: filtered.map((search) => ({
      id: search.id,
      timestamp: new Date(search.timestamp).toISOString(),
      query: search.query,
      summary: search.data.content.substring(0, 200) + "...",
      source_count: search.data.sources?.length || 0,
      domain_filter: search.params.domain || null,
      recency_filter: search.params.recency || "month",
    })),
    full_data_available:
      "Use search://history/full/{id} to get complete search data",
    usage_note:
      "This context helps understand previous searches and their relationships",
  };

  return {
    contents: [{ type: "text", text: JSON.stringify(contextData, null, 2) }],
  };
});

// Resource for full search data by ID
mcpServer.resource("search://history/full/*", async (uri) => {
  const searchId = uri.replace("search://history/full/", "");
  const history = getSearchHistory();
  const search = history.find((h) => h.id === searchId);

  if (!search) {
    throw new Error(`Search with ID ${searchId} not found`);
  }

  return {
    contents: [{ type: "text", text: JSON.stringify(search.data, null, 2) }],
  };
});
```

## Step 6: Import Tools and Resources

Create `server/mcp/index.ts`:

```ts
// Import to register tools and resources
import "./tools/perplexity-data";
import "./resources/search-history";

export { mcpServer } from "./mcp.service";
```

## Step 7: HTTP Controller

Create/update your HTTP controller or reuse search for server folder (e.g., `server/index.ts`):

```ts
import express from "express";
import bodyParser from "body-parser";
import { mcpServer } from "./mcp";

const app = express();
app.use(bodyParser.json());

app.get("/api/mcp/tools", async (req, res) => {
  try {
    const tools = await mcpServer.listTools();
    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/mcp/tool", async (req, res) => {
  const { name, args } = req.body;
  try {
    const result = await mcpServer.callTool(name, args);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/mcp/resources", async (req, res) => {
  try {
    const resources = await mcpServer.listResources();
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/mcp/resource", async (req, res) => {
  const { uri } = req.body;
  try {
    const result = await mcpServer.readResource(uri);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check - only tests Perplexity API (local LLM assumed healthy)
app.get("/health", async (_req, res) => {
  const health = {
    mcp_server: "healthy",
    local_llm: "assumed_healthy",
    perplexity_api: "unknown",
  };

  try {
    const testResponse = await fetch(
      `${process.env.PERPLEXITY_API_BASE || "https://api.perplexity.ai"}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [{ role: "user", content: "test" }],
          max_tokens: 1,
        }),
      },
    );
    health.perplexity_api = testResponse.ok ? "healthy" : "unhealthy";
  } catch {
    health.perplexity_api = "unhealthy";
  }

  res.json(health);
});

const PORT = process.env.PORT || 3030;
app.listen(PORT, () => {
  console.log(`Local LLM + Perplexity MCP server running on port ${PORT}`);
});
```

## Step 8: Package.json Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch server/index.ts",
    "build": "tsc",
    "start": "node dist/server/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "zod": "^3.22.0",
    "express": "^4.18.0",
    "body-parser": "^1.20.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0"
  }
}
```

## Step 9: TypeScript Config

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["server/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Step 10: Test Commands

Start the server:

```bash
pnpm run dev
```

Test data fetching:

```bash
curl -X POST http://localhost:3030/api/mcp/tool \
  -H "Content-Type: application/json" \
  -d '{
    "name": "fetch_perplexity_data",
    "args": {
      "query": "Latest developments in local LLM optimization",
      "recency": "week",
      "return_sources": true
    }
  }'
```

Test search history:

```bash
curl -X POST http://localhost:3030/api/mcp/resource \
  -H "Content-Type: application/json" \
  -d '{"uri":"search://history/recent/3"}'
```

Test health:

```bash
curl http://localhost:3030/health
```

## Usage Workflow

1. **Local LLM requests data**: Calls `fetch_perplexity_data` tool
2. **Perplexity returns raw data**: Search results, sources, citations
3. **Local LLM processes data**: Analysis, reasoning, synthesis happens locally
4. **Context building**: Previous searches available via `search://history/*` resources
5. **Privacy maintained**: Only search queries go external, all reasoning stays local

## Key Benefits

- **Privacy**: All reasoning happens on your local model
- **Cost effective**: Minimal Perplexity API usage
- **Flexible**: Your local model controls all processing
- **Contextual**: Search history available for complex reasoning
- **Cached**: Duplicate searches served from cache

# ✅ TASK 8 COMPLETED: Forward-Only MCP Architecture Implementation

## 🎯 Objective Achieved

Successfully refactored both repositories to implement a clean forward-only MCP architecture:

- `hello-world-mcp`: Barebone MCP server with HTTP JSON-RPC support (no LLM)
- `clone-gpt`: Forward-only MCP proxy with local LLM (Qwen2) separation

## 🏗️ Architecture Implemented

```
┌─────────────────┐    HTTP JSON-RPC     ┌──────────────────┐
│   clone-gpt     │ ──────────────────► │ hello-world-mcp  │
│ (Forward-only)  │    /mcp endpoint     │   (HTTP + stdio) │
│ Port 8080       │                      │   Port 4000      │
└─────────────────┘                      └──────────────────┘
          │                                        │
          │ Local LLM (Qwen2)                     │ Tools:
          │ via Ollama                             │ • add_numbers
          ▼                                        │ • fetch_jira_ticket
┌─────────────────┐                               │ • JIRA integration
│ Chat Interface  │                               └──────────────────┘
│ (Independent)   │
└─────────────────┘
```

## 🔧 Implementation Details

### hello-world-mcp Changes

1. **Added HTTP JSON-RPC endpoint** (`POST /mcp`) while preserving stdio
2. **Fixed JIRA configuration precedence** - now uses `process.env.JIRA_BASE_URL` first
3. **Added Express/CORS dependencies** for HTTP server
4. **Security**: Localhost-only binding with optional bearer token auth
5. **Updated package.json**: Fixed bin path, added dependencies

### clone-gpt Changes

1. **External-only MCP service** requiring `MCP_BASE_URL`
2. **Enhanced error handling** for MCP connection failures
3. **Updated env.example** with external MCP default
4. **Documentation updates** for new architecture (fixtures/legacy removed)

## 📋 Configuration Applied

### hello-world-mcp (.env)

```bash
# HTTP Mode
MCP_HTTP_PORT=4000                    # Enable HTTP JSON-RPC server
MCP_HTTP_TOKEN=optional_token         # Optional bearer auth

# JIRA Integration
JIRA_BASE_URL=https://your.atlassian.net
JIRA_EMAIL=you@domain.com
JIRA_API_TOKEN=your_jira_token
```

### clone-gpt (.env)

```bash
# MCP Configuration (External-only)
MCP_BASE_URL=http://127.0.0.1:4000    # External MCP server endpoint

# Local LLM Configuration (Ollama)
MODEL_NAME=qwen2                      # Local Ollama model
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
```

## ✅ Testing Results

### Server Startup Logs

**hello-world-mcp:**

```
[dotenv@17.2.2] injecting env (0) from .env
Local MCP Server running on stdio
MCP HTTP server running on http://127.0.0.1:4000
```

**clone-gpt:**

```
[NEST] NestJS application is running on: http://localhost:3001
[VITE] ➜  Local:   http://localhost:8080/
[NEST] [OllamaProxy] ACTIVATED: 127.0.0.1:11434 -> 192.168.128.1:11434 (missing 'qwen2' locally)
```

### Integration Test Results

**✅ MCP Tools Discovery:**

```bash
GET http://localhost:8080/api/mcp/tools
Response: {"tools":[{"name":"add_numbers",...},{"name":"fetch_jira_ticket",...}]}
```

**✅ Tool Execution:**

```bash
POST http://localhost:8080/api/mcp/tool
Body: {"name":"add_numbers","arguments":{"numbers":[10,20,30]}}
hello-world-mcp logs: Tool called: add_numbers { numbers: [ 10, 20, 30 ] }
clone-gpt logs: MCP_REQUEST { path: '/api/mcp/tool', method: 'POST', durationMs: 11 }
```

**✅ Error Handling:**
When hello-world-mcp is down:

```
[NEST] ERROR [ExceptionsHandler] Error: Cannot connect to MCP server at http://127.0.0.1:4000/mcp.
Ensure the MCP server is running and accessible.
```

## 🚀 Verification Commands

### Start Servers

```powershell
# Terminal 1: Start hello-world-mcp with HTTP
cd C:\Users\Mrdjan\Documents\workspace\hello-world-mcp
$env:MCP_HTTP_PORT='4000'
node src/server.js

# Terminal 2: Start clone-gpt in forward mode
cd C:\Users\Mrdjan\Documents\workspace\clone-gpt
pnpm dev
```

### Test Integration

```powershell
# List tools via clone-gpt → hello-world-mcp
Invoke-WebRequest -Uri http://localhost:8080/api/mcp/tools -UseBasicParsing

# Execute tool via full chain
$body = '{"name":"add_numbers","arguments":{"numbers":[1,2,3,4,5]}}'
Invoke-WebRequest -Uri http://localhost:8080/api/mcp/tool -Method POST -Body $body -ContentType "application/json" -UseBasicParsing

# Access web interface
# Open: http://localhost:8080
```

## 🎯 Key Benefits Achieved

1. **✅ Clean Separation**: MCP handles tools/resources; LLM stays local
2. **✅ No Process Management**: External MCP runs independently
3. **✅ Context7 Compatible**: Standard JSON-RPC over HTTP
4. **✅ Swappable**: Can point to any MCP server via MCP_BASE_URL
5. **✅ Secure**: MCP secrets isolated in external server
6. **✅ Dual Transport**: Supports both stdio (editors) and HTTP (web)

## 📚 Documentation Updated

- **hello-world-mcp/Readme.md**: Added HTTP mode documentation, security notes
- **clone-gpt/docs/How_MCP_works_here.md**: Updated with forward-only architecture
- **clone-gpt/README.md**: Added MCP integration quickstart section
- **clone-gpt/env.example**: Updated with forward-only defaults

## 🏁 Status: COMPLETE ✅

The forward-only MCP architecture has been **successfully implemented and tested**. Both servers are operational with the new architecture providing clean separation of concerns, improved security, and Context7 compatibility.
