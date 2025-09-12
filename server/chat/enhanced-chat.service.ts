import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { ChatRequestDto, ChatResponseDto } from "./dto/chat.dto";
import { ChatsService } from "../services/chats.service";
import { MessagesService } from "../services/messages.service";
import { CreateChatDto } from "../entities/chat.entity";
import { CreateMessageDto } from "../entities/message.entity";

// Configure provider for Ollama's OpenAI-compatible endpoint
const ollama = createOpenAICompatible({
  baseURL: process.env.OPENAI_BASE_URL || "http://127.0.0.1:11434/v1",
  name: "ollama",
  apiKey: process.env.OPENAI_API_KEY || "ollama",
});

// Downgrade to AI SDK 1.x compatible model format
const modelName = process.env.MODEL_NAME || "llama2";

export interface PersistentChatRequestDto extends ChatRequestDto {
  chatId?: string;
  userId?: string;
  autoSave?: boolean;
}

@Injectable()
export class EnhancedChatService {
  private readonly logger = new Logger(EnhancedChatService.name);

  constructor(
    private readonly chatsService: ChatsService,
    private readonly messagesService: MessagesService,
  ) {}

  async createOrGetChat(chatId?: string, userId?: string, title?: string) {
    if (chatId) {
      // Try to get existing chat
      try {
        return await this.chatsService.findOne(chatId, userId);
      } catch (error) {
        this.logger.warn(`Chat ${chatId} not found, creating new one`);
      }
    }

    // Create new chat
    const createChatDto: CreateChatDto = {
      title: title || "New Chat",
      user_id: userId,
    };

    return await this.chatsService.create(createChatDto);
  }

  async streamPersistentResponse(
    chatRequest: PersistentChatRequestDto,
  ): Promise<{
    textStream: AsyncIterable<string>;
    chatId: string;
    messageId: string;
  }> {
    const {
      messages,
      systemPrompt,
      chatId,
      userId,
      autoSave = true,
    } = chatRequest;

    this.logger.log(
      `Processing persistent chat request with ${messages.length} messages`,
    );

    // Create or get chat
    const chat = await this.createOrGetChat(chatId, userId);

    // If auto-save is enabled, save the user message first
    let userMessageId: string | undefined;
    if (autoSave && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        const userMessageDto: CreateMessageDto = {
          chat_id: chat.id,
          content: lastMessage.content,
          role: "user",
        };
        const savedUserMessage =
          await this.messagesService.create(userMessageDto);
        userMessageId = savedUserMessage.id;
      }
    }

    // Create placeholder for assistant message
    const assistantMessageDto: CreateMessageDto = {
      chat_id: chat.id,
      content: "",
      role: "assistant",
    };
    const assistantMessage =
      await this.messagesService.create(assistantMessageDto);

    // Generate streaming response
    const result = streamText({
      model: ollama.chatModel(modelName),
      system:
        systemPrompt ||
        "You are JiraGPT, a helpful assistant specialized in project management, Jira workflows, and providing actionable insights for software development teams. Provide detailed analysis and practical suggestions.",
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      maxOutputTokens: 1024,
    });

    // Create a custom async generator that updates the database
    const self = this;
    async function* trackingTextStream() {
      let fullContent = "";

      for await (const textPart of result.textStream) {
        fullContent += textPart;
        yield textPart;
      }

      // Update the assistant message with final content
      if (autoSave) {
        try {
          await self.messagesService.update(assistantMessage.id, {
            content: fullContent,
          });

          // Update chat title if this is the first conversation
          if (messages.length <= 1) {
            const title = self.generateChatTitle(
              messages[0]?.content || fullContent,
            );
            await self.chatsService.update(chat.id, { title }, userId);
          }
        } catch (error) {
          self.logger.error("Failed to update message:", error);
        }
      }
    }

    return {
      textStream: trackingTextStream(),
      chatId: chat.id,
      messageId: assistantMessage.id,
    };
  }

  async getPersistentResponse(
    chatRequest: PersistentChatRequestDto,
  ): Promise<ChatResponseDto & { chatId: string }> {
    const {
      messages,
      systemPrompt,
      chatId,
      userId,
      autoSave = true,
    } = chatRequest;

    this.logger.log(
      `Processing persistent sync chat request with ${messages.length} messages`,
    );

    // Create or get chat
    const chat = await this.createOrGetChat(chatId, userId);

    // Generate response
    const result = await streamText({
      model: ollama.chatModel(modelName),
      system:
        systemPrompt ||
        "You are JiraGPT, a helpful assistant specialized in project management, Jira workflows, and providing actionable insights for software development teams. Provide detailed analysis and practical suggestions.",
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      maxOutputTokens: 1024,
    });

    const fullText = await result.text;
    const usage = await result.usage;

    // Save messages if auto-save is enabled
    if (autoSave) {
      const messagesToSave: CreateMessageDto[] = [];

      // Save user message if it's new
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === "user") {
        messagesToSave.push({
          chat_id: chat.id,
          content: lastMessage.content,
          role: "user",
        });
      }

      // Save assistant message
      messagesToSave.push({
        chat_id: chat.id,
        content: fullText,
        role: "assistant",
      });

      await this.messagesService.createBatch(messagesToSave);

      // Update chat title if this is the first conversation
      if (messages.length <= 1) {
        const title = this.generateChatTitle(lastMessage?.content || fullText);
        await this.chatsService.update(chat.id, { title }, userId);
      }
    }

    const response: ChatResponseDto = {
      message: fullText,
      usage: usage
        ? {
            promptTokens: usage.inputTokens || 0,
            completionTokens: usage.outputTokens || 0,
            totalTokens: usage.totalTokens || 0,
          }
        : undefined,
    };

    return {
      ...response,
      chatId: chat.id,
    };
  }

  async getChatHistory(chatId: string, userId?: string) {
    // Verify chat exists and user has access
    await this.chatsService.findOne(chatId, userId);

    // Get messages
    return await this.messagesService.findByChatId(chatId);
  }

  private generateChatTitle(content: string): string {
    const clean = content.replace(/\s+/g, " ").trim();
    return clean.length > 60 ? clean.slice(0, 57) + "…" : clean || "New chat";
  }
}
