import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";
import { ChatService } from "./chat.service";
import { EnhancedChatService } from "./enhanced-chat.service";
import type { ChatRequestDto, ChatResponseDto } from "./dto/chat.dto";
import type {
  PersistentChatRequestDto,
  PersistentChatResponseDto,
  ChatHistoryRequestDto,
} from "./dto/persistent-chat.dto";

@Controller("chat")
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly enhancedChatService: EnhancedChatService,
  ) {}

  @Post("stream")
  async streamChat(@Body() chatRequest: ChatRequestDto, @Res() res: Response) {
    try {
      if (!chatRequest.messages || !Array.isArray(chatRequest.messages)) {
        throw new HttpException(
          "Messages array is required",
          HttpStatus.BAD_REQUEST,
        );
      }

      // Set up streaming headers
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const result = await this.chatService.streamResponse(chatRequest);

      // Stream the response
      for await (const textPart of result.textStream) {
        res.write(textPart);
      }

      res.end();
    } catch (error) {
      console.error("Chat API error:", error);

      if (!res.headersSent) {
        throw new HttpException(
          {
            error: "Failed to process chat request",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  @Post()
  async chat(@Body() chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    try {
      if (!chatRequest.messages || !Array.isArray(chatRequest.messages)) {
        throw new HttpException(
          "Messages array is required",
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.chatService.getResponse(chatRequest);
    } catch (error) {
      console.error("Chat API error:", error);
      throw new HttpException(
        {
          error: "Failed to process chat request",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Enhanced endpoints with database persistence

  @Post("persistent/stream")
  async streamPersistentChat(
    @Body() chatRequest: PersistentChatRequestDto,
    @Res() res: Response,
  ) {
    try {
      if (!chatRequest.messages || !Array.isArray(chatRequest.messages)) {
        throw new HttpException(
          "Messages array is required",
          HttpStatus.BAD_REQUEST,
        );
      }

      // Set up streaming headers
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const result =
        await this.enhancedChatService.streamPersistentResponse(chatRequest);

      // Add chat metadata header
      res.setHeader("X-Chat-Id", result.chatId);
      res.setHeader("X-Message-Id", result.messageId);

      // Stream the response
      for await (const textPart of result.textStream) {
        res.write(textPart);
      }

      res.end();
    } catch (error) {
      console.error("Persistent chat API error:", error);

      if (!res.headersSent) {
        throw new HttpException(
          {
            error: "Failed to process persistent chat request",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  @Post("persistent")
  async persistentChat(
    @Body() chatRequest: PersistentChatRequestDto,
  ): Promise<PersistentChatResponseDto> {
    try {
      if (!chatRequest.messages || !Array.isArray(chatRequest.messages)) {
        throw new HttpException(
          "Messages array is required",
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.enhancedChatService.getPersistentResponse(chatRequest);
    } catch (error) {
      console.error("Persistent chat API error:", error);
      throw new HttpException(
        {
          error: "Failed to process persistent chat request",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("history")
  async getChatHistory(@Query() query: ChatHistoryRequestDto) {
    try {
      if (!query.chatId) {
        throw new HttpException("Chat ID is required", HttpStatus.BAD_REQUEST);
      }

      return await this.enhancedChatService.getChatHistory(
        query.chatId,
        query.userId,
      );
    } catch (error) {
      console.error("Get chat history error:", error);
      throw new HttpException(
        {
          error: "Failed to get chat history",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
