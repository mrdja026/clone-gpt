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

# MCP External HTTP MCP
MCP_BASE_URL=http://127.0.0.1:4000
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

- Start `hello-world-mcp` on `http://127.0.0.1:4000`, then `pnpm dev` here.

#### 4) Validate

- Health: `GET http://localhost:3001/api/healthz` → check `effectiveBaseUrl`, `MCP_*` flags
- UI: ask a Jira key (e.g., `SCRUM-8`) → expect a RAW_DATA block first; reply “analyze that” for the explanation.

Troubleshooting:

- Ensure `MCP_BASE_URL` is set to your MCP bridge URL.
- If Ollama returns 404, ensure Lane A uses `/api/generate` and Lane C uses `/api/chat` on the right ports.
