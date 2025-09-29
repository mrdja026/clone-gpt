import { Body, Controller, Get, Post, Inject, Headers } from "@nestjs/common";
import { McpService } from "./mcp.service";

@Controller("mcp")
export class McpController {
  constructor(@Inject(McpService) private readonly mcpService: McpService) {
    this.listTools = this.listTools.bind(this);
    this.listResources = this.listResources.bind(this);
    this.callTool = this.callTool.bind(this);
    this.readResource = this.readResource.bind(this);
  }

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
    @Headers() headers: Record<string, string>,
  ) {
    return this.mcpService.callTool(body.name, body.arguments, headers);
  }

  @Post("resource")
  async readResource(@Body() body: { uri: string }) {
    return this.mcpService.readResource(body.uri);
  }

}
