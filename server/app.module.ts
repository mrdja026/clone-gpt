import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ChatModule } from "./chat/chat.module";
import { SupabaseModule } from "./supabase/supabase.module";
import { ServicesModule } from "./services/services.module";
import { DemoController } from "./controllers/demo.controller";
import { ChatsController } from "./controllers/chats.controller";
import { QueryTemplatesController } from "./controllers/query-templates.controller";
import { McpModule } from "./mcp/mcp.module";
import { JiraController } from "./controllers/jira.controller";
import { LaneBModule } from "./services/lane-b/lane-b.module";
import { LaneCModule } from "./services/lane-c/lane-c.module";

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
    ChatModule,
  ],
  controllers: [
    DemoController,
    ChatsController,
    QueryTemplatesController,
    JiraController,
  ],
  providers: [],
})
export class AppModule {}
