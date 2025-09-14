import { Controller, Get } from "@nestjs/common";
import type { DemoResponse } from "../../shared/api";

@Controller()
export class DemoController {
  @Get("demo")
  getDemo(): DemoResponse {
    return {
      message: "Hello from NestJS!",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("ping")
  getPing(): { message: string } {
    const ping = process.env.PING_MESSAGE ?? "ping";
    return { message: ping };
  }

  @Get("healthz")
  healthz() {
    const port = process.env.PORT || "3001";
    const host = process.env.BIND_HOST || "0.0.0.0";
    return {
      status: "ok",
      port,
      host,
      env: {
        MCP_USE_FIXTURES: process.env.MCP_USE_FIXTURES || "",
        JIRA_BASE_URL: process.env.JIRA_BASE_URL ? "set" : "",
        OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "",
        MODEL_NAME: process.env.MODEL_NAME || "",
        JIRA_BOARD_ID: process.env.JIRA_BOARD_ID || "",
        JIRA_PROJECT_KEY: process.env.JIRA_PROJECT_KEY || "",
      },
      time: new Date().toISOString(),
    };
  }
}
