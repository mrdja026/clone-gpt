import { Injectable, Inject } from "@nestjs/common";
import axios from "axios";
import { ConfigService } from "@nestjs/config";
import {
  fixturesListTools,
  fixturesListResources,
  fixturesCallTool,
  fixturesReadResource,
  fixturesEnabledByDefault,
} from "../fixtures/mcp/fixtures";

@Injectable()
export class McpService {
  constructor(@Inject(ConfigService) private configService: ConfigService) {}

  private getMcpBaseUrl() {
    const explicit =
      this.configService.get<string>("MCP_BASE_URL") ||
      process.env.MCP_BASE_URL ||
      "";
    return explicit.trim();
  }

  private isForwardOnlyMode() {
    const forwardOnly =
      this.configService.get<string>("MCP_FORWARD_ONLY") ||
      process.env.MCP_FORWARD_ONLY ||
      "0"; // Default to fixtures/adapter mode
    return !(forwardOnly === "0" || forwardOnly.toLowerCase?.() === "false");
  }

  private isFixturesMode() {
    const fixtures =
      this.configService.get<string>("MCP_USE_FIXTURES") ||
      process.env.MCP_USE_FIXTURES ||
      (fixturesEnabledByDefault ? "1" : "0");
    return !(fixtures === "0" || fixtures.toLowerCase?.() === "false");
  }

  private normalizeMethod(method: string) {
    switch (method) {
      case "listTools":
      case "tools/list":
        return "tools/list";
      case "callTool":
      case "tools/call":
        return "tools/call";
      case "listResources":
      case "resources/list":
        return "resources/list";
      case "readResource":
      case "resources/read":
        return "resources/read";
      default:
        return method;
    }
  }

  private async callRpc<T = any>(
    method: string,
    params?: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    const normalizedMethod = this.normalizeMethod(method);
    const base = this.getMcpBaseUrl();
    const forwardOnly = this.isForwardOnlyMode();
    const fixtures = this.isFixturesMode();

    // Forward-only mode: require external MCP
    if (forwardOnly) {
      if (!base) {
        throw new Error(
          "MCP is in forward-only mode but MCP_BASE_URL is not configured. " +
            "Set MCP_BASE_URL to point to an external MCP server, or set MCP_FORWARD_ONLY=0 for development.",
        );
      }

      const url = `${base.replace(/\/$/, "")}/mcp`;
      try {
        const requestHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...headers,
        };

        // Drop hop-by-hop headers that break JSON-RPC proxying
        delete requestHeaders["content-length"];
        delete requestHeaders["Content-Length"];
        delete requestHeaders["host"];
        delete requestHeaders["Host"];

        const res = await axios.post(
          url,
          { jsonrpc: "2.0", id: Date.now(), method: normalizedMethod, params },
          {
            timeout: 65000,
            headers: requestHeaders,
          },
        );

        // Handle JSON-RPC response format
        if (res.data.error) {
          throw new Error(
            `MCP Error: ${res.data.error.message || res.data.error}`,
          );
        }

        return res.data.result || (res.data as T);
      } catch (error: any) {
        if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
          throw new Error(
            `Cannot connect to MCP server at ${url}. ` +
              `Ensure the MCP server is running and accessible.`,
          );
        }
        throw error;
      }
    }

    // Fixtures/Adapter mode (default): dispatch locally
    if (fixtures) {
      // Emulate JSON-RPC dispatch using fixtures adapter
      switch (normalizedMethod) {
        case "tools/list":
        case "listTools":
          return fixturesListTools() as any;
        case "resources/list":
        case "listResources":
          return fixturesListResources() as any;
        case "tools/call":
        case "callTool":
          return fixturesCallTool(
            params?.name,
            params?.arguments,
            headers,
          ) as any;
        case "resources/read":
        case "readResource":
          return fixturesReadResource(params?.uri) as any;
        default:
          throw new Error(
            `Unknown MCP method in fixtures mode: ${normalizedMethod}`,
          );
      }
    }

    // Fallback
    throw new Error(
      "No MCP mode available. Enable fixtures with MCP_USE_FIXTURES=1 (default) or configure forward-only with MCP_FORWARD_ONLY=1 and MCP_BASE_URL.",
    );
  }

  async listTools() {
    return this.callRpc("tools/list");
  }

  async listResources() {
    return this.callRpc("resources/list");
  }

  async callTool(
    name: string,
    args: Record<string, any>,
    extraHeaders?: Record<string, string>,
  ) {
    const headers: Record<string, string> = { ...(extraHeaders || {}) };
    return this.callRpc("tools/call", { name, arguments: args }, headers);
  }

  async readResource(uri: string) {
    return this.callRpc("resources/read", { uri });
  }
}
