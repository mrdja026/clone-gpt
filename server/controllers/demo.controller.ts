import { Controller, Get } from "@nestjs/common";
import type { DemoResponse } from "../../shared/api";

@Controller()
export class DemoController {
  @Get("demo")
  getDemo(): DemoResponse {
    return {
      message: "Hello from NestJS!",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("ping")
  getPing(): { message: string } {
    const ping = process.env.PING_MESSAGE ?? "ping";
    return { message: ping };
  }
}
