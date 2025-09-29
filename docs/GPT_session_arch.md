Perfect. Let’s lay this out as a **practical plan** you can drop into your repo as a reference. This covers folder structure, responsibilities, and a baseline TypeScript implementation of a parser/normalizer module.

---

# 🔹 Plan: Tool Call Parser/Normalizer for SPA Client

## 1. Folder structure

```
apps/spa-client/
  src/
    parsing/
      toolCallNormalizer.ts   // core parsing logic
      toolCallTypes.ts        // TS interfaces
    services/
      mcpBridgeClient.ts      // wrapper to talk to your HTTP bridge
    ...
```

---

## 2. Responsibilities

- **`toolCallNormalizer.ts`**
  - Accepts _raw LLM output_ (string).
  - Tries multiple strategies in order:
    1. **Strict JSON** (`{ "name": "...", "arguments": {...} }`).
    2. **JSON in markdown fences** (`json … `).
    3. **Harmony syntax** (`<|tool_call|>...`).
    4. **Heuristic free-text parsing** (regex like `use add_numbers with a=3, b=4`).
    5. **Fallback**: return as plain text (no tool call).

  - Returns a normalized object:

    ```ts
    {
      isToolCall: boolean;
      toolCalls: { name: string; arguments: Record<string, any> }[];
      textResponse?: string;
    }
    ```

- **`mcpBridgeClient.ts`**
  - Takes normalized `toolCalls`.
  - Converts each into a JSON-RPC request (`tools/call`).
  - Sends via REST → HTTP bridge → MCP process.
  - Returns MCP results back to SPA.

---

## 3. Example: `toolCallTypes.ts`

```ts
export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ParsedResponse {
  isToolCall: boolean;
  toolCalls: ToolCall[];
  textResponse?: string;
}
```

---

## 4. Example: `toolCallNormalizer.ts`

````ts
import { ParsedResponse, ToolCall } from "./toolCallTypes";

export function parseToolCallResponse(content: string): ParsedResponse {
  if (!content?.trim()) {
    return { isToolCall: false, toolCalls: [], textResponse: "" };
  }

  // 1. Match JSON in markdown fences
  const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)```/);
  let candidate = jsonBlockMatch ? jsonBlockMatch[1] : content.trim();

  // 2. Try direct JSON parsing
  try {
    const parsed = JSON.parse(candidate);
    if (parsed.name && parsed.arguments) {
      return { isToolCall: true, toolCalls: [parsed] };
    }
    if (parsed.tool_calls) {
      return { isToolCall: true, toolCalls: parsed.tool_calls };
    }
  } catch (_) {
    // ignore
  }

  // 3. Harmony syntax <|tool_call|>add_numbers{"a":1,"b":2}
  const harmonyMatch = content.match(/<\|tool_call\|>(\w+)\s*(\{[\s\S]*\})/);
  if (harmonyMatch) {
    try {
      const args = JSON.parse(harmonyMatch[2]);
      return {
        isToolCall: true,
        toolCalls: [{ name: harmonyMatch[1], arguments: args }],
      };
    } catch (_) {
      // malformed args, ignore
    }
  }

  // 4. Heuristic free-text: "use add_numbers with a=3, b=4"
  const freeMatch = content.match(
    /add_numbers.*a\s*=?\s*(\d+).*b\s*=?\s*(\d+)/i,
  );
  if (freeMatch) {
    return {
      isToolCall: true,
      toolCalls: [
        {
          name: "add_numbers",
          arguments: { a: Number(freeMatch[1]), b: Number(freeMatch[2]) },
        },
      ],
    };
  }

  // 5. Fallback: plain text
  return { isToolCall: false, toolCalls: [], textResponse: content };
}
````

---

## 5. Example: `mcpBridgeClient.ts`

```ts
import axios from "axios";
import { ToolCall } from "../parsing/toolCallTypes";

const MCP_BRIDGE_URL =
  process.env.MCP_BRIDGE_URL || "http://localhost:3000/jsonrpc";

export async function callTool(tool: ToolCall) {
  const payload = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: { name: tool.name, arguments: tool.arguments },
    id: `call-${Date.now()}`,
  };

  const resp = await axios.post(MCP_BRIDGE_URL, payload);
  return resp.data;
}
```

---

## 6. Integration in SPA flow

```
LLM → raw text output
       │
       ▼
parseToolCallResponse()
       │
       ├─ if isToolCall: callTool() for each tool
       │   return MCP results to user
       │
       └─ else: display textResponse directly
```

---

## 7. Testing strategy

- Unit tests for `toolCallNormalizer.ts` with:
  - Valid JSON
  - JSON in code fences
  - Harmony syntax
  - Free-text like “Please use add_numbers with a=2, b=5”
  - Garbage → falls back to `textResponse`

- Integration test: feed fake model outputs → check normalized results → roundtrip through bridge.

---

✅ With this setup:

- **All fuzziness is trapped at the client parsing layer.**
- Bridge + MCP remain strict JSON-RPC only.
- Easy to extend later if new models output different tool call formats.

# 🧩 MCP Flow: Local vs Production

## 🔹 Local Development (3 Lanes)

When running locally, you need **all three lanes** to simulate the full path without paying for provider inference.

1. **Lane A — Fetch (MCP servers)**
   - Calls Jira (or other tools) via MCP servers.
   - Normalizes raw API blobs into predictable JSON (`issue`, `sprint`, `links`, etc.).
   - No inference.

2. **Lane B — Orchestration**
   - Glue code / microservice.
   - Fans out MCP calls, merges JSON, validates schema, maybe caches.
   - No inference, just business logic.

3. **Lane C — Local Summarizer**
   - Local LLM (Llama3, Qwen, Mistral, etc.).
   - Summarizes structured JSON into natural-language insights.
   - Exists **only in dev** so you can test end-to-end without burning provider tokens.

➡️ **Why 3 lanes locally?**

- You don’t have the provider plugged in.
- You need to validate schema → summarization works.
- You catch integration issues early.

---

## 🔹 Production (2 Lanes + Provider)

In production, **you don’t run inference** — the provider does. So you only own 2 lanes.

1. **Lane A — Fetch (MCP servers)**
   - Same as dev: deterministic API fetch + normalization.

2. **Lane B — Orchestration**
   - Same as dev: fan out, merge, validate, cache.

3. **Lane C — Summarizer (Provider)**
   - Not your responsibility in prod.
   - You just **dump the assembled JSON context** into provider API (OpenAI, Anthropic, Cohere, etc.).
   - Inference cost is predictable (per token).
   - Ops burden = zero (no GPUs, no scaling inference infra).

➡️ **Why only 2 lanes in prod?**

- Lane C collapses into a single provider API call.
- As MCP architect, you own deterministic context prep (A+B).
- Summarization & reasoning = outsourced.

---

## 📊 Quick Comparison Table

| Lane         | Local (Dev)                                    | Production (Prod)                             |
| ------------ | ---------------------------------------------- | --------------------------------------------- |
| Lane A       | MCP fetch & normalize                          | MCP fetch & normalize                         |
| Lane B       | Orchestration (fan-out, merge, cache)          | Orchestration (fan-out, merge, cache)         |
| Lane C       | **Local summarizer model** (simulate provider) | **Provider API call** (OpenAI/Anthropic/etc.) |
| Inference    | Local GPU/CPU for Lane C                       | Provider only                                 |
| Who owns it? | You (all 3)                                    | You: A+B, Provider: C                         |

## 🔹 Do you need _two_ LLMs locally?

- **Case 1 — Deterministic UI (dropdowns, IDs, slash commands)**
  - You don’t need an LLM to “decide” which tool to call.
  - Your SPA/UX routes directly to MCP tools.
  - ✅ Only **one local LLM** is required (Lane C = summarizer).
  - Lane A+B are pure code, no inference.

- **Case 2 — Freehand / natural language queries**
  - You _do_ need an LLM (Lane B’) to parse “What tickets are blocking sprint 42?” → `list_issues + get_links`.
  - OSS models aren’t consistent at tool calling → you need a robust parser/normalizer, few-shot prompts, maybe grammar constraints.
  - ✅ That means **two local LLMs**:
    - Model 1 = intent → tool calls.
    - Model 2 = summarizer.

---

## 🔹 Why we started with “two models” earlier

We were exploring **Lane B as LLM-based tool caller** (because OSS function calling is flaky).
That’s only necessary if you want to handle fuzzy queries without strict UI constraints.

---

## 🔹 Your situation

- You already thought of **dropdowns and IDs**.
- That means **tool selection is deterministic in the UI**.
- So in local dev you can get away with **just one LLM (summarizer)**.

Lane B is code-only orchestration → no inference.

---

✅ **Answer:**
You don’t _have_ to run two LLMs locally. If your UI is strict (slash commands, dropdowns, IDs), Lane A+B are pure code, and you only need one local LLM for summarization (Lane C).

The “two LLMs” setup only comes back if you decide to support freehand natural-language queries, where an LLM has to guess which MCP tool to call.
