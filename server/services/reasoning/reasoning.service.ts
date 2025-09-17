import { Injectable, Logger } from "@nestjs/common";
import {
  ReasoningModeRequest,
  ReasoningModeResponse,
  ReasoningContext,
  ReasoningSession,
  ChatMessage,
} from "@shared/api";
import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getEffectiveOllamaBaseUrl } from "../../utils/ollama-proxy";

// Configure provider for Ollama's OpenAI-compatible endpoint
const ollama = createOpenAICompatible({
  baseURL: getEffectiveOllamaBaseUrl(),
  name: "ollama",
  apiKey: process.env.OPENAI_API_KEY || "ollama",
});

@Injectable()
export class ReasoningService {
  private readonly logger = new Logger(ReasoningService.name);
  private readonly sessions = new Map<string, ReasoningSession>();
  private readonly modelName: string;

  constructor() {
    this.modelName = process.env.REASONING_MODEL_NAME || "qwen2.5:7b";
    this.logger.log(
      `ReasoningService initialized with model: ${this.modelName}`,
    );
  }

  /**
   * Start a new reasoning session with context from three-lane processing
   */
  async startReasoningSession(context: ReasoningContext): Promise<string> {
    const sessionId = context.sessionId;

    const session: ReasoningSession = {
      id: sessionId,
      context,
      messages: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.sessions.set(sessionId, session);
    this.logger.log(`Started reasoning session: ${sessionId}`);

    return sessionId;
  }

  /**
   * Process a reasoning mode conversation
   */
  async processReasoningMessage(
    request: ReasoningModeRequest,
  ): Promise<ReasoningModeResponse> {
    this.logger.log(
      `Processing reasoning message for session: ${request.sessionId}`,
    );

    const session = this.sessions.get(request.sessionId);
    if (!session) {
      throw new Error(`Reasoning session not found: ${request.sessionId}`);
    }

    // Update session activity
    session.lastActivity = Date.now();

    // Add user message to session
    const userMessage: ChatMessage = {
      role: "user",
      content: request.message,
    };
    session.messages.push(userMessage);

    try {
      // Build the conversation with full context
      const messages = this.buildReasoningMessages(session, request.message);

      // Generate response using AI SDK
      const result = await streamText({
        model: ollama.chatModel(this.modelName),
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        maxOutputTokens: 2048,
        temperature: 0.7,
      });

      const responseText = await result.text;
      const usage = await result.usage;

      // Add assistant response to session
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: responseText,
      };
      session.messages.push(assistantMessage);

      return {
        response: responseText,
        sessionId: request.sessionId,
        contextUpdated: false,
        usage: usage
          ? {
              promptTokens: usage.inputTokens || 0,
              completionTokens: usage.outputTokens || 0,
              totalTokens: usage.totalTokens || 0,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Error processing reasoning message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get reasoning session by ID
   */
  getSession(sessionId: string): ReasoningSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Clean up old sessions (older than 1 hour)
   */
  cleanupOldSessions(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < oneHourAgo) {
        this.sessions.delete(sessionId);
        this.logger.log(`Cleaned up old reasoning session: ${sessionId}`);
      }
    }
  }

  /**
   * Build messages for reasoning conversation with full context
   */
  private buildReasoningMessages(
    session: ReasoningSession,
    currentMessage: string,
  ): ChatMessage[] {
    const { context } = session;
    const { combinedData, originalQuery } = context;

    // System prompt that includes the full context
    const systemPrompt = `You are an advanced AI reasoning assistant. You have been provided with comprehensive data from a three-lane analysis system and are now in reasoning mode where you can have a natural conversation about this data.

IMPORTANT: You are now in reasoning mode - this means:
1. You should NOT try to match patterns or call tools
2. Focus on conversational reasoning and analysis
3. Use the provided context data to inform your responses
4. Be helpful, insightful, and engage in natural dialogue

ORIGINAL CONTEXT:
- User's original query: "${originalQuery}"
- Intent detected: ${combinedData.laneAOutput.detectedIntent} (confidence: ${combinedData.laneAOutput.confidence})
- Data source: ${combinedData.laneBOutput.metadata.source}
- Analysis mode: ${combinedData.laneCOutput.mode}

AVAILABLE DATA:
${JSON.stringify(combinedData.laneBOutput.rawJson, null, 2)}

PREVIOUS ANALYSIS:
${combinedData.laneCOutput.analysis}

KEY INSIGHTS:
${combinedData.laneCOutput.insights.map((insight) => `- ${insight}`).join("\n")}

RECOMMENDATIONS:
${combinedData.laneCOutput.recommendations.map((rec) => `- ${rec}`).join("\n")}

You can now engage in natural conversation about this data, answer follow-up questions, provide deeper analysis, explore different angles, or help the user understand and work with this information. Be conversational, helpful, and insightful.`;

    const messages: ChatMessage[] = [
      {
        role: "assistant", // Using assistant role for system prompt in conversation
        content: systemPrompt,
      },
    ];

    // Add conversation history (last 10 messages to keep context manageable)
    const recentMessages = session.messages.slice(-10);
    messages.push(...recentMessages);

    // Add current message
    messages.push({
      role: "user",
      content: currentMessage,
    });

    return messages;
  }

  /**
   * Generate a unique session ID
   */
  static generateSessionId(): string {
    return `reasoning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
