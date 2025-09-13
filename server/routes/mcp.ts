import { RequestHandler } from "express";
import path from "path";
import fs from "fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import dotenv from "dotenv";

/**
 * MCP Proxy Routes - Communicates with the hello_world_mpc server over stdio
 */

// Path to the MCP server
const MCP_SERVER_PATH = path.resolve(
  __dirname,
  "../../../hello_world_mpc/src/server.js",
);

// Path to MCP server's .env file
const MCP_ENV_PATH = path.resolve(__dirname, "../../../hello_world_mpc/.env");

// Load MCP environment variables directly
let mcpEnvVars: Record<string, string> = {};
try {
  if (fs.existsSync(MCP_ENV_PATH)) {
    const result = dotenv.config({ path: MCP_ENV_PATH });
    if (result.parsed) {
      mcpEnvVars = result.parsed;
      console.log(
        `Loaded MCP env variables from ${MCP_ENV_PATH}: ${Object.keys(mcpEnvVars).join(", ")}`,
      );
    }
  }
} catch (error) {
  console.error(`Failed to load MCP env file: ${(error as Error).message}`);
}

let mcpClient: Client | null = null;
let connectPromise: Promise<void> | null = null;
let connectionError: Error | null = null;

async function getMcpClient(): Promise<Client> {
  // Return existing client if available
  if (mcpClient) return mcpClient;

  // If there was a previous connection error, throw it
  if (connectionError) {
    throw connectionError;
  }

  // Create a connection if one isn't already in progress
  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        const client = new Client(
          { name: "clone-gpt-mcp-proxy", version: "1.0.0" },
          { capabilities: { tools: {}, resources: {} } },
        );

        const nodeExecutable =
          process.platform === "win32" ? "node.exe" : "node";

        // Combine environment variables - priority to MCP .env file, then process.env
        const env = {
          ...process.env,
          ...mcpEnvVars,
          // Ensure critical variables are set with highest priority from MCP .env
          JIRA_BASE_URL:
            mcpEnvVars.JIRA_BASE_URL ||
            process.env.JIRA_BASE_URL ||
            "https://mrdjanstajic.atlassian.net",
          JIRA_EMAIL:
            mcpEnvVars.JIRA_EMAIL ||
            process.env.JIRA_EMAIL ||
            "mrdjanstajic@gmail.com",
          JIRA_API_TOKEN:
            mcpEnvVars.JIRA_API_TOKEN || process.env.JIRA_API_TOKEN || "",
          // OAuth (optional)
          JIRA_OAUTH_CLIENT_ID:
            mcpEnvVars.JIRA_OAUTH_CLIENT_ID ||
            process.env.JIRA_OAUTH_CLIENT_ID ||
            "",
          JIRA_OAUTH_CLIENT_SECRET:
            mcpEnvVars.JIRA_OAUTH_CLIENT_SECRET ||
            process.env.JIRA_OAUTH_CLIENT_SECRET ||
            "",
          JIRA_OAUTH_AUDIENCE:
            mcpEnvVars.JIRA_OAUTH_AUDIENCE ||
            process.env.JIRA_OAUTH_AUDIENCE ||
            "api.atlassian.com",
          JIRA_CLOUD_ID:
            mcpEnvVars.JIRA_CLOUD_ID || process.env.JIRA_CLOUD_ID || "",
        };

        // Log configuration without exposing sensitive data
        console.log("MCP client configuration:", {
          JIRA_BASE_URL: env.JIRA_BASE_URL,
          JIRA_EMAIL: env.JIRA_EMAIL,
          JIRA_API_TOKEN_EXISTS: !!env.JIRA_API_TOKEN,
          JIRA_API_TOKEN_LENGTH: env.JIRA_API_TOKEN?.length || 0,
          OAUTH_ENABLED: !!(
            env.JIRA_OAUTH_CLIENT_ID && env.JIRA_OAUTH_CLIENT_SECRET
          ),
          JIRA_CLOUD_ID: env.JIRA_CLOUD_ID ? "set" : "",
        });

        // Check for empty API token
        if (
          !env.JIRA_API_TOKEN &&
          !(env.JIRA_OAUTH_CLIENT_ID && env.JIRA_OAUTH_CLIENT_SECRET)
        ) {
          console.warn(
            "WARNING: JIRA credentials missing - set JIRA_API_TOKEN or OAuth client vars",
          );
        }

        const transport = new StdioClientTransport({
          command: nodeExecutable,
          args: [MCP_SERVER_PATH],
          env: env,
          cwd: path.dirname(MCP_SERVER_PATH),
        });

        await client.connect(transport);
        mcpClient = client;
      } catch (err) {
        // Store the error so we don't keep trying to reconnect
        const error = err instanceof Error ? err : new Error(String(err));
        connectionError = error;
        console.error("MCP client connection error:", error);
        throw error;
      }
    })();
  }

  try {
    await connectPromise;
    return mcpClient!;
  } catch (error) {
    // Propagate the error to the caller
    throw error;
  }
}

/**
 * List available tools
 */
export const handleListTools: RequestHandler = async (_req, res) => {
  try {
    const client = await getMcpClient();
    const result = await client.listTools();
    res.json(result || { tools: [] });
  } catch (error) {
    console.error("MCP list tools error:", error);
    res.status(500).json({
      error: "Failed to list MCP tools",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * List available resources
 */
export const handleListResources: RequestHandler = async (_req, res) => {
  try {
    const client = await getMcpClient();
    const result = await client.listResources();
    res.json(result || { resources: [] });
  } catch (error) {
    console.error("MCP list resources error:", error);
    res.status(500).json({
      error: "Failed to list MCP resources",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Call a tool
 */
export const handleCallTool: RequestHandler = async (req, res) => {
  try {
    const { name, arguments: args } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Tool name is required" });
    }

    const client = await getMcpClient();
    const response = await client.callTool({ name, arguments: args || {} });
    res.json(response || {});
  } catch (error) {
    const err: any = error;
    console.error("MCP tool call error:", err);
    const code = typeof err?.code === "number" ? err.code : undefined;
    const message = err?.message || "Unknown error";
    const data = err?.data;
    const status = code === -32602 || code === -32601 ? 400 : 500; // Invalid params / Method not found
    res
      .status(status)
      .json({ error: "MCP tool call failed", code, message, data });
  }
};

/**
 * Read a resource
 */
export const handleReadResource: RequestHandler = async (req, res) => {
  try {
    const { uri } = req.body;

    if (!uri) {
      return res.status(400).json({ error: "Resource URI is required" });
    }

    const client = await getMcpClient();
    const response = await client.readResource({ uri });
    res.json(response || {});
  } catch (error) {
    const err: any = error;
    console.error("MCP resource read error:", err);
    const code = typeof err?.code === "number" ? err.code : undefined;
    const message = err?.message || "Unknown error";
    const data = err?.data;
    const status = code === -32602 || code === -32601 ? 400 : 500;
    res
      .status(status)
      .json({ error: "Failed to read MCP resource", code, message, data });
  }
};
