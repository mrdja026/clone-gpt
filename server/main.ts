import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { verifyMcpJwt } from "./middleware/jwt";
import { measureMcpLatency } from "./middleware/timing";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`NestJS application is running on: http://localhost:${port}`);
}

bootstrap();
