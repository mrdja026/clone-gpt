import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ChatModule } from "./chat/chat.module";
import { SupabaseModule } from "./supabase/supabase.module";
import { ServicesModule } from "./services/services.module";
import { DemoController } from "./controllers/demo.controller";
import { PingAlertController } from "./controllers/ping-alert.controller";
import { ChatsController } from "./controllers/chats.controller";
import { QueryTemplatesController } from "./controllers/query-templates.controller";
import { McpModule } from "./mcp/mcp.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    SupabaseModule,
    ServicesModule,
    ChatModule,
    McpModule,
  ],
  controllers: [
    DemoController,
    ChatsController,
    QueryTemplatesController,
    PingAlertController,
  ],
  providers: [],
})
export class AppModule {}
