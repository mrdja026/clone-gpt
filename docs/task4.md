# Task 4 — Providers Pages

This task is implemented. Below is what was built and how to use it.

## What Was Built

- Home section "Connect to provider" with two cards: Perplexity and Notion.
- Two new pages with consistent app styling:
  - `/providers/perplexity` – shows "Enter your creds data here" and basic actions.
  - `/providers/notion` – same, plus documented env variables.
- Header navigation via a compact "Providers" dropdown to keep the header tidy instead of a full hamburger menu.
- End‑to‑end coverage ensuring navigation works and content renders as expected.

## How It Works

- Routing: Registered in `client/App.tsx` using React Router 6.
  - `Route path="/providers/perplexity" element={<ProviderPerplexity />}`
  - `Route path="/providers/notion" element={<ProviderNotion />}`
- Home entry point: `client/pages/PostLogin.tsx` renders the "Connect to provider" section with two cards and "Open" buttons linking to the routes.
- Header access: `client/components/ProvidersMenu.tsx` adds a "Providers" dropdown with links to both pages; used in headers on the provider pages and PostLogin.
- Styling: Reuses the app shell via `AppHeader`, and UI components `button`, `card`, `dropdown-menu` for a consistent look.

## Files Changed/Added

- `client/App.tsx` – Registered provider routes.
- `client/pages/PostLogin.tsx` – Added "Connect to provider" section with cards/buttons.
- `client/pages/ProviderPerplexity.tsx` – New page using the standard header and card layout.
- `client/pages/ProviderNotion.tsx` – New page; includes env var guidance.
- `client/components/ProvidersMenu.tsx` – New header dropdown for Providers links.
- `e2e/providers.spec.ts` – New Playwright tests covering navigation and page content.
- `env.example` – Added example Notion variables for documentation/demo.

## Notion Environment Variables

Add these to your `.env` (server-side usage only; do not expose real secrets in the client):

- `NOTION_API_KEY=seccc`
- `NOTION_DATABASE_ID=DBSC`

They are displayed on the Notion page as guidance and prefilled with example values.

## How To Use

- Dev: `pnpm dev` then open `http://localhost:8080`.
- On the home page, find "Connect to provider" and click Open on Perplexity or Notion.
- Or, use the header "Providers" dropdown from any page to jump to a provider page.

## Tests

- Run all e2e: `pnpm test:e2e` (auto-starts the server) or `pnpm dev:fixtures` then `pnpm test:e2e:noserver`.
- `e2e/providers.spec.ts` asserts:
  - Home shows the section and both provider entries.
  - Perplexity page opens and contains guidance text.
  - Notion page opens and shows `NOTION_API_KEY` and `NOTION_DATABASE_ID`.

## Server Changes

None. This task is purely client-side. Any real credentials handling should be implemented via server endpoints if/when needed.
