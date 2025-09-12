import { RequestHandler } from "express";
import path from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * MCP Proxy Routes - Communicates with the hello_world_mpc server over stdio
 */

// Path to the MCP server
const MCP_SERVER_PATH = path.resolve(
  __dirname,
  "../../../hello_world_mpc/src/server.js",
);

let mcpClient: Client | null = null;
let connectPromise: Promise<void> | null = null;

async function getMcpClient(): Promise<Client> {
  if (mcpClient) return mcpClient;
  if (!connectPromise) {
    connectPromise = (async () => {
      const client = new Client(
        { name: "clone-gpt-mcp-proxy", version: "1.0.0" },
        { capabilities: { tools: {}, resources: {} } },
      );

      const nodeExecutable = process.platform === "win32" ? "node.exe" : "node";
      const transport = new StdioClientTransport({
        command: nodeExecutable,
        args: [MCP_SERVER_PATH],
        env: { ...process.env },
        cwd: path.dirname(MCP_SERVER_PATH),
      });

      await client.connect(transport);
      mcpClient = client;
    })();
  }
  await connectPromise;
  return mcpClient!;
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
    console.error("MCP tool call error:", error);
    res.status(500).json({
      error: "Failed to call MCP tool",
      message: error instanceof Error ? error.message : "Unknown error",
    });
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
    console.error("MCP resource read error:", error);
    res.status(500).json({
      error: "Failed to read MCP resource",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
