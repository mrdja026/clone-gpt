import { Injectable, Inject } from "@nestjs/common";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { ConfigService } from "@nestjs/config";
import fs from "fs";
import type { AxiosRequestConfig } from "axios";
import {
  executePerplexitySearch,
  getPerplexityHistoryFiltered,
} from "./tools/perplexity.js";

@Injectable()
export class McpService {
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
    // Only use HTTP JSON-RPC when explicitly configured.
    // Otherwise, prefer built-in adapters or stdio without a spurious 404.
    const explicit =
      this.configService.get<string>("MCP_BASE_URL") ||
      process.env.MCP_BASE_URL ||
      "";
    return explicit.trim();
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

  private async jiraAgileGet<T = any>(
    pathname: string,
    config?: AxiosRequestConfig,
  ) {
    const { baseUrl } = this.getJiraConfig();
    const headers = this.getJiraAuthHeaders();
    if (!baseUrl || !headers) {
      throw new Error(
        "Missing Jira configuration. Set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN",
      );
    }
    const url = `${this.normalizeBaseUrl(baseUrl)}/rest/agile/1.0${pathname}`;
    const res = await axios.get<T>(url, { headers, ...(config || {}) });
    return res.data as T;
  }

  private normalizeBaseUrl(url: string) {
    return url.replace(/\/$/, "");
  }

  private async jiraGet<T = any>(
    pathname: string,
    config?: AxiosRequestConfig,
  ) {
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
        const fromHere = path.resolve(
          this.getCurrentDirname(),
          "../../fixtures/jira",
        );
        const fromCwd = path.resolve(process.cwd(), "server/fixtures/jira");
        const candidateDirs = [fromHere, fromCwd];
        for (const dir of candidateDirs) {
          const fixturePath = path.join(dir, `${ticketKey}.json`);
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
          if (Array.isArray(node.content))
            return node.content.map(walk).join("");
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

  private async fetchJiraMyself() {
    // Dev/test fixtures: if enabled, try to load a local JSON fixture first
    try {
      const useFixtures =
        process.env.MCP_USE_FIXTURES === "1" ||
        process.env.MCP_USE_FIXTURES === "true";
      if (useFixtures) {
        const fromHere = path.resolve(
          this.getCurrentDirname(),
          "../../fixtures/jira",
        );
        const fromCwd = path.resolve(process.cwd(), "server/fixtures/jira");
        const candidateDirs = [fromHere, fromCwd];
        for (const dir of candidateDirs) {
          const fixturePath = path.join(dir, `myself.json`);
          if (fs.existsSync(fixturePath)) {
            const raw = fs.readFileSync(fixturePath, "utf-8");
            const data = JSON.parse(raw);
            return data;
          }
        }
      }
    } catch (e) {
      // Fall through to real API
      console.warn(
        "[MCP] Fixture load failed; falling back to Jira API (myself)",
        {
          message: (e as any)?.message,
        },
      );
    }
    return this.jiraGet<any>("/rest/api/3/myself");
  }

  private async fetchCurrentSprintSummary() {
    // Dev/test fixtures first
    try {
      const useFixtures =
        process.env.MCP_USE_FIXTURES === "1" ||
        process.env.MCP_USE_FIXTURES === "true";
      if (useFixtures) {
        const fromHere = path.resolve(
          this.getCurrentDirname(),
          "../../fixtures/jira",
        );
        const fromCwd = path.resolve(process.cwd(), "server/fixtures/jira");
        const candidateDirs = [fromHere, fromCwd];
        for (const dir of candidateDirs) {
          const fixturePath = path.join(dir, `current-sprint.json`);
          if (fs.existsSync(fixturePath)) {
            const raw = fs.readFileSync(fixturePath, "utf-8");
            return JSON.parse(raw);
          }
        }
      }
    } catch (e) {
      console.warn("[MCP] Fixture load failed; falling back (current sprint)", {
        message: (e as any)?.message,
      });
    }
    // Live Jira via Agile API
    // Strategy: use JIRA_BOARD_ID if set; otherwise try project key discovery.
    const boardId = process.env.JIRA_BOARD_ID;
    const projectKey = process.env.JIRA_PROJECT_KEY;
    try {
      let useBoardId: number | null = null;
      if (boardId && /^\d+$/.test(boardId)) {
        useBoardId = Number(boardId);
      } else if (projectKey) {
        const boards = await this.jiraAgileGet<any>(
          `/board?projectKeyOrId=${encodeURIComponent(projectKey)}`,
        );
        useBoardId = boards?.values?.[0]?.id ?? null;
      } else {
        const boards = await this.jiraAgileGet<any>(`/board`);
        useBoardId = boards?.values?.[0]?.id ?? null;
      }

      if (!useBoardId) {
        throw new Error(
          "Could not determine Jira board id. Set JIRA_BOARD_ID or JIRA_PROJECT_KEY.",
        );
      }

      const sprints = await this.jiraAgileGet<any>(
        `/board/${useBoardId}/sprint?state=active`,
      );
      const active = sprints?.values?.[0];
      if (!active) {
        return { summary: "No active sprints found" };
      }
      // Sprint details
      const sprint = await this.jiraAgileGet<any>(`/sprint/${active.id}`);
      return {
        name: sprint?.name || active.name,
        state: sprint?.state || active.state,
        startDate: sprint?.startDate || active.startDate || null,
        endDate: sprint?.endDate || active.endDate || null,
        goal: sprint?.goal || "",
        summary: sprint?.name || active.name,
      };
    } catch (e: any) {
      throw new Error(
        `Failed to retrieve current sprint: ${e?.response?.status || ""} ${
          e?.response?.data?.message || e?.message || "Unknown error"
        }`,
      );
    }
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

  private async callRpc<T = any>(method: string, params?: any): Promise<T> {
    const base = this.getMcpBaseUrl();
    const useFixtures =
      process.env.MCP_USE_FIXTURES === "true" ||
      process.env.MCP_USE_FIXTURES === "1";

    // 1) If an HTTP MCP is configured, use it exclusively
    if (base) {
      const url = `${base.replace(/\/$/, "")}/mcp`;
      const res = await axios.post(
        url,
        { jsonrpc: "2.0", id: method, method, params },
        { timeout: 65000 },
      );
      return res.data as T;
    }

    // 2) If fixtures are enabled, serve via internal fixtures
    if (useFixtures) {
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
            {
              name: "fetch_jira_myself",
              title: "Fetch Jira Myself",
              description:
                "Fetch current Jira user profile to validate credentials",
              inputSchema: {
                type: "object",
                properties: {},
                additionalProperties: false,
                $schema: "http://json-schema.org/draft-07/schema#",
              },
            },
            {
              name: "get_current_sprint_summary",
              title: "Get Current Sprint Summary",
              description:
                "Return the current sprint summary (fixtures-only by default)",
              inputSchema: {
                type: "object",
                properties: {},
                additionalProperties: false,
                $schema: "http://json-schema.org/draft-07/schema#",
              },
            },
            {
              name: "perplexity_search",
              title: "Perplexity Search",
              description:
                "Search the web using Perplexity AI with real-time information",
              inputSchema: {
                type: "object",
                properties: {
                  query: { type: "string", description: "The search query" },
                  system: {
                    type: "string",
                    description: "System prompt (optional)",
                  },
                  recency: {
                    type: "string",
                    enum: ["day", "week", "month", "year"],
                    description: "Filter results by recency (optional)",
                  },
                  max_tokens: {
                    type: "number",
                    description: "Maximum tokens in response (optional)",
                  },
                  temperature: {
                    type: "number",
                    description: "Response temperature 0-1 (optional)",
                  },
                  stream: {
                    type: "boolean",
                    description: "Stream response (optional)",
                  },
                  domain: {
                    type: "string",
                    description: "Prioritize specific domain (optional)",
                  },
                },
                required: ["query"],
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
            {
              uri: "mcp://local-mcp-server/jira/current-sprint",
              name: "Current Sprint",
              description: "Summary of the current active sprint",
            },
            {
              uri: "perplexity://history/",
              name: "Perplexity Search History",
              description: "All Perplexity search history",
            },
            {
              uri: "perplexity://history/last/10",
              name: "Recent Perplexity Searches",
              description: "Last 10 Perplexity searches",
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
          const data = await this.fetchJiraIssue(ticketKey);
          return {
            content: [{ type: "text", text: JSON.stringify(data) }],
          } as unknown as T;
        }
        if (name === "get_current_sprint_summary") {
          const data = await this.fetchCurrentSprintSummary();
          return {
            content: [{ type: "text", text: JSON.stringify(data) }],
          } as unknown as T;
        }
        if (name === "fetch_jira_myself") {
          const data = await this.fetchJiraMyself();
          return {
            content: [{ type: "text", text: JSON.stringify(data) }],
          } as unknown as T;
        }
        if (name === "perplexity_search") {
          try {
            const result = await executePerplexitySearch(args);
            return result as unknown as T;
          } catch (e: any) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: "Failed to execute Perplexity search",
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
          const projects = await this.listJiraProjects();
          return {
            contents: [{ uri, text: JSON.stringify(projects) }],
          } as unknown as T;
        }
        if (uri === "mcp://local-mcp-server/jira/current-sprint") {
          const summary = await this.fetchCurrentSprintSummary();
          return {
            contents: [{ uri, text: JSON.stringify(summary) }],
          } as unknown as T;
        }
        if (uri.startsWith("perplexity://history/")) {
          const items = getPerplexityHistoryFiltered(uri);
          return {
            contents: [{ type: "text", text: JSON.stringify(items, null, 2) }],
          } as unknown as T;
        }
        throw new Error(`Unknown resource: ${uri}`);
      }
    }

    // 3) Default: built-in direct Jira adapter (no Repo B needed)
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
            description: "Fetch a Jira ticket by key",
            inputSchema: {
              type: "object",
              properties: { ticketKey: { type: "string" } },
              required: ["ticketKey"],
              additionalProperties: false,
              $schema: "http://json-schema.org/draft-07/schema#",
            },
          },
          {
            name: "get_current_sprint_summary",
            title: "Get Current Sprint Summary",
            description:
              "Return the current sprint summary (requires fixtures or additional Jira config)",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
              $schema: "http://json-schema.org/draft-07/schema#",
            },
          },
          {
            name: "fetch_jira_myself",
            title: "Fetch Jira Myself",
            description: "Fetch current Jira user profile",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
              $schema: "http://json-schema.org/draft-07/schema#",
            },
          },
          {
            name: "perplexity_search",
            title: "Perplexity Search",
            description:
              "Search the web using Perplexity AI with real-time information",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "The search query" },
                system: {
                  type: "string",
                  description: "System prompt (optional)",
                },
                recency: {
                  type: "string",
                  enum: ["day", "week", "month", "year"],
                  description: "Filter results by recency (optional)",
                },
                max_tokens: {
                  type: "number",
                  description: "Maximum tokens in response (optional)",
                },
                temperature: {
                  type: "number",
                  description: "Response temperature 0-1 (optional)",
                },
                stream: {
                  type: "boolean",
                  description: "Stream response (optional)",
                },
                domain: {
                  type: "string",
                  description: "Prioritize specific domain (optional)",
                },
              },
              required: ["query"],
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
          {
            uri: "perplexity://history/",
            name: "Perplexity Search History",
            description: "All Perplexity search history",
          },
          {
            uri: "perplexity://history/last/10",
            name: "Recent Perplexity Searches",
            description: "Last 10 Perplexity searches",
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
        try {
          const ticketKey = String(args.ticketKey || "");
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
                  message:
                    e?.response?.data?.errorMessages?.[0] ||
                    e?.message ||
                    "Unknown error",
                  status: e?.response?.status || 500,
                }),
              },
            ],
            isError: true,
          } as unknown as T;
        }
      }
      if (name === "get_current_sprint_summary") {
        try {
          const data = await this.fetchCurrentSprintSummary();
          return {
            content: [{ type: "text", text: JSON.stringify(data) }],
          } as unknown as T;
        } catch (e: any) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "Failed to fetch current sprint summary",
                  message:
                    e?.response?.data?.errorMessages?.[0] ||
                    e?.message ||
                    "Unknown error",
                  status: e?.response?.status || 500,
                }),
              },
            ],
            isError: true,
          } as unknown as T;
        }
      }
      if (name === "fetch_jira_myself") {
        try {
          const data = await this.fetchJiraMyself();
          return {
            content: [{ type: "text", text: JSON.stringify(data) }],
          } as unknown as T;
        } catch (e: any) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "Failed to fetch Jira myself",
                  message:
                    e?.response?.data?.errorMessages?.[0] ||
                    e?.message ||
                    "Unknown error",
                  status: e?.response?.status || 500,
                }),
              },
            ],
            isError: true,
          } as unknown as T;
        }
      }
      if (name === "perplexity_search") {
        try {
          const result = await executePerplexitySearch(args);
          return result as unknown as T;
        } catch (e: any) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "Failed to execute Perplexity search",
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
            contents: [{ uri, text: JSON.stringify(projects) }],
          } as unknown as T;
        } catch (e: any) {
          return {
            contents: [
              {
                uri,
                text: JSON.stringify({
                  error: "Failed to list projects",
                  message:
                    e?.response?.data?.errorMessages?.[0] ||
                    e?.message ||
                    "Unknown error",
                  status: e?.response?.status || 500,
                }),
              },
            ],
          } as unknown as T;
        }
      }
      if (uri === "mcp://local-mcp-server/jira/current-sprint") {
        try {
          const summary = await this.fetchCurrentSprintSummary();
          return {
            contents: [{ uri, text: JSON.stringify(summary) }],
          } as unknown as T;
        } catch (e: any) {
          return {
            contents: [
              {
                uri,
                text: JSON.stringify({
                  error: "Failed to get current sprint summary",
                  message:
                    e?.response?.data?.errorMessages?.[0] ||
                    e?.message ||
                    "Unknown error",
                  status: e?.response?.status || 500,
                }),
              },
            ],
          } as unknown as T;
        }
      }
      if (uri.startsWith("perplexity://history/")) {
        try {
          const items = getPerplexityHistoryFiltered(uri);
          return {
            contents: [{ type: "text", text: JSON.stringify(items, null, 2) }],
          } as unknown as T;
        } catch (e: any) {
          return {
            contents: [
              {
                uri,
                text: JSON.stringify({
                  error: "Failed to get Perplexity history",
                  message: e?.message || "Unknown error",
                }),
              },
            ],
          } as unknown as T;
        }
      }
      throw new Error(`Unknown resource: ${uri}`);
    }

    // If we reach here, method unsupported
    throw new Error(`Unsupported method: ${method}`);
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
