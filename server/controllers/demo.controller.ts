import { Controller, Get } from "@nestjs/common";
import fs from "fs";
import path from "path";
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
    const mcpServerPath = process.env.MCP_SERVER_PATH || "";
    const exists = mcpServerPath ? fs.existsSync(mcpServerPath) : false;
    const port = process.env.PORT || "3001";
    const host = process.env.BIND_HOST || "0.0.0.0";
    return {
      status: "ok",
      port,
      host,
      mcp: {
        serverPath: mcpServerPath,
        exists,
        dirname: mcpServerPath ? path.dirname(mcpServerPath) : null,
      },
      env: {
        MCP_USE_FIXTURES: process.env.MCP_USE_FIXTURES || "",
        JIRA_BASE_URL: process.env.JIRA_BASE_URL ? "set" : "",
      },
      time: new Date().toISOString(),
    };
  }
}
