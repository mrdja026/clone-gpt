#!/usr/bin/env node
// Minimal MCP server exposing Jira tools/resources over stdio
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";
import { z } from "zod";

const server = new McpServer({
  name: "local-mcp-server",
  version: "1.0.0",
});

function getJiraConfig() {
  return {
    baseUrl: process.env.JIRA_BASE_URL || "",
    email: process.env.JIRA_EMAIL || "",
    apiToken: process.env.JIRA_API_TOKEN || "",
  };
}

async function fetchJiraIssue(ticketKey) {
  const { baseUrl, email, apiToken } = getJiraConfig();
  if (!baseUrl || !email || !apiToken) {
    throw new Error(
      "Missing Jira configuration. Set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN",
    );
  }

  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");
  const url = `${baseUrl.replace(/\/$/, "")}/rest/api/3/issue/${encodeURIComponent(
    ticketKey,
  )}`;

  const res = await axios.get(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  const issue = res.data;
  const fields = issue.fields || {};

  // Basic description extraction (ADF to plain text fallback)
  let description = "";
  try {
    if (fields.description && typeof fields.description === "object") {
      const walk = (node) => {
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
    blockers: [], // could extract from issue links if needed
  };
}

async function listJiraProjects() {
  const { baseUrl, email, apiToken } = getJiraConfig();
  if (!baseUrl || !email || !apiToken) {
    throw new Error(
      "Missing Jira configuration. Set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN",
    );
  }
  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");
  const url = `${baseUrl.replace(/\/$/, "")}/rest/api/3/project/search`;
  const res = await axios.get(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });
  const values = res.data?.values || [];
  return values.map((p) => ({
    id: p.id,
    key: p.key,
    name: p.name,
    projectTypeKey: p.projectTypeKey,
  }));
}

// Tools
server.registerTool(
  "process_text",
  {
    title: "Process Text",
    description: "Pass-through processor for formatted commands",
    inputSchema: { text: z.string() },
  },
  async ({ text }) => ({
    content: [{ type: "text", text }],
  }),
);

server.registerTool(
  "fetch_jira_ticket",
  {
    title: "Fetch Jira Ticket",
    description: "Fetch a Jira ticket by key (e.g., SCRUM-8)",
    inputSchema: { ticketKey: z.string() },
  },
  async ({ ticketKey }) => {
    try {
      const data = await fetchJiraIssue(ticketKey);
      return {
        content: [
          { type: "text", text: JSON.stringify(data) },
        ],
      };
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Failed to fetch Jira ticket",
              message: e.message,
            }),
          },
        ],
        isError: true,
      };
    }
  },
);

// Resources (static resource URI to match the client)
server.registerResource(
  "jira_projects_list",
  "mcp://local-mcp-server/jira/projects",
  {
    title: "Jira Projects",
    description: "List Jira projects",
  },
  async (uri) => {
    try {
      const projects = await listJiraProjects();
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(projects),
          },
        ],
      };
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify({ error: "Failed to list projects", message: e.message }),
          },
        ],
      };
    }
  },
);

// Start stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
