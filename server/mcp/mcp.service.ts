import { Injectable, Inject } from "@nestjs/common";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ConfigService } from "@nestjs/config";
import fs from "fs";
import type { AxiosRequestConfig } from "axios";

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

  // --- Internal HTTP-only adapter (no spawn) helpers ---
  private getJiraConfig() {
    const baseUrl =
      this.configService.get<string>("JIRA_BASE_URL") ||
      process.env.JIRA_BASE_URL ||
      "";
    const email =
      this.configService.get<string>("JIRA_EMAIL") ||
      process.env.JIRA_EMAIL ||
      "";
    const apiToken =
      this.configService.get<string>("JIRA_API_TOKEN") ||
      process.env.JIRA_API_TOKEN ||
      "";
    return { baseUrl, email, apiToken };
  }

  private getJiraAuthHeaders() {
    const { email, apiToken } = this.getJiraConfig();
    if (!email || !apiToken) return null;
    const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");
    return {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    } as Record<string, string>;
  }

  private normalizeBaseUrl(url: string) {
    return url.replace(/\/$/, "");
  }

  private async jiraGet<T = any>(pathname: string, config?: AxiosRequestConfig) {
    const { baseUrl } = this.getJiraConfig();
    const headers = this.getJiraAuthHeaders();
    if (!baseUrl || !headers) {
      throw new Error(
        "Missing Jira configuration. Set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN",
      );
    }
    const url = `${this.normalizeBaseUrl(baseUrl)}${pathname}`;
    const res = await axios.get<T>(url, { headers, ...(config || {}) });
    return res.data as T;
  }

  private async fetchJiraIssue(ticketKey: string) {
    // Dev/test fixtures: if enabled, try to load a local JSON fixture first
    try {
      const useFixtures =
        process.env.MCP_USE_FIXTURES === "1" ||
        process.env.MCP_USE_FIXTURES === "true";
      if (useFixtures) {
        const fixturesDir = path.resolve(
          this.getCurrentDirname(),
          "../../fixtures/jira",
        );
        const fixturePath = path.join(fixturesDir, `${ticketKey}.json`);
        if (fs.existsSync(fixturePath)) {
          const raw = fs.readFileSync(fixturePath, "utf-8");
          const data = JSON.parse(raw);
          return {
            key: String(data.key || ticketKey),
            summary: String(data.summary || ""),
            status: String(data.status || ""),
            assignee: data.assignee ? String(data.assignee) : "",
            priority: data.priority ? String(data.priority) : "",
            description: String(data.description || ""),
            blockers: Array.isArray(data.blockers) ? data.blockers : [],
          };
        }
      }
    } catch (e) {
      // Fall through to real API
      console.warn("[MCP] Fixture load failed; falling back to Jira API", {
        message: (e as any)?.message,
      });
    }
    const issue = await this.jiraGet<any>(
      `/rest/api/3/issue/${encodeURIComponent(ticketKey)}`,
    );
    const fields = issue?.fields || {};
    let description = "";
    try {
      if (fields.description && typeof fields.description === "object") {
        const walk = (node: any): string => {
          if (!node) return "";
          if (typeof node === "string") return node;
          const t = node.type || "";
          if (t === "text" && node.text) return node.text;
          if (Array.isArray(node.content)) return node.content.map(walk).join("");
          return "";
        };
        description = walk(fields.description);
      } else if (typeof fields.description === "string") {
        description = fields.description;
      }
    } catch {
      description = "";
    }
    return {
      key: issue.key,
      summary: fields.summary || "",
      status: fields.status?.name || "",
      assignee: fields.assignee?.displayName || "",
      priority: fields.priority?.name || "",
      description,
      blockers: [],
    };
  }

  private async listJiraProjects() {
    const data = await this.jiraGet<any>("/rest/api/3/project/search");
    const values = data?.values || [];
    return values.map((p: any) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      projectTypeKey: p.projectTypeKey,
    }));
  }

  private async ensureStdIoClient(): Promise<Client> {
    if (this.client) return this.client;
    const nodeExecutable = process.platform === "win32" ? "node.exe" : "node";
    // Allow overriding MCP server path via env (e.g., external workspace)
    const envServerPath = process.env.MCP_SERVER_PATH;
    // Compute robust defaults: relative to this file AND to project cwd
    const candidateFromHere = path.resolve(
      this.getCurrentDirname(),
      "../../../hello_world_mcp/src/server.js",
    );
    const candidateFromCwd = path.resolve(
      process.cwd(),
      "hello_world_mcp/src/server.js",
    );
    const defaultServerPath = fs.existsSync(candidateFromHere)
      ? candidateFromHere
      : candidateFromCwd;
    const mcpServerPath = envServerPath || defaultServerPath;
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
      candidateFromHere,
      candidateFromCwd,
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
      // If spawn is disabled, attempt internal adapter for known tools/resources
      console.warn("[MCP] HTTP call failed; falling back to stdio", {
        method,
        baseUrl: this.getMcpBaseUrl(),
        httpError: err?.message,
      });
      const noSpawn =
        process.env.MCP_NO_SPAWN === "true" || process.env.MCP_NO_SPAWN === "1";
      if (noSpawn) {
        try {
          // Internal adapter only supports minimal surface we need
          if (method === "listTools") {
            return {
              tools: [
                {
                  name: "process_text",
                  title: "Process Text",
                  description: "Pass-through processor for formatted commands",
                  inputSchema: {
                    type: "object",
                    properties: { text: { type: "string" } },
                    required: ["text"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                  },
                },
                {
                  name: "fetch_jira_ticket",
                  title: "Fetch Jira Ticket",
                  description: "Fetch a Jira ticket by key (e.g., SCRUM-8)",
                  inputSchema: {
                    type: "object",
                    properties: { ticketKey: { type: "string" } },
                    required: ["ticketKey"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                  },
                },
              ],
            } as unknown as T;
          }
          if (method === "listResources") {
            return {
              resources: [
                {
                  uri: "mcp://local-mcp-server/jira/projects",
                  name: "Jira Projects",
                  description: "List Jira projects",
                },
              ],
            } as unknown as T;
          }
          if (method === "callTool") {
            const name = params?.name as string;
            const args = (params?.arguments || {}) as Record<string, any>;
            if (name === "process_text") {
              return {
                content: [{ type: "text", text: String(args.text ?? "") }],
              } as unknown as T;
            }
            if (name === "fetch_jira_ticket") {
              const ticketKey = String(args.ticketKey || "");
              try {
                const data = await this.fetchJiraIssue(ticketKey);
                return {
                  content: [{ type: "text", text: JSON.stringify(data) }],
                } as unknown as T;
              } catch (e: any) {
                return {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify({
                        error: "Failed to fetch Jira ticket",
                        message: e?.message || "Unknown error",
                      }),
                    },
                  ],
                  isError: true,
                } as unknown as T;
              }
            }
            throw new Error(`Unknown tool: ${name}`);
          }
          if (method === "readResource") {
            const uri = params?.uri as string;
            if (uri === "mcp://local-mcp-server/jira/projects") {
              try {
                const projects = await this.listJiraProjects();
                return {
                  contents: [
                    { uri, text: JSON.stringify(projects) },
                  ],
                } as unknown as T;
              } catch (e: any) {
                return {
                  contents: [
                    {
                      uri,
                      text: JSON.stringify({
                        error: "Failed to list projects",
                        message: e?.message || "Unknown error",
                      }),
                    },
                  ],
                } as unknown as T;
              }
            }
            throw new Error(`Unknown resource: ${uri}`);
          }
        } catch (localErr) {
          // Fall through to throw meaningful message
          throw localErr;
        }
      }
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
