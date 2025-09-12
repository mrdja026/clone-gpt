// Legacy Express server removed in favor of NestJS (`server/main.ts`).
// This file is kept for reference but no longer used.
export function createServer() {
  throw new Error(
    "createServer is deprecated. Use NestJS server (server/main.ts)",
  );
}
