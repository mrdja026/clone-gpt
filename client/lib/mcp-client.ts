/**
 * MCP Client - Communicates with the app's MCP HTTP endpoints
 */

export interface MCPToolRequest {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResponse {
  content: Array<{ type: string; text: string }>;
}

export interface MCPResourceResponse {
  contents: Array<{ type: string; text: string }>;
}

export class MCPClient {
  private serverProcess: any = null;
  private isInitialized = false;

  private getAuthHeaders(): Record<string, string> {
    try {
      // Prefer runtime-provided JWT first (e.g. from a login flow)
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem("mcp_jwt")
          : null;
      // Allow static token via Vite env for local dev
      const envToken = (import.meta as any)?.env?.VITE_MCP_JWT as
        | string
        | undefined;
      const token = stored || envToken;
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  }

  /**
   * Initialize connection to the MCP server
   */
  async initialize(): Promise<boolean> {
    try {
      // For now, we'll communicate with the MCP server via HTTP proxy
      // In a full implementation, this would use stdio transport
      console.log("MCP Client initialized");
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize MCP client:", error);
      return false;
    }
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(
    toolName: string,
    args: Record<string, any>,
  ): Promise<MCPToolResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Send tool call request to our server endpoint that proxies to MCP
      const response = await fetch("/api/mcp/tool", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({
          name: toolName,
          arguments: args,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `MCP tool call failed: ${response.status} ${response.statusText}${
            text ? ` - ${text}` : ""
          }`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error("MCP tool call error:", error);
      throw error;
    }
  }

  /**
   * Read a resource from the MCP server
   */
  async readResource(uri: string): Promise<MCPResourceResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await fetch("/api/mcp/resource", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({ uri }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `MCP resource read failed: ${response.status} ${response.statusText}${
            text ? ` - ${text}` : ""
          }`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error("MCP resource read error:", error);
      throw error;
    }
  }

  /**
   * Execute MCP action (either tool call or resource read)
   */
  async executeAction(action: {
    toolName?: string;
    resourceUri?: string;
    args: Record<string, any>;
    type: "tool" | "resource";
  }): Promise<MCPToolResponse | MCPResourceResponse> {
    if (action.type === "tool" && action.toolName) {
      return await this.callTool(action.toolName, action.args);
    } else if (action.type === "resource" && action.resourceUri) {
      return await this.readResource(action.resourceUri);
    } else {
      throw new Error(`Invalid MCP action: ${JSON.stringify(action)}`);
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<any[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await fetch("/api/mcp/tools", {
        headers: {
          ...this.getAuthHeaders(),
        },
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `MCP list tools failed: ${response.status} ${response.statusText}${
            text ? ` - ${text}` : ""
          }`,
        );
      }

      const data = await response.json();
      return data.tools || [];
    } catch (error) {
      console.error("MCP list tools error:", error);
      return [];
    }
  }
}

// Singleton instance
export const mcpClient = new MCPClient();
