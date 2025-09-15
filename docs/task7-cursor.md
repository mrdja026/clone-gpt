# Home page redesign

The Home page needs redesigng the image is in the prompt

- Use exisiting components
- Change styles if needed like that gradient
- make the chooser more bigger and rounder
- USE CURSOR RULES

## What’s done

- Implemented a clean landing/home page that shows when there’s no active conversation content.
- Added a theme‑aware background gradient (top‑left → top‑right) in `client/global.css` (light and dark variants).
- Made the deterministic query search UI bigger and rounder:
  - Updated `QuerySearch` and a dedicated `DeterministicSearchBar` with `h-16`, larger text, and `rounded-3xl` styling.
  - Prominent Apply button with matching size/roundness.
- Ensured focus UX: when starting a new chat or selecting a predefined prompt, the chat textarea auto‑focuses.
- Kept existing UI components (shadcn/Radix) and Tailwind design tokens; no server changes.

## Refactor (SPA only)

- Extracted conversation state/handlers to `client/hooks/use-conversations.ts`.
- Split home UI into small components under `client/components/home/`:
  - `HomeLayout` – container/wrapper
  - `HomeHero` – title, subtitle, icon
  - `DeterministicSearchBar` – large rounded input + Apply
  - `TemplatesGrid` – renders predefined queries
- Added `client/components/chat/ChatShell.tsx` to compose `ChatArea` + `RightSidebar`.
- Slimmed `client/pages/Index.tsx` to a thin orchestrator using the hook and new components.

## How to test

1. Start dev: `pnpm dev`
2. Open `http://localhost:8080`
3. Verify:
   - Landing gradient appears (light/dark supported via ThemeToggle).
   - Search bar and Apply button are large and rounded.
   - Clicking a template or pressing Enter on the search moves to a new chat and focuses the textarea.
   - Sidebar history and switching still work.
