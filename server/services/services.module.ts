import { Module } from "@nestjs/common";
import { ChatsService } from "./chats.service";
import { MessagesService } from "./messages.service";
import { QueryTemplatesService } from "./query-templates.service";

@Module({
  providers: [ChatsService, MessagesService, QueryTemplatesService],
  exports: [ChatsService, MessagesService, QueryTemplatesService],
})
export class ServicesModule {}
