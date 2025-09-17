import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { EnhancedChatService } from "./enhanced-chat.service";
import { ServicesModule } from "../services/services.module";
import { LaneCModule } from "../services/lane-c/lane-c.module";

@Module({
  imports: [ServicesModule, LaneCModule],
  controllers: [ChatController],
  providers: [ChatService, EnhancedChatService],
  exports: [ChatService, EnhancedChatService],
})
export class ChatModule {}
