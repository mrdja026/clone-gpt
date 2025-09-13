import { Injectable, Inject } from "@nestjs/common";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ConfigService } from "@nestjs/config";
import fs from "fs";

@Injectable()
export class McpService {
  private client: Client | null = null;
  private oauthToken: { accessToken: string; expiresAt: number } = {
    accessToken: "",
    expiresAt: 0,
  };

  constructor(@Inject(ConfigService) private configService: ConfigService) {}

  // ESM-compatible __dirname
  private getCurrentDirname() {
    const __filename = fileURLToPath(import.meta.url);
    return path.dirname(__filename);
  }

  private getMcpBaseUrl() {
    return (
      this.configService.get<string>("MCP_BASE_URL") || "http://localhost:3001"
    );
  }

  private async ensureStdIoClient(): Promise<Client> {
    if (this.client) return this.client;
    const nodeExecutable = process.platform === "win32" ? "node.exe" : "node";
    // Allow overriding MCP server path via env (e.g., external workspace)
    const envServerPath = process.env.MCP_SERVER_PATH;
    const mcpServerPath = envServerPath
      ? envServerPath
      : path.resolve(
          this.getCurrentDirname(),
          "../../../hello_world_mcp/src/server.js",
        );
    const resolvedCwd = path.dirname(mcpServerPath);
    const serverExists = fs.existsSync(mcpServerPath);
    const cwdExists = fs.existsSync(resolvedCwd);
    const stat = serverExists ? fs.statSync(mcpServerPath) : null;
    console.log("[MCP] ensureStdIoClient", {
      nodeExecutable,
      mcpServerPath,
      serverExists,
      serverSize: stat?.size ?? null,
      resolvedCwd,
      cwdExists,
      usingExternalPath: !!envServerPath,
    });
    const env = {
      ...process.env,
      // Basic auth credentials for Jira (preferred for free-tier)
      JIRA_BASE_URL: this.configService.get("JIRA_BASE_URL") || process.env.JIRA_BASE_URL,
      JIRA_EMAIL: this.configService.get("JIRA_EMAIL") || process.env.JIRA_EMAIL,
      JIRA_API_TOKEN: this.configService.get("JIRA_API_TOKEN") || process.env.JIRA_API_TOKEN,
      JIRA_OAUTH_CLIENT_ID: this.configService.get("JIRA_OAUTH_CLIENT_ID"),
      JIRA_OAUTH_CLIENT_SECRET: this.configService.get(
        "JIRA_OAUTH_CLIENT_SECRET",
      ),
      JIRA_OAUTH_AUDIENCE: this.configService.get(
        "JIRA_OAUTH_AUDIENCE",
        "api.atlassian.com",
      ),
      JIRA_CLOUD_ID: this.configService.get("JIRA_CLOUD_ID"),
    } as Record<string, string | undefined>;

    try {
      if (!serverExists) {
        console.error("[MCP] Server path does not exist", { mcpServerPath });
      }
      if (!cwdExists) {
        console.error("[MCP] Working directory does not exist", { resolvedCwd });
      }

      const transport = new StdioClientTransport({
        command: nodeExecutable,
        args: [mcpServerPath],
        env,
        cwd: resolvedCwd,
      });

      const client = new Client(
        { name: "clone-gpt-mcp-proxy", version: "1.0.0" },
        { capabilities: { tools: {}, resources: {} } },
      );
      await client.connect(transport);
      this.client = client;
      console.log("[MCP] Connected via stdio", { mcpServerPath });
      return client;
    } catch (e: any) {
      console.error("[MCP] Failed to connect via stdio", {
        mcpServerPath,
        resolvedCwd,
        serverExists,
        cwdExists,
        message: e?.message,
        stack: e?.stack?.split("\n").slice(0, 3).join(" ") ?? null,
      });
      throw e;
    }
  }

  private async callRpc<T = any>(method: string, params?: any): Promise<T> {
    // Try HTTP first
    try {
      const url = `${this.getMcpBaseUrl()}/mcp`;
      const res = await axios.post(
        url,
        { jsonrpc: "2.0", id: method, method, params },
        { timeout: 65000 },
      );
      return res.data as T;
    } catch (err: any) {
      // Fallback to STDIO (for dev, or when HTTP MCP is not running)
      console.warn("[MCP] HTTP call failed; falling back to stdio", {
        method,
        baseUrl: this.getMcpBaseUrl(),
        httpError: err?.message,
      });
      const client = await this.ensureStdIoClient();
      try {
        if (method === "listTools") return client.listTools() as unknown as T;
        if (method === "listResources")
          return client.listResources() as unknown as T;
        if (method === "callTool")
          return client.callTool(params) as unknown as T;
        if (method === "readResource")
          return client.readResource(params) as unknown as T;
      } catch (stdioErr: any) {
        console.error("[MCP] stdio call failed", {
          method,
          message: stdioErr?.message,
          stack: stdioErr?.stack?.split("\n").slice(0, 3).join(" ") ?? null,
        });
        throw stdioErr;
      }
      throw err;
    }
  }

  async getOAuthToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.oauthToken.accessToken && this.oauthToken.expiresAt > now + 60) {
      return this.oauthToken.accessToken;
    }

    const response = await axios.post(
      "https://auth.atlassian.com/oauth/token",
      {
        grant_type: "client_credentials",
        client_id: this.configService.get("JIRA_OAUTH_CLIENT_ID"),
        client_secret: this.configService.get("JIRA_OAUTH_CLIENT_SECRET"),
        audience: this.configService.get("JIRA_OAUTH_AUDIENCE"),
      },
    );

    this.oauthToken = {
      accessToken: response.data.access_token,
      expiresAt: now + response.data.expires_in,
    };
    return this.oauthToken.accessToken;
  }

  async listTools() {
    return this.callRpc("listTools");
  }

  async listResources() {
    return this.callRpc("listResources");
  }

  async callTool(name: string, args: Record<string, any>) {
    return this.callRpc("callTool", { name, arguments: args });
  }

  async readResource(uri: string) {
    return this.callRpc("readResource", { uri });
  }
}
