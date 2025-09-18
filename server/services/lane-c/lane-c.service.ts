import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  LaneCInput,
  LaneCOutput,
  LaneAOutput,
  LaneBOutput,
  ChatMessage,
} from "@shared/api";
import {
  LaneCConfig,
  OllamaChatRequest,
  OllamaChatResponse,
  DataAnalysisPrompt,
  GeneralChatPrompt,
} from "./types/lane-c.types";

@Injectable()
export class LaneCService {
  private readonly logger = new Logger(LaneCService.name);
  private readonly config: LaneCConfig;

  // Two-stage pipeline markers and limits
  private static readonly RAW_BEGIN = "=== RAW_DATA_BEGIN ===";
  private static readonly RAW_END = "=== RAW_DATA_END ===";
  private static readonly RAW_MAX_CHARS = 120000;

  constructor(private configService: ConfigService) {
    this.logger.log("LaneCService constructor called");
    this.logger.log("ConfigService exists:", !!this.configService);

    if (!this.configService) {
      this.logger.error(
        "ConfigService is null/undefined! Creating fallback config...",
      );
      const laneCHost = process.env.LANE_C_HOST || "127.0.0.1:124";
      this.config = {
        modelName: process.env.MODEL_NAME || "qwen2.5:7b",
        ollamaUrl: process.env.OLLAMA_URL || `http://${laneCHost}/api/chat`,
        temperature: parseFloat(process.env.LANE_C_TEMPERATURE || "0.7"),
        maxTokens: parseInt(process.env.LANE_C_MAX_TOKENS || "2048"),
        directAnalysis:
          process.env.LANE_C_DIRECT_ANALYSIS === "1" ||
          /^true$/i.test(process.env.LANE_C_DIRECT_ANALYSIS || ""),
      };
    } else {
      const laneCHost = this.configService.get<string>(
        "LANE_C_HOST",
        "127.0.0.1:124",
      );
      this.config = {
        modelName: this.configService.get<string>("MODEL_NAME", "qwen2.5:7b"),
        ollamaUrl: this.configService.get<string>(
          "OLLAMA_URL",
          `http://${laneCHost}/api/chat`,
        ),
        temperature: this.configService.get<number>("LANE_C_TEMPERATURE", 0.7),
        maxTokens: this.configService.get<number>("LANE_C_MAX_TOKENS", 2048),
        directAnalysis:
          this.configService.get<string>("LANE_C_DIRECT_ANALYSIS", "0") ===
            "1" ||
          /^true$/i.test(
            this.configService.get<string>("LANE_C_DIRECT_ANALYSIS", "0") || "",
          ),
      };
    }

    const mode = /\/api\/generate\b/i.test(this.config.ollamaUrl)
      ? "generate"
      : "chat";
    this.logger.debug(
      `Lane C endpoint mode: ${mode} (${this.config.ollamaUrl})`,
    );
    this.logger.log(`Lane C configured with model: ${this.config.modelName}`);
  }

  async processAnalysis(input: LaneCInput): Promise<LaneCOutput> {
    this.logger.log(`Processing Lane C analysis for query: ${input.userQuery}`);

    try {
      // Determine if we have structured data from Lane B
      const hasStructuredData =
        input.rawData?.metadata?.status === "success" &&
        input.rawData.rawJson &&
        Object.keys(input.rawData.rawJson).length > 0;

      // Detect whether RAW data was already emitted in this conversation
      const rawEmitted =
        Array.isArray(input.chatHistory) &&
        input.chatHistory.some(
          (m) =>
            m.role === "assistant" &&
            typeof m.content === "string" &&
            m.content.includes(LaneCService.RAW_BEGIN),
        );

      // Default: two-stage flow (raw -> analysis). Legacy direct analysis can be enabled via config.
      if (hasStructuredData && !this.config.directAnalysis) {
        if (!rawEmitted) {
          // Phase 1: Return pure raw data (no LLM call)
          return this.emitRawDataResponse(input);
        }
        // Phase 2: Perform grounded analysis that references raw data from history
        return await this.performGeneralChat(input);
      }

      // No structured data or legacy direct analysis enabled
      if (hasStructuredData && this.config.directAnalysis) {
        return await this.performDataAnalysis(input);
      }
      return await this.performGeneralChat(input);
    } catch (error: any) {
      this.logger.error(`Error in Lane C processing: ${error.message}`);
      return this.createFallbackResponse(input, error.message);
    }
  }

  private async performDataAnalysis(input: LaneCInput): Promise<LaneCOutput> {
    this.logger.log("Performing data analysis with structured data");

    const prompt = this.buildDataAnalysisPrompt(input);
    const messages: OllamaChatRequest["messages"] = [
      {
        role: "system",
        content: prompt.systemPrompt,
      },
      {
        role: "user",
        content: prompt.userPrompt,
      },
    ];

    // Add chat history context if available
    if (input.chatHistory && input.chatHistory.length > 0) {
      const contextMessages = this.buildContextFromHistory(input.chatHistory);
      messages.splice(1, 0, ...contextMessages);
    }

    const response = await this.callOllamaModel(messages);

    return this.parseDataAnalysisResponse(response, input);
  }

  private async performGeneralChat(input: LaneCInput): Promise<LaneCOutput> {
    this.logger.log(
      "Performing general chat (may use structured raw data as context)",
    );

    const prompt = this.buildGeneralChatPrompt(input);

    // Try to recover previously emitted RAW data from chat history,
    // otherwise fall back to current input.rawData (truncated).
    const rawBlockFromHistory = this.extractRawBlockFromHistory(
      input.chatHistory || [],
    );
    let rawContext: string | undefined = rawBlockFromHistory;

    if (!rawContext && input.rawData?.rawJson) {
      const jsonStr = this.safeStringifyTruncated(
        input.rawData.rawJson,
        LaneCService.RAW_MAX_CHARS,
      );
      rawContext = `${LaneCService.RAW_BEGIN}\n\`\`\`json\n${jsonStr}\n\`\`\`\n${LaneCService.RAW_END}`;
    }

    // Build final user prompt that grounds on raw data (if available)
    const groundedUserPrompt = rawContext
      ? `${prompt.userPrompt}

Use only the information contained in the following previously returned raw data. Do not fabricate fields. If the raw data is insufficient, state the limitation clearly.

${rawContext}`
      : prompt.userPrompt;

    const messages: OllamaChatRequest["messages"] = [
      { role: "system", content: prompt.systemPrompt },
      { role: "user", content: groundedUserPrompt },
    ];

    // Add chat history for continuity (excluding large RAW blocks to avoid duplication)
    if (input.chatHistory && input.chatHistory.length > 0) {
      const contextMessages = this.buildContextFromHistory(input.chatHistory);
      messages.splice(1, 0, ...contextMessages);
    }

    const response = await this.callOllamaModel(messages);

    return this.parseGeneralChatResponse(response, input);
  }

  private buildDataAnalysisPrompt(input: LaneCInput): DataAnalysisPrompt {
    const rawDataStr = JSON.stringify(input.rawData.rawJson, null, 2);

    return {
      systemPrompt: `You are an expert data analyst with deep knowledge of software development, project management, and technical systems.

Your task is to analyze structured data and provide actionable insights. You have access to raw JSON data from various sources (JIRA tickets, documentation, metrics, etc.).

Guidelines for analysis:
1. **Be specific and actionable** - Reference actual data points, not generalities
2. **Identify patterns and trends** - Look for recurring issues, common blockers, or success patterns
3. **Provide context** - Explain why certain patterns matter
4. **Suggest concrete next steps** - Don't just identify problems, propose solutions
5. **Be confident but realistic** - Base confidence on data quality and completeness
6. **Consider stakeholder impact** - Think about effects on users, developers, and business

Always structure your response with:
- **Key Findings**: What stands out in the data
- **Analysis**: Deeper insights and patterns
- **Recommendations**: Specific, actionable suggestions
- **Risk Assessment**: Potential issues or concerns
- **Confidence Level**: How reliable your analysis is

Use the raw data provided to back up all your statements.`,
      userPrompt: `Please analyze this data in response to the user's query:

**User Query:** ${input.userQuery}

**Raw Data:**
\`\`\`json
${rawDataStr}
\`\`\`

**Context:** This appears to be ${input.context.detectedIntent.replace("_", " ")} data with ${input.context.confidence * 100}% confidence in detection.

Provide a comprehensive analysis following the guidelines above.`,
    };
  }

  private buildGeneralChatPrompt(input: LaneCInput): GeneralChatPrompt {
    return {
      systemPrompt: `You are a helpful AI assistant with expertise in software development, project management, and technical systems.

You are currently in general conversation mode because no structured data was available for analysis. Be helpful, informative, and engaging while staying within your areas of expertise.

Guidelines:
1. **Be conversational but professional** - Friendly yet informative
2. **Stay on topic** - Focus on software development, tech, and related domains
3. **Ask clarifying questions** - If the query is ambiguous
4. **Provide practical advice** - When appropriate
5. **Admit limitations** - If you're unsure about something
6. **Be encouraging** - Especially for learning and problem-solving

If this seems like it should be a structured data query, suggest how to phrase it better for data analysis.`,
      userPrompt: `User query: ${input.userQuery}

${input.context ? `Context: This was classified as ${input.context.detectedIntent.replace("_", " ")} with ${input.context.confidence * 100}% confidence.` : ""}

Please provide a helpful response to this query.`,
    };
  }

  private buildContextFromHistory(
    chatHistory: ChatMessage[],
  ): OllamaChatRequest["messages"] {
    // Take the last 6 messages (3 pairs) for context
    const recentHistory = chatHistory.slice(-6);

    return recentHistory.map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    }));
  }

  // Extract previously emitted RAW block from history if present
  private extractRawBlockFromHistory(
    chatHistory: ChatMessage[],
  ): string | undefined {
    try {
      const assistantMsgs = chatHistory
        .filter((m) => m.role === "assistant" && typeof m.content === "string")
        .map((m) => m.content);
      for (let i = assistantMsgs.length - 1; i >= 0; i--) {
        const c = assistantMsgs[i];
        const start = c.indexOf(LaneCService.RAW_BEGIN);
        const end = c.indexOf(LaneCService.RAW_END);
        if (start !== -1 && end !== -1 && end > start) {
          return c.slice(start, end + LaneCService.RAW_END.length);
        }
      }
    } catch {}
    return undefined;
  }

  // Safe JSON stringify with truncation protection
  private safeStringifyTruncated(obj: any, maxChars: number): string {
    try {
      const s = JSON.stringify(obj, null, 2);
      if (s.length <= maxChars) return s;
      const head = s.slice(0, Math.floor(maxChars * 0.6));
      const tail = s.slice(-Math.floor(maxChars * 0.35));
      return `${head}\n/* ... truncated ... */\n${tail}`;
    } catch (e: any) {
      return String(obj);
    }
  }

  // Emit raw data response without calling the model
  private emitRawDataResponse(input: LaneCInput): LaneCOutput {
    const pretty = this.safeStringifyTruncated(
      input.rawData?.rawJson ?? {},
      LaneCService.RAW_MAX_CHARS,
    );

    const body = `${LaneCService.RAW_BEGIN}
\`\`\`json
${pretty}
\`\`\`
${LaneCService.RAW_END}`;

    return {
      analysis: body,
      insights: [],
      recommendations: [],
      confidence: 0.9,
      mode: "raw_data",
    };
  }

  private async callOllamaModel(
    messages: OllamaChatRequest["messages"],
  ): Promise<string> {
    // Detect which endpoint style we are calling
    const isGenerate = /\/api\/generate\b/i.test(this.config.ollamaUrl);
    const mode = isGenerate ? "generate" : "chat";
    this.logger.debug(
      `Calling Ollama (${mode}) model ${this.config.modelName} at ${this.config.ollamaUrl}`,
    );

    // Helper: convert chat messages → single prompt for /api/generate
    const buildPromptFromMessages = (
      msgs: OllamaChatRequest["messages"],
    ): string => {
      let system = "";
      const parts: string[] = [];
      for (const m of msgs) {
        if (m.role === "system") {
          system = m.content;
          continue;
        }
        const role = m.role === "assistant" ? "Assistant" : "User";
        parts.push(`${role}:\n${m.content}`);
      }
      const header = system ? `System:\n${system}\n\n` : "";
      return `${header}${parts.join("\n\n")}`.trim();
    };

    try {
      let response: Response;

      if (isGenerate) {
        // /api/generate expects: { model, prompt, stream }
        const prompt = buildPromptFromMessages(messages);
        const body = {
          model: this.config.modelName,
          prompt,
          stream: false,
          options: {
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
          },
        };
        response = await fetch(this.config.ollamaUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        // /api/chat expects: { model, messages, stream }
        const body: OllamaChatRequest = {
          model: this.config.modelName,
          messages,
          stream: false,
          options: {
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
          },
        };
        response = await fetch(this.config.ollamaUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!response.ok) {
        throw new Error(
          `Ollama API error: ${response.status} ${response.statusText}`,
        );
      }

      const data: any = await response.json();

      // Accept both chat and generate shapes
      const content =
        data?.message?.content ??
        (typeof data?.response === "string" ? data.response : undefined);

      if (typeof content === "string" && content.trim().length > 0) {
        return content.trim();
      }

      // If response shape is unexpected, include a small snippet for diagnostics
      const snippet = JSON.stringify(data)?.slice(0, 300);
      throw new Error(
        `Unexpected Ollama response shape (mode=${mode}). Snippet: ${snippet}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to call Ollama model: ${error.message}`);
      throw error;
    }
  }

  private parseDataAnalysisResponse(
    response: string,
    input: LaneCInput,
  ): LaneCOutput {
    // Extract insights and recommendations from the response
    const insights = this.extractInsights(response);
    const recommendations = this.extractRecommendations(response);
    const confidence = this.calculateConfidence(response, input);

    return {
      analysis: response,
      insights,
      recommendations,
      confidence,
      mode: "data_analysis",
    };
  }

  private parseGeneralChatResponse(
    response: string,
    input: LaneCInput,
  ): LaneCOutput {
    return {
      analysis: response,
      insights: [],
      recommendations: [],
      confidence: 0.8, // General chat has reasonable confidence
      mode: "general_chat",
    };
  }

  private extractInsights(response: string): string[] {
    const insights: string[] = [];

    // Look for common patterns in analysis responses
    const patterns = [
      /key finding[s]?:?\s*(.*?)(?=\n\n|\*\*|$)/gi,
      /analysis:?\s*(.*?)(?=\n\n|\*\*|$)/gi,
      /insight[s]?:?\s*(.*?)(?=\n\n|\*\*|$)/gi,
      /(?:•|\-|\*)\s*(.*?)(?=\n|$)/g,
    ];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const insight = match[1].trim();
        if (insight.length > 10) {
          // Only meaningful insights
          insights.push(insight);
        }
      }
    });

    return insights.slice(0, 5); // Limit to 5 insights
  }

  private extractRecommendations(response: string): string[] {
    const recommendations: string[] = [];

    // Look for recommendation patterns
    const patterns = [
      /recommendation[s]?:?\s*(.*?)(?=\n\n|\*\*|$)/gi,
      /next step[s]?:?\s*(.*?)(?=\n\n|\*\*|$)/gi,
      /suggestion[s]?:?\s*(.*?)(?=\n\n|\*\*|$)/gi,
      /action item[s]?:?\s*(.*?)(?=\n\n|\*\*|$)/gi,
    ];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const recommendation = match[1].trim();
        if (recommendation.length > 10) {
          recommendations.push(recommendation);
        }
      }
    });

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  private calculateConfidence(response: string, input: LaneCInput): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on data quality
    if (input.rawData?.rawJson) {
      confidence += 0.2; // Has raw data
    }

    // Increase confidence based on response quality indicators
    if (response.includes("data") || response.includes("analysis")) {
      confidence += 0.2;
    }

    if (response.includes("specific") || response.includes("based on")) {
      confidence += 0.1;
    }

    // Context confidence
    if (input.context?.confidence) {
      confidence += input.context.confidence * 0.2;
    }

    return Math.min(confidence, 0.95); // Cap at 95%
  }

  private createFallbackResponse(
    input: LaneCInput,
    errorMessage: string,
  ): LaneCOutput {
    return {
      analysis: `I encountered an issue while processing your request: ${errorMessage}. However, I can still help with general questions about software development, project management, or technical topics.`,
      insights: ["Unable to analyze data due to processing error"],
      recommendations: [
        "Try rephrasing your query",
        "Check if the data source is available",
      ],
      confidence: 0.3,
      mode: "general_chat",
    };
  }
}
