import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { verifyMcpJwt } from "./middleware/jwt";
import { measureMcpLatency } from "./middleware/timing";
import { handleChat, handleChatSync } from "./routes/chat";
import {
  handleListTools,
  handleListResources,
  handleCallTool,
  handleReadResource,
} from "./routes/mcp";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // AI Chat endpoints
  app.post("/api/chat", handleChatSync); // Non-streaming endpoint
  app.post("/api/chat/stream", handleChat); // Streaming endpoint

  // MCP endpoints (JWT optional in dev; enforced when MCP_JWT_SECRET set)
  app.use("/api/mcp", measureMcpLatency, verifyMcpJwt);
  app.get("/api/mcp/tools", handleListTools);
  app.get("/api/mcp/resources", handleListResources);
  app.post("/api/mcp/tool", handleCallTool);
  app.post("/api/mcp/resource", handleReadResource);

  return app;
}
