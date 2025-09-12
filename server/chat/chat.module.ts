import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { EnhancedChatService } from "./enhanced-chat.service";
import { ServicesModule } from "../services/services.module";

@Module({
  imports: [ServicesModule],
  controllers: [ChatController],
  providers: [ChatService, EnhancedChatService],
  exports: [ChatService, EnhancedChatService],
})
export class ChatModule {}
