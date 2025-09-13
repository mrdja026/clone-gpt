#!/usr/bin/env node
/**
 * Start script that launches both the MCP server and the main application
 *
 * Since package.json is configured with "type": "module",
 * we need to use ESM import syntax instead of CommonJS require()
 */
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config();

// Paths with proper error checking
const MCP_SERVER_DIR = path.resolve(__dirname, "../hello_world_mcp/src");
const MCP_SERVER_PATH = process.env.MCP_SERVER_PATH || path.resolve(MCP_SERVER_DIR, "server.js");
const MCP_ENV_PATH = path.resolve(__dirname, "../hello_world_mcp/.env");

// Log paths for debugging
console.log("MCP Server Path:", MCP_SERVER_PATH);
console.log("MCP Env Path:", MCP_ENV_PATH);

// Check if MCP server exists
if (!fs.existsSync(MCP_SERVER_PATH)) {
  console.error(`MCP server not found at ${MCP_SERVER_PATH}`);
  process.exit(1);
}

// Create .env file for MCP server if it doesn't exist
if (!fs.existsSync(MCP_ENV_PATH)) {
  console.log("Creating .env file for MCP server...");
  const envContent = `# JIRA Configuration (example values, replace with real ones for production)
JIRA_BASE_URL=https://example.atlassian.net
JIRA_EMAIL=user@example.com
JIRA_API_TOKEN=your_api_token_here
`;

  try {
    fs.writeFileSync(MCP_ENV_PATH, envContent);
    console.log("Created .env file for MCP server");
  } catch (error) {
    console.warn("Failed to create .env file for MCP server:", error.message);
  }
}

// Start MCP server
console.log("Starting MCP server...");

// Check if Node.js is available
const nodeExecutable = process.platform === "win32" ? "node.exe" : "node";

// Define mcpProcess in the outer scope so it can be accessed everywhere
let mcpProcess;

try {
  // Try to start the MCP server
  mcpProcess = spawn(nodeExecutable, [MCP_SERVER_PATH], {
    stdio: "pipe",
    env: {
      ...process.env,
      PORT: 3001, // Ensure MCP server runs on port 3001
    },
    cwd: path.dirname(MCP_SERVER_PATH), // Run from the MCP server directory
  });

  mcpProcess.stdout.on("data", (data) => {
    console.log(`MCP: ${data.toString().trim()}`);
  });

  mcpProcess.stderr.on("data", (data) => {
    console.error(`MCP error: ${data.toString().trim()}`);
  });

  mcpProcess.on("close", (code) => {
    console.log(`MCP server exited with code ${code}`);
    // Also exit main app if MCP server crashes
    if (mainProcess) {
      mainProcess.kill();
    }
    process.exit(code);
  });
} catch (error) {
  console.error(`Failed to start MCP server: ${error.message}`);
  console.log("Continuing with simulated MCP responses");
  // Create a dummy process object
  mcpProcess = {
    kill: () => console.log("No MCP process to kill"),
  };
}

// Define mainProcess in the outer scope
let mainProcess;

// Start main application
console.log("Starting main application...");

try {
  // Use npm instead of pnpm to avoid potential path issues
  // Also add the cwd option to ensure we're running in the correct directory
  mainProcess = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "dev"],
    {
      stdio: "inherit",
      shell: true,
      cwd: __dirname, // Make sure we're in the right directory
    },
  );
} catch (error) {
  console.error(`Failed to start main application: ${error.message}`);
  if (mcpProcess) {
    mcpProcess.kill();
  }
  process.exit(1);
}

mainProcess.on("close", (code) => {
  console.log(`Main application exited with code ${code}`);
  // Also terminate MCP server if main app exits
  mcpProcess.kill();
  process.exit(code);
});

// Handle termination
process.on("SIGINT", () => {
  console.log("Shutting down...");
  mainProcess.kill();
  mcpProcess.kill();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Shutting down...");
  mainProcess.kill();
  mcpProcess.kill();
  process.exit(0);
});

console.log("Services started. Press Ctrl+C to stop.");
