import { Body, Controller, Get, Post } from "@nestjs/common";
import { McpService } from "./mcp.service";

@Controller("api/mcp")
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Get("tools")
  async listTools() {
    return this.mcpService.listTools();
  }

  @Get("resources")
  async listResources() {
    return this.mcpService.listResources();
  }

  @Post("tool")
  async callTool(
    @Body() body: { name: string; arguments: Record<string, any> },
  ) {
    return this.mcpService.callTool(body.name, body.arguments);
  }

  @Post("resource")
  async readResource(@Body() body: { uri: string }) {
    return this.mcpService.readResource(body.uri);
  }
}
