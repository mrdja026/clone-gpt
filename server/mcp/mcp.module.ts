import { Module } from "@nestjs/common";
import { McpController } from "./mcp.controller";
import { McpService } from "./mcp.service";
import { JiraProjectTreeService } from "../services/jira-project-tree.service";

@Module({
  controllers: [McpController],
  providers: [McpService, JiraProjectTreeService],
})
export class McpModule {}
