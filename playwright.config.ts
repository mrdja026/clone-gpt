import { defineConfig } from "@playwright/test";

const skipWebServer = process.env.PW_SKIP_WEBSERVER === "1";

const useRealJira =
  process.env.REAL_JIRA === "1" || process.env.REAL_JIRA === "true";

export default defineConfig({
  testDir: "e2e",
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:8080",
    trace: "on-first-retry",
    viewport: { width: 1280, height: 800 },
  },
  webServer: skipWebServer
    ? undefined
    : {
        command: `pnpm dev`,
        url: "http://localhost:8080",
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
