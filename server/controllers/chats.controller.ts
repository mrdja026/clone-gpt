import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ChatsService } from "../services/chats.service";
import { MessagesService } from "../services/messages.service";
import { CreateChatDto, UpdateChatDto } from "../entities/chat.entity";

@Controller("chats")
export class ChatsController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly messagesService: MessagesService,
  ) {}

  @Post()
  create(@Body() createChatDto: CreateChatDto) {
    return this.chatsService.create(createChatDto);
  }

  @Get()
  findAll(@Query("userId") userId?: string) {
    return this.chatsService.findAll(userId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Query("userId") userId?: string) {
    return this.chatsService.findOne(id, userId);
  }

  @Get(":id/messages")
  findMessages(@Param("id") id: string) {
    return this.messagesService.findByChatId(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateChatDto: UpdateChatDto,
    @Query("userId") userId?: string,
  ) {
    return this.chatsService.update(id, updateChatDto, userId);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Query("userId") userId?: string) {
    return this.chatsService.remove(id, userId);
  }
}
