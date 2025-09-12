#!/usr/bin/env node
/**
 * Start script that launches both the MCP server and the main application
 *
 * Since package.json is configured with "type": "module",
 * we need to use ESM import syntax and rename to .mjs
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

// Check if we should use the test MCP server
const useTestMcp = process.env.USE_TEST_MCP === "true";

// Paths with proper error checking
const MCP_SERVER_DIR = path.resolve(__dirname, "../hello_world_mpc/src");
// Use test-tools.js if USE_TEST_MCP is set to 'true'
const MCP_SERVER_PATH = useTestMcp
  ? path.resolve(__dirname, "../hello_world_mpc/test-tools.js")
  : path.resolve(MCP_SERVER_DIR, "server.js");
const MCP_ENV_PATH = path.resolve(__dirname, "../hello_world_mpc/.env");
const MCP_LOGS_DIR = path.resolve(__dirname, "../hello_world_mpc/logs");

// Create logs directory if it doesn't exist
if (!fs.existsSync(MCP_LOGS_DIR)) {
  try {
    fs.mkdirSync(MCP_LOGS_DIR, { recursive: true });
    console.log("Created logs directory:", MCP_LOGS_DIR);
  } catch (error) {
    console.warn("Failed to create logs directory:", error.message);
  }
}

// Log paths for debugging
console.log("MCP Server Path:", MCP_SERVER_PATH);
console.log("MCP Env Path:", MCP_ENV_PATH);
console.log("MCP Logs Dir:", MCP_LOGS_DIR);
console.log("Using Test MCP Server:", useTestMcp ? "YES" : "NO");

// Check if MCP server exists
if (!fs.existsSync(MCP_SERVER_PATH)) {
  console.error(`MCP server not found at ${MCP_SERVER_PATH}`);
  process.exit(1);
}

// Create .env file for MCP server if it doesn't exist or copy from parent
if (!fs.existsSync(MCP_ENV_PATH)) {
  console.log("Creating .env file for MCP server...");

  // Check if API token is available in the parent project
  const jiraApiToken = process.env.JIRA_API_TOKEN;

  let envContent = `# JIRA Configuration
JIRA_BASE_URL=${process.env.JIRA_BASE_URL || "https://mrdjanstajic.atlassian.net"}
JIRA_EMAIL=${process.env.JIRA_EMAIL || "mrdjanstajic@gmail.com"}
`;

  // Add the API token if it exists, otherwise add placeholder
  if (jiraApiToken) {
    envContent += `JIRA_API_TOKEN=${jiraApiToken}\n`;
    console.log("Found and added JIRA API token to .env");
  } else {
    envContent += `JIRA_API_TOKEN=your_api_token_here\n`;
    console.log("WARNING: No JIRA API token found in environment");
  }

  try {
    fs.writeFileSync(MCP_ENV_PATH, envContent);
    console.log("Created .env file for MCP server");
  } catch (error) {
    console.warn("Failed to create .env file for MCP server:", error.message);
  }
}

// Define mcpProcess in the outer scope so it can be accessed everywhere
let mcpProcess;

// Start MCP server
console.log("Starting MCP server...");

// Check if Node.js is available
const nodeExecutable = process.platform === "win32" ? "node.exe" : "node";

// Load environment variables from the MCP .env file directly
let mcpEnvVars = {};
try {
  if (fs.existsSync(MCP_ENV_PATH)) {
    const mcpDotEnv = dotenv.config({ path: MCP_ENV_PATH });
    if (mcpDotEnv.parsed) {
      mcpEnvVars = mcpDotEnv.parsed;
      console.log(
        "Loaded environment variables from MCP .env file:",
        Object.keys(mcpEnvVars),
      );
    }
  } else {
    console.log("MCP .env file does not exist, using defaults");
  }
} catch (error) {
  console.warn("Failed to load MCP .env file:", error.message);
}

try {
  // Set default values directly to avoid undefined access
  const baseUrl = "https://mrdjanstajic.atlassian.net";
  const email = "mrdjanstajic@gmail.com";
  const apiToken = "";

  // MCP server uses stdio for communication, so we need to set up pipes correctly
  mcpProcess = spawn(nodeExecutable, [MCP_SERVER_PATH], {
    stdio: ["pipe", "pipe", "pipe"], // stdin, stdout, stderr all as pipes
    env: {
      ...process.env,
      // Explicitly set these variables with guaranteed default values
      JIRA_BASE_URL:
        (mcpEnvVars && mcpEnvVars.JIRA_BASE_URL) ||
        process.env.JIRA_BASE_URL ||
        baseUrl,
      JIRA_EMAIL:
        (mcpEnvVars && mcpEnvVars.JIRA_EMAIL) ||
        process.env.JIRA_EMAIL ||
        email,
      JIRA_API_TOKEN:
        (mcpEnvVars && mcpEnvVars.JIRA_API_TOKEN) ||
        process.env.JIRA_API_TOKEN ||
        apiToken,
      // Signal this is the test server
      USE_TEST_MCP: useTestMcp ? "true" : "false",
    },
    cwd: path.dirname(MCP_SERVER_PATH), // Run from the MCP server directory
  });

  mcpProcess.stdout.on("data", (data) => {
    console.log(`MCP: ${data.toString().trim()}`);
  });

  mcpProcess.stderr.on("data", (data) => {
    console.error(`MCP error: ${data.toString().trim()}`);
  });

  mcpProcess.on("error", (error) => {
    console.error(`MCP server failed to start: ${error.message}`);
    console.log("Continuing with simulated MCP responses");
  });

  mcpProcess.on("close", (code) => {
    console.log(`MCP server exited with code ${code}`);
    // Also exit main app if MCP server crashes
    if (mainProcess) {
      mainProcess.kill();
    }
    process.exit(code);
  });

  // Log environment variables being passed to MCP (without exposing sensitive values)
  console.log("MCP environment configuration:", {
    JIRA_BASE_URL:
      (mcpEnvVars && mcpEnvVars.JIRA_BASE_URL) ||
      process.env.JIRA_BASE_URL ||
      baseUrl,
    JIRA_EMAIL:
      (mcpEnvVars && mcpEnvVars.JIRA_EMAIL) || process.env.JIRA_EMAIL || email,
    JIRA_API_TOKEN_EXISTS:
      !!(mcpEnvVars && mcpEnvVars.JIRA_API_TOKEN) ||
      !!process.env.JIRA_API_TOKEN ||
      !!apiToken,
    USE_TEST_MCP: useTestMcp,
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

  mainProcess.on("error", (error) => {
    console.error(`Main application error: ${error.message}`);
    if (mcpProcess) {
      mcpProcess.kill();
    }
    process.exit(1);
  });
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
  if (mcpProcess) {
    mcpProcess.kill();
  }
  process.exit(code);
});

// Handle termination
process.on("SIGINT", () => {
  console.log("Shutting down...");
  if (mainProcess) mainProcess.kill();
  if (mcpProcess) mcpProcess.kill();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Shutting down...");
  if (mainProcess) mainProcess.kill();
  if (mcpProcess) mcpProcess.kill();
  process.exit(0);
});

console.log("Services started. Press Ctrl+C to stop.");
