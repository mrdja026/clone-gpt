import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SupabaseModule } from "./supabase/supabase.module";
import { ServicesModule } from "./services/services.module";
import { DemoController } from "./controllers/demo.controller";
import { ChatsController } from "./controllers/chats.controller";
import { QueryTemplatesController } from "./controllers/query-templates.controller";
import { McpModule } from "./mcp/mcp.module";
import { JiraController } from "./controllers/jira.controller";
import { JiraProjectTreeService } from "./services/jira-project-tree.service";
import { LaneBModule } from "./services/lane-b/lane-b.module";
import { LaneCModule } from "./services/lane-c/lane-c.module";
import { ReasoningModule } from "./services/reasoning/reasoning.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    SupabaseModule,
    ServicesModule,
    McpModule,
    LaneBModule,
    LaneCModule,
    ReasoningModule,
  ],
  controllers: [
    DemoController,
    ChatsController,
    QueryTemplatesController,
    JiraController,
  ],
  providers: [JiraProjectTreeService],
})
export class AppModule {}
