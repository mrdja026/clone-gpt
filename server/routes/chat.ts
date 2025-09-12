import { RequestHandler } from "express";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

// Configure OpenAI-compatible provider (works with Ollama)
const ollama = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "ollama",
  baseURL: process.env.OPENAI_BASE_URL || "http://127.0.0.1:11434/v1",
});

const modelName = process.env.MODEL_NAME || "llama3.1:latest";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
}

export interface ChatResponse {
  message: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export const handleChat: RequestHandler = async (req, res) => {
  try {
    const { messages, systemPrompt }: ChatRequest = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    // Set up streaming headers
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

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

    // Stream the response
    for await (const textPart of result.textStream) {
      res.write(textPart);
    }

    res.end();
  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({
      error: "Failed to process chat request",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Alternative non-streaming endpoint for compatibility
export const handleChatSync: RequestHandler = async (req, res) => {
  try {
    const { messages, systemPrompt }: ChatRequest = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

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

    const response: ChatResponse = {
      message: fullText,
      usage: usage
        ? {
            promptTokens: usage.inputTokens || 0,
            completionTokens: usage.outputTokens || 0,
            totalTokens: usage.totalTokens || 0,
          }
        : undefined,
    };

    res.json(response);
  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({
      error: "Failed to process chat request",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
