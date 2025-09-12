import { Injectable, Logger } from "@nestjs/common";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { ChatRequestDto, ChatResponseDto } from "./dto/chat.dto";

// Configure OpenAI-compatible provider (works with Ollama)
const ollama = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "branko:latest",
  baseURL: process.env.OPENAI_BASE_URL || "http://127.0.0.1:11434/v1",
});

const modelName = process.env.MODEL_NAME || "llama3.1:latest";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  async streamResponse(chatRequest: ChatRequestDto): Promise<any> {
    const { messages, systemPrompt } = chatRequest;

    this.logger.log(`Processing chat request with ${messages.length} messages`);

    const result = streamText({
      model: ollama(modelName), // Using local Ollama model
      system:
        systemPrompt ||
        "You are a helpful assistant that provides detailed analysis and suggestions for project management queries.",
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      maxOutputTokens: 1024,
    });

    return result;
  }

  async getResponse(chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    const { messages, systemPrompt } = chatRequest;

    this.logger.log(
      `Processing sync chat request with ${messages.length} messages`,
    );

    const result = await streamText({
      model: ollama(modelName),
      system:
        systemPrompt ||
        "You are a helpful assistant that provides detailed analysis and suggestions for project management queries.",
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      maxOutputTokens: 1024,
    });

    // Get the full text result
    const fullText = await result.text;
    const usage = await result.usage;

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

    return response;
  }
}
