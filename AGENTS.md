# Fusion Starter

A production-ready full-stack React application template with a NestJS server integrated into the Vite dev workflow, featuring React Router 6 SPA mode, TypeScript, Vitest, Playwright (e2e), Zod and modern tooling.

While the starter includes a server, only add endpoints when strictly necessary (e.g., secrets handling, DB operations, MCP spawning). Prefer doing UI logic on the client and sharing pure types in `shared/`.

## Tech Stack

- **PNPM**: Prefer pnpm
- **Frontend**: React 18 + React Router 6 (SPA) + TypeScript + Vite + TailwindCSS 3
- **Backend**: NestJS API (dev-proxied behind Vite)
- **Testing**: Vitest (unit) + Playwright (e2e)
- **UI**: Radix UI + TailwindCSS 3 + Lucide React icons

## Project Structure

```
client/                   # React SPA frontend
├── pages/                # Route components (Index.tsx = home)
├── components/ui/        # Pre-built UI component library
├── App.tsx                # App entry point and with SPA routing setup
└── global.css            # TailwindCSS 3 theming and global styles

server/                   # NestJS API backend
├── main.ts               # Nest bootstrap (bind host/port, global prefix /api)
├── app.module.ts         # Root module (controllers/providers)
├── controllers/          # HTTP controllers (e.g., ping, demo, healthz)
├── mcp/                  # MCP controller/service for tools/resources
└── fixtures/             # Dev/test fixtures (e.g., Jira SCRUM-8)

shared/                   # Types used by both client & server
└── api.ts                # Example of how to share api interfaces
```

## Key Features

## SPA Routing System

The routing system is powered by React Router 6:

- `client/pages/Index.tsx` represents the home page.
- Routes are defined in `client/App.tsx` using the `react-router-dom` import
- Route files are located in the `client/pages/` directory

For example, routes can be defined with:

```typescript
import { BrowserRouter, Routes, Route } from "react-router-dom";

<Routes>
  <Route path="/" element={<Index />} />
  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
  <Route path="*" element={<NotFound />} />
</Routes>;
```

### Styling System

- **Primary**: TailwindCSS 3 utility classes
- **Theme and design tokens**: Configure in `client/global.css`
- **Theme and design consistency**: As the rest of @components and use TAILWIND IMPORTANT
- **UI components**: Pre-built library in `client/components/ui/`
- **Utility**: `cn()` function combines `clsx` + `tailwind-merge` for conditional classes

```typescript
// cn utility usage
className={cn(
  "base-classes",
  { "conditional-class": condition },
  props.className  // User overrides
)}
```

### NestJS Server Integration

- **Dev architecture**: Vite serves the SPA on `http://localhost:8080` and proxies `/api/*` to Nest on `http://localhost:3001` (configurable via `API_PORT`).
- **Hot reload**: Client (Vite) and server (tsx watch) both hot-reload.
- **API prefix**: All routes are under `/api/*`.
- **WSL2**: Vite `host: true`, `strictPort: true`, and HMR host are set for Windows access.

#### Example API Routes

- `GET /api/ping` - Simple ping
- `GET /api/demo` - Demo endpoint
- `GET /api/healthz` - Diagnostics (port/host, MCP path)
- `GET /api/mcp/tools` - List MCP tools (via MCP service)
- `POST /api/mcp/tool` - Call MCP tool
- `POST /api/mcp/resource` - Read MCP resource

### Shared Types

Import consistent types in both client and server:

```typescript
import { DemoResponse } from "@shared/api";
```

Path aliases:

- `@shared/*` - Shared folder
- `@/*` - Client folder

## Development Commands

```bash
pnpm dev                 # Start dev (Vite 8080 + Nest 3001)
pnpm dev:fixtures       # Start dev with MCP fixtures enabled
pnpm dev:logs           # Start dev and tee combined logs to logs/dev_*.log
pnpm dev:fixtures:open  # Dev + auto-open browser + ready ping
pnpm build              # Production build (client + server)
pnpm start              # Start production server
pnpm typecheck          # TypeScript validation
pnpm test               # Vitest tests
pnpm test:e2e           # Playwright e2e (auto-start)
pnpm test:e2e:noserver  # Playwright e2e (assumes dev server already running)
```

## Adding Features

### Add new colors to the theme

Open `client/global.css` and `tailwind.config.ts` and add new tailwind colors.

### New API Route (NestJS)

1. Optional: Define a shared interface in `shared/api.ts`:

```typescript
export interface MyRouteResponse {
  message: string;
  // Add other response properties here
}
```

2. Create a controller in `server/controllers/my.controller.ts`:

```typescript
import { Controller, Get } from "@nestjs/common";
import type { MyRouteResponse } from "@shared/api";

@Controller("my-endpoint")
export class MyController {
  @Get()
  get(): MyRouteResponse {
    return { message: "Hello from my endpoint!" };
  }
}
```

3. Add the controller to `server/app.module.ts` controllers array.

4. Use in React components with type safety:

```typescript
import { MyRouteResponse } from "@shared/api"; // Optional: for type safety

const response = await fetch("/api/my-endpoint");
const data: MyRouteResponse = await response.json();
```

### New Page Route

1. Create component in `client/pages/MyPage.tsx`
2. Add route in `client/App.tsx`:

```typescript
<Route path="/my-page" element={<MyPage />} />
```

## Production Deployment

- **Standard**: `pnpm build`
- **Binary**: Self-contained executables (Linux, macOS, Windows)
- **Cloud Deployment**: Use either Netlify or Vercel via their MCP integrations for easy deployment. Both providers work well with this starter template.

## Architecture Notes

- Dev proxy: Vite (8080) proxies `/api/*` to Nest (3001). Use `API_PORT` to customize the proxy target.
- TypeScript throughout (client, server, shared)
- Full hot reload for rapid development
- Production-ready with multiple deployment options
- Comprehensive UI component library included
- Type-safe API communication via shared interfaces
- MCP integration: optional external MCP via `MCP_SERVER_PATH`; fixtures via `MCP_USE_FIXTURES=1`.
- use general.mdc for coding .cursor/rules/general.mdc

## CODING

Behave like my second brain. Work through the problem until you’d naturally stop after ~30 minutes.

## Debugging & Logs

- Read `session.md` first
  - Treat `session.md` as the living source of truth when debugging. It documents the latest environment assumptions, E2E coverage, WSL2 notes, and commands. Start there to avoid stale steps.
  - use general.mdc for coding .cursor/rules/general.mdc

- Fast logging loop
  - `pnpm dev:logs` — runs dev and writes combined logs to `logs/dev_YYYYMMDD_HHMMSS.log` (Vite + Nest). Inspect this file when the app appears to “hang”.
  - Health: `GET /api/healthz` (see `server/controllers/demo.controller.ts`) to verify bind host/port and MCP path existence.

- WSL2 specifics (from session.md)
  - Dev proxy: Vite 8080 → Nest 3001. Ports must be free; use `ss -ltnp | rg ':3001|:8080'` to check conflicts.
  - Auto-open helper: `pnpm dev:fixtures:open` (uses `scripts/open-on-ready.sh` to wait for the app and open a Windows browser via `wslview`/`cmd.exe`).
  - If localhost bridging fails, get the WSL IP and open `http://<WSL_IP>:<vite_port>`.

- MCP fixtures and types
  - Enable deterministic Jira responses with `MCP_USE_FIXTURES=1`.
  - Fixture example: `server/fixtures/jira/SCRUM-8.json`; shared type: `shared/api.ts` (`JiraTicket`).

- E2E reference (Playwright)
  - Config: `playwright.config.ts`. Specs: `e2e/home-smoke.spec.ts`, `e2e/mcp-scrum8.spec.ts`.
  - Run: `pnpm test:e2e` (auto server) or `pnpm dev:fixtures` + `pnpm test:e2e:noserver`.
