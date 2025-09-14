import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { startOllamaProxyIfNeeded } from "./utils/ollama-proxy";
import { verifyMcpJwt } from "./middleware/jwt";
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
  app.use("/api/mcp", measureMcpLatency, verifyMcpJwt);

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
}

bootstrap();
