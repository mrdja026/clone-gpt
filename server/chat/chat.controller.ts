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
import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import axios from "axios";
import { z } from "zod";

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

      // Local provider for streaming (avoids DI edge cases)
      const ollama = createOpenAICompatible({
        baseURL: process.env.OPENAI_BASE_URL || "http://127.0.0.1:11434/v1",
        name: "ollama",
        apiKey: process.env.OPENAI_API_KEY || "ollama",
      });
      const modelName = process.env.MODEL_NAME || "llama3.1:latest";

      // Tool bridge: align with Repo B Modelfile tool names
      const port = Number(process.env.PORT || 3001);
      const apiBase = `http://localhost:${port}/api`;
      const tools = {
        fetch_jira_ticket: {
          description: "Fetch a Jira ticket by key (e.g., SCRUM-8)",
          inputSchema: z.object({ ticketKey: z.string() }),
          execute: async ({ ticketKey }: { ticketKey: string }) => {
            const resp = await axios.post(`${apiBase}/mcp/tool`, {
              name: "fetch_jira_ticket",
              arguments: { ticketKey },
            });
            // Our MCP returns { content: [{ type: 'text', text: JSON }] }
            const text = resp.data?.content?.[0]?.text ?? "";
            return typeof text === "string" ? text : JSON.stringify(resp.data);
          },
        },
        list_jira_projects: {
          description: "List Jira projects",
          inputSchema: z.object({}),
          execute: async () => {
            const resp = await axios.post(`${apiBase}/mcp/resource`, {
              uri: "mcp://local-mcp-server/jira/projects",
            });
            const text = resp.data?.contents?.[0]?.text ?? "";
            return typeof text === "string" ? text : JSON.stringify(resp.data);
          },
        },
        get_current_sprint_summary: {
          description: "Get current sprint summary",
          inputSchema: z.object({}),
          execute: async () => {
            // Use MCP resource for current sprint
            const resp = await axios.post(`${apiBase}/mcp/resource`, {
              uri: "mcp://local-mcp-server/jira/current-sprint",
            });
            const text = resp.data?.contents?.[0]?.text ?? "";
            return typeof text === "string" ? text : JSON.stringify(resp.data);
          },
        },
      } as const;

      const result = streamText({
        model: ollama.chatModel(modelName),
        tools,
        system:
          chatRequest.systemPrompt ||
          "You are a helpful assistant that provides detailed analysis and suggestions for project management queries.",
        messages: chatRequest.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        maxOutputTokens: 1024,
      });

      // Prefer DataStream SSE for richer events; fallback to plain text chunks
      const pipe = (result as any).pipeDataStreamToResponse;
      if (typeof pipe === "function") {
        await pipe(res, {
          headers: {
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
        return;
      }

      // Fallback: plain text streaming
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
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
      // Use AI SDK directly (mirrors ChatService.getResponse but avoids DI issues)
      const ollama = createOpenAICompatible({
        baseURL: process.env.OPENAI_BASE_URL || "http://127.0.0.1:11434/v1",
        name: "ollama",
        apiKey: process.env.OPENAI_API_KEY || "ollama",
      });
      const modelName = process.env.MODEL_NAME || "llama3.1:latest";

      // Tool bridge (same as in streamChat)
      const port = Number(process.env.PORT || 3001);
      const apiBase = `http://localhost:${port}/api`;
      const tools = {
        fetch_jira_ticket: {
          description: "Fetch a Jira ticket by key (e.g., SCRUM-8)",
          inputSchema: z.object({ ticketKey: z.string() }),
          execute: async ({ ticketKey }: { ticketKey: string }) => {
            const resp = await axios.post(`${apiBase}/mcp/tool`, {
              name: "fetch_jira_ticket",
              arguments: { ticketKey },
            });
            const text = resp.data?.content?.[0]?.text ?? "";
            return typeof text === "string" ? text : JSON.stringify(resp.data);
          },
        },
        list_jira_projects: {
          description: "List Jira projects",
          inputSchema: z.object({}),
          execute: async () => {
            const resp = await axios.post(`${apiBase}/mcp/resource`, {
              uri: "mcp://local-mcp-server/jira/projects",
            });
            const text = resp.data?.contents?.[0]?.text ?? "";
            return typeof text === "string" ? text : JSON.stringify(resp.data);
          },
        },
        get_current_sprint_summary: {
          description: "Get current sprint summary",
          inputSchema: z.object({}),
          execute: async () => {
            const resp = await axios.post(`${apiBase}/mcp/resource`, {
              uri: "mcp://local-mcp-server/jira/current-sprint",
            });
            const text = resp.data?.contents?.[0]?.text ?? "";
            return typeof text === "string" ? text : JSON.stringify(resp.data);
          },
        },
      } as const;

      const result = await streamText({
        model: ollama.chatModel(modelName),
        tools,
        system:
          chatRequest.systemPrompt ||
          "You are a helpful assistant that provides detailed analysis and suggestions for project management queries.",
        messages: chatRequest.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        maxOutputTokens: 1024,
      });

      const fullText = await result.text;
      const usage = await result.usage;

      return {
        message: fullText,
        usage: usage
          ? {
              promptTokens: (usage as any).inputTokens || 0,
              completionTokens: (usage as any).outputTokens || 0,
              totalTokens: (usage as any).totalTokens || 0,
            }
          : undefined,
      };
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
