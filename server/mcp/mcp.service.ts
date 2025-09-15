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

  private isForwardOnlyMode() {
    const forwardOnly =
      this.configService.get<string>("MCP_FORWARD_ONLY") ||
      process.env.MCP_FORWARD_ONLY ||
      "1"; // Default to forward-only
    return forwardOnly !== "0" && forwardOnly !== "false";
  }

  private async callRpc<T = any>(
    method: string,
    params?: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    const base = this.getMcpBaseUrl();
    const forwardOnly = this.isForwardOnlyMode();

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

        const res = await axios.post(
          url,
          { jsonrpc: "2.0", id: Date.now(), method, params },
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

    // Legacy mode is disabled in forward-only architecture
    throw new Error(
      "MCP legacy mode is not supported in forward-only architecture. " +
        "Set MCP_BASE_URL to point to an external MCP server.",
    );
  }

  async listTools() {
    return this.callRpc("listTools");
  }

  async listResources() {
    return this.callRpc("listResources");
  }

  async callTool(
    name: string,
    args: Record<string, any>,
    perplexityKey?: string,
  ) {
    const headers: Record<string, string> = {};

    // Add Perplexity API key header if provided and tool is fetch_perplexity_data
    if (perplexityKey && name === "fetch_perplexity_data") {
      headers["X-Perplexity-Key"] = perplexityKey;
    }

    return this.callRpc(
      "callTool",
      { name, arguments: args },
      Object.keys(headers).length > 0 ? headers : undefined,
    );
  }

  async readResource(uri: string) {
    return this.callRpc("readResource", { uri });
  }
}
