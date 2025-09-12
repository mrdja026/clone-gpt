import { Injectable } from "@nestjs/common";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import axios from "axios";
import path from "path";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class McpService {
  private client: Client | null = null;
  private oauthToken: { accessToken: string; expiresAt: number } = {
    accessToken: "",
    expiresAt: 0,
  };

  constructor(private configService: ConfigService) {}

  private async getClient(): Promise<Client> {
    if (this.client) return this.client;

    const nodeExecutable = process.platform === "win32" ? "node.exe" : "node";
    const mcpServerPath = path.resolve(
      __dirname,
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
    };

    const transport = new StdioClientTransport({
      command: nodeExecutable,
      args: [mcpServerPath],
      env,
      cwd: path.dirname(mcpServerPath),
    });

    this.client = new Client(
      { name: "clone-gpt-mcp-proxy", version: "1.0.0" },
      { capabilities: { tools: {}, resources: {} } },
    );
    await this.client.connect(transport);
    return this.client;
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
    const client = await this.getClient();
    return client.listTools();
  }

  async listResources() {
    const client = await this.getClient();
    return client.listResources();
  }

  async callTool(name: string, args: Record<string, any>) {
    const client = await this.getClient();
    return client.callTool({ name, arguments: args });
  }

  async readResource(uri: string) {
    const client = await this.getClient();
    return client.readResource({ uri });
  }
}
