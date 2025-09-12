import { Injectable, Inject } from "@nestjs/common";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ConfigService } from "@nestjs/config";

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
    const mcpServerPath = path.resolve(
      this.getCurrentDirname(),
      "../../../hello_world_mpc/src/server.js",
    );
    const env = {
      ...process.env,
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

    const transport = new StdioClientTransport({
      command: nodeExecutable,
      args: [mcpServerPath],
      env,
      cwd: path.dirname(mcpServerPath),
    });

    const client = new Client(
      { name: "clone-gpt-mcp-proxy", version: "1.0.0" },
      { capabilities: { tools: {}, resources: {} } },
    );
    await client.connect(transport);
    this.client = client;
    return client;
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
      const client = await this.ensureStdIoClient();
      if (method === "listTools") return client.listTools() as unknown as T;
      if (method === "listResources")
        return client.listResources() as unknown as T;
      if (method === "callTool") return client.callTool(params) as unknown as T;
      if (method === "readResource")
        return client.readResource(params) as unknown as T;
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
