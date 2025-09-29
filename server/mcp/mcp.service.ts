import { Injectable, Inject } from "@nestjs/common";
import axios from "axios";
import { ConfigService } from "@nestjs/config";

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

    if (!base) {
      throw new Error(
        "MCP external mode is required, but MCP_BASE_URL is not configured. Set MCP_BASE_URL to your external MCP server (e.g., http://127.0.0.1:4000).",
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
      if (res.data?.error) {
        throw new Error(
          `MCP Error: ${res.data.error.message || res.data.error}`,
        );
      }

      return res.data?.result ?? (res.data as T);
    } catch (error: any) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        throw new Error(
          `Cannot connect to MCP server at ${url}. Ensure the MCP server is running and accessible.`,
        );
      }
      throw error;
    }
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
