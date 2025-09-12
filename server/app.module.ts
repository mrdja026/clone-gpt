import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ChatModule } from "./chat/chat.module";
import { SupabaseModule } from "./supabase/supabase.module";
import { ServicesModule } from "./services/services.module";
import { DemoController } from "./controllers/demo.controller";
import { ChatsController } from "./controllers/chats.controller";
import { QueryTemplatesController } from "./controllers/query-templates.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    SupabaseModule,
    ServicesModule,
    ChatModule,
  ],
  controllers: [DemoController, ChatsController, QueryTemplatesController],
  providers: [],
})
export class AppModule {}
