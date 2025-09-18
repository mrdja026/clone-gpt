import { Body, Controller, Get, Post, Inject, Headers } from "@nestjs/common";
import { McpService } from "./mcp.service";
import { JiraProjectTreeService } from "../services/jira-project-tree.service";
import { handleJiraProjectTreeTool } from "./tools/jira-project-tree";

@Controller("mcp")
export class McpController {
  constructor(
    @Inject(McpService) private readonly mcpService: McpService,
    private readonly jiraProjectTreeService: JiraProjectTreeService,
  ) {
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
    // Extract Perplexity API key from headers or environment
    const perplexityKey =
      headers["x-perplexity-key"] || process.env.PERPLEXITY_API_KEY;

    return this.mcpService.callTool(body.name, body.arguments, perplexityKey);
  }

  @Post("resource")
  async readResource(@Body() body: { uri: string }) {
    return this.mcpService.readResource(body.uri);
  }

  @Post("jira-project-tree")
  async getJiraProjectTree(
    @Body() body: { projectKeyOrId: string; pageSize?: number },
  ) {
    return handleJiraProjectTreeTool(body, this.jiraProjectTreeService);
  }
}
