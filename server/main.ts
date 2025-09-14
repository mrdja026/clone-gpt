import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { startOllamaProxyIfNeeded, getOllamaProxyStatus } from "./utils/ollama-proxy";
import { publishHealthSnapshot, upstashEnabled } from "./utils/upstash";
import { measureMcpLatency } from "./middleware/timing";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug"],
  });

  // Ensure 127.0.0.1:11434 forwards to Windows Ollama when not running in WSL
  // Only activates when OPENAI_BASE_URL targets localhost and the requested model
  // is missing locally. Safe no-op if port is already bound or model exists.
  try {
    await startOllamaProxyIfNeeded();
  } catch (e) {
    console.warn("[OllamaProxy] setup skipped:", (e as any)?.message || e);
  }

  // Enable CORS for frontend
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Apply middlewares to MCP routes
  app.use("/api/mcp", measureMcpLatency);

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Set global prefix for API routes
  app.setGlobalPrefix("api");

  const port = Number(process.env.PORT || 3001);
  const host = process.env.BIND_HOST || "0.0.0.0";
  await app.listen(port, host);
  const urlHost = process.env.PUBLIC_HOST || "localhost";
  console.log(
    `NestJS application is running on: http://${urlHost}:${port} (bind ${host})`,
  );

  // Publish health snapshot to Upstash if configured
  try {
    if (upstashEnabled()) {
      const makeHealth = () => ({
        status: "ok",
        port: String(port),
        host,
        env: {
          MCP_USE_FIXTURES: process.env.MCP_USE_FIXTURES || "",
          JIRA_BASE_URL: process.env.JIRA_BASE_URL ? "set" : "",
          OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "",
          MODEL_NAME: process.env.MODEL_NAME || "",
          JIRA_BOARD_ID: process.env.JIRA_BOARD_ID || "",
          JIRA_PROJECT_KEY: process.env.JIRA_PROJECT_KEY || "",
        },
        ollamaProxy: getOllamaProxyStatus(),
        time: new Date().toISOString(),
      });
      const key = process.env.UPSTASH_HEALTH_KEY || "healthz:last";
      const ok = await publishHealthSnapshot(key, makeHealth());
      console.log(`[Upstash] published health snapshot to key='${key}': ${ok}`);

      // Periodic publishing if interval set (default 60s)
      const intervalSec = Number(process.env.UPSTASH_HEALTH_INTERVAL_SEC || 60);
      if (intervalSec > 0) {
        setInterval(async () => {
          try {
            const ok2 = await publishHealthSnapshot(key, makeHealth());
            if (!ok2) console.warn("[Upstash] periodic publish returned false");
          } catch (e) {
            console.warn("[Upstash] periodic publish failed:", (e as any)?.message || e);
          }
        }, intervalSec * 1000).unref?.();
        console.log(`[Upstash] periodic publishing every ${intervalSec}s to key='${key}'`);
      }
    } else {
      console.log("[Upstash] disabled (missing env)");
    }
  } catch (e) {
    console.warn("[Upstash] publish skipped:", (e as any)?.message || e);
  }
}

bootstrap();
