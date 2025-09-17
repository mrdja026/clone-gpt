import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  LaneBResult,
  SUPPORTED_TOOLS,
  QUERY_PATTERNS,
} from "./types/lane-b.types";

@Injectable()
export class LaneBService {
  private readonly logger = new Logger(LaneBService.name);

  constructor(private configService: ConfigService) {
    this.logger.log(
      "LaneBService constructor called - service is being instantiated",
    );
  }

  private buildPrompt(userQuery: string): string {
    return `
<|im_start|>system
You are a helpful assistant that can call functions.
<|im_end|>
<|im_start|>user
${userQuery}
<|im_end|>
<|im_start|>tools
${JSON.stringify(SUPPORTED_TOOLS, null, 2)}
<|im_end|>
<|im_start|>assistant
`;
  }

  private queryMatcherFallback(userQuery: string): LaneBResult {
    const { JIRA_KEY, SPACE, USER } = QUERY_PATTERNS;

    // Jira ticket pattern
    if (JIRA_KEY.test(userQuery)) {
      const ticketKey = userQuery.match(JIRA_KEY)?.[0];
      if (ticketKey) {
        return {
          tool_calls: [
            {
              name: "fetch_ticket",
              arguments: { ticketKey },
            },
          ],
          source: "matcher",
        };
      }
    }

    // Space pattern
    if (SPACE.test(userQuery)) {
      const spaceId = userQuery.match(SPACE)?.[1];
      if (spaceId) {
        return {
          tool_calls: [
            {
              name: "fetch_perplexity_data",
              arguments: { space_id: spaceId },
            },
          ],
          source: "matcher",
        };
      }
    }

    // User pattern
    if (USER.test(userQuery)) {
      const user = userQuery.match(USER)?.[1];
      if (user) {
        return {
          tool_calls: [
            {
              name: "fetch_perplexity_data",
              arguments: { user },
            },
          ],
          source: "matcher",
        };
      }
    }

    return { tool_calls: [], source: "matcher" };
  }

  private async callOllama(prompt: string): Promise<string> {
    const ollamaUrl = this.configService.get<string>(
      "OLLAMA_URL",
      "http://localhost:11434/api/generate",
    );
    const model = this.configService.get<string>(
      "GEMMA_MODEL",
      "gemma-fc-test:latest",
    );

    this.logger.debug(`Calling Ollama at ${ollamaUrl} with model ${model}`);

    try {
      const response = await fetch(ollamaUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Ollama API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      return data.response?.trim() || "";
    } catch (error) {
      this.logger.error(`Failed to call Ollama: ${error.message}`);
      throw error;
    }
  }

  async processQuery(userQuery: string): Promise<LaneBResult> {
    this.logger.log(`Processing query: ${userQuery}`);

    try {
      const prompt = this.buildPrompt(userQuery);
      const rawResponse = await this.callOllama(prompt);

      this.logger.debug(`Raw Ollama response: ${rawResponse}`);

      // Clean up response (remove "Function call:" prefix if present)
      let candidate = rawResponse.replace(/^Function call:\s*/i, "").trim();

      // Try to parse as JSON
      try {
        const parsed = JSON.parse(candidate);
        this.logger.log("Successfully parsed Gemma response as tool call");
        return {
          tool_calls: [parsed],
          source: "gemma",
        };
      } catch (parseError) {
        this.logger.warn(
          `Failed to parse Gemma response as JSON: ${parseError.message}`,
        );

        // Fall back to query matcher
        const matcherResult = this.queryMatcherFallback(userQuery);

        if (matcherResult.tool_calls.length > 0) {
          this.logger.log("Using matcher fallback for deterministic query");
          return matcherResult;
        } else {
          this.logger.log("No tool calls found, treating as chat response");
          return {
            tool_calls: [],
            source: "chat",
            chat: rawResponse,
          };
        }
      }
    } catch (error) {
      this.logger.error(`Error processing query: ${error.message}`);

      // Final fallback to matcher
      const matcherResult = this.queryMatcherFallback(userQuery);

      if (matcherResult.tool_calls.length > 0) {
        return matcherResult;
      }

      // If nothing matches, return as chat
      return {
        tool_calls: [],
        source: "chat",
        chat: `I'm sorry, I couldn't process your query: ${userQuery}`,
      };
    }
  }
}
