### Raw‑First MCP Setup (Fixtures or Forward‑Only HTTP)

This app returns RAW_DATA first from MCP (Jira tools), then analyzes on your follow‑up message. No stdio MCP is used.

#### 1) Configure `.env`

Copy from `env.example` and ensure these are set:

```
# Raw‑first behavior
LANE_C_DIRECT_ANALYSIS=0

# Models
OPENAI_BASE_URL=http://127.0.0.1:11434/api/generate  # Gemma (Lane A)
GEMMA_MODEL=gemma-fc-test:latest
OLLAMA_URL=http://127.0.0.1:124/api/chat              # Qwen (Lane C)
MODEL_NAME=qwen2.5:7b

# MCP (choose one)
# Fixtures/dev (default)
MCP_FORWARD_ONLY=0
MCP_USE_FIXTURES=1

# Or Forward‑only HTTP MCP
# MCP_FORWARD_ONLY=1
# MCP_BASE_URL=http://127.0.0.1:4000
```

#### 2) Run models (addresses/ports)

- Lane A (Gemma): `http://127.0.0.1:11434/api/generate` (or dedicate to `http://127.0.0.1:123/api/generate`)
- Lane C (Qwen): `http://127.0.0.1:124/api/chat`

Make sure the models exist in Ollama:

```
gemma-fc-test:latest
qwen2.5:7b
```

#### 3) Start the app

- Fixtures mode: `pnpm dev:fixtures`
- Forward‑only HTTP MCP: Start `hello-world-mcp` on `http://127.0.0.1:4000`, then `pnpm dev` here.

#### 4) Validate

- Health: `GET http://localhost:3001/api/healthz` → check `effectiveBaseUrl`, `MCP_*` flags
- UI: ask a Jira key (e.g., `SCRUM-8`) → expect a RAW_DATA block first; reply “analyze that” for the explanation.

Troubleshooting:

- If you see `MCP is in forward-only mode...`, either set `MCP_FORWARD_ONLY=0` or provide `MCP_BASE_URL`.
- If Ollama returns 404, ensure Lane A uses `/api/generate` and Lane C uses `/api/chat` on the right ports.
