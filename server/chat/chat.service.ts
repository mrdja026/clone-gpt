import { Injectable, Logger } from "@nestjs/common";
import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getEffectiveOllamaBaseUrl } from "../utils/ollama-proxy";

import { ChatRequestDto, ChatResponseDto } from "./dto/chat.dto";

// Configure provider for Ollama's OpenAI-compatible endpoint
const ollama = createOpenAICompatible({
  baseURL: getEffectiveOllamaBaseUrl(),
  name: "ollama",
  apiKey: process.env.OPENAI_API_KEY || "ollama",
});

const modelName = process.env.MODEL_NAME || "llama3.1:latest";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  async streamResponse(chatRequest: ChatRequestDto): Promise<any> {
    const { messages, systemPrompt } = chatRequest;

    this.logger.log(`Processing chat request with ${messages.length} messages`);

    const result = streamText({
      model: ollama.chatModel(modelName), // Use chatModel for OpenAI chat completions format
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
      model: ollama.chatModel(modelName),
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
