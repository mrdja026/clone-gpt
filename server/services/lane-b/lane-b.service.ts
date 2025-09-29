import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  LaneBResult,
  SUPPORTED_TOOLS,
  QUERY_PATTERNS,
} from "./types/lane-b.types";

@Injectable()
export class LaneBService {
  private readonly logger = new Logger(LaneBService.name);

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
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

    const input = userQuery.toLowerCase();
    const original = userQuery.trim();

    // 1) JIRA ticket (e.g., SCRUM-42)
    if (JIRA_KEY.test(userQuery)) {
      const ticketKey = userQuery.match(JIRA_KEY)?.[0];
      if (ticketKey) {
        return {
          tool_calls: [{ name: "fetch_ticket", arguments: { ticketKey } }],
          source: "matcher",
        };
      }
    }

    // 2) Explicit project listings ("list/show/get all projects")
    if (
      /\b(list|show|get)\b.*\bprojects\b/.test(input) ||
      /\ball\s+projects\b/.test(input)
    ) {
      return {
        tool_calls: [
          {
            name: "search_jira_projects",
            arguments: { status: "live", maxResults: 25 },
          },
        ],
        source: "matcher",
      };
    }

    // 3) Specific project lookup ("project WEB") — avoid matching "project tree <KEY>"
    {
      const m = original.match(
        /\bproject\s+(?!tree\b)([A-Za-z][A-Za-z0-9-]+)\b/,
      );
      if (m) {
        const projectKey = m[1].toUpperCase();
        return {
          tool_calls: [
            {
              name: "search_jira_projects",
              arguments: { query: projectKey, status: "live", maxResults: 10 },
            },
          ],
          source: "matcher",
        };
      }
    }

    // 4) Boards listing (global or for project)
    if (/\b(list|show|get|find)\b.*\bboards\b/.test(input)) {
      // Project-scoped boards: "boards in/for/of <KEY>"
      const pm = original.match(
        /\bboards?\s+(?:in|for|of)\s+([A-Za-z][A-Za-z0-9-]+)\b/i,
      );
      const args: Record<string, any> = {
        includeConfig: true,
        includeActiveSprints: true,
        includeProjects: true,
        maxResults: 10,
      };
      if (pm) args.projectKeyOrId = pm[1].toUpperCase();
      return {
        tool_calls: [{ name: "search_jira_boards", arguments: args }],
        source: "matcher",
      };
    }

    // 5) Projects with boards (combined)
    if (/\bprojects?\b/.test(input) && /\bboards?\b/.test(input)) {
      return {
        tool_calls: [
          {
            name: "search_projects_with_boards",
            arguments: { includeConfig: true, includeActiveSprints: true },
          },
        ],
        source: "matcher",
      };
    }

    // 6) Project tree <KEY>
    {
      const tm = original.match(
        /\bproject\s+tree\s+([A-Za-z][A-Za-z0-9-]+)\b/i,
      );
      if (tm) {
        const projectKeyOrId = tm[1].toUpperCase();
        return {
          tool_calls: [
            {
              name: "fetch_jira_project_tree",
              arguments: { projectKeyOrId, pageSize: 100 },
            },
          ],
          source: "matcher",
        };
      }
    }

    // 6b) List issues for project ("list all issues for <KEY>")
    {
      const im = original.match(
        /\b(list|show|get)\b.*\bissues?\b.*\b(for|in|of)\b\s+([A-Za-z][A-Za-z0-9-]+)\b/i,
      );
      if (im) {
        const projectKeyOrId = im[3].toUpperCase();
        return {
          tool_calls: [
            {
              name: "fetch_jira_project_tree",
              arguments: { projectKeyOrId, pageSize: 200 },
            },
          ],
          source: "matcher",
        };
      }
    }

    // 7) Perplexity space/user (existing patterns)
    if (SPACE.test(userQuery)) {
      const spaceId = userQuery.match(SPACE)?.[1];
      if (spaceId) {
        return {
          tool_calls: [
            { name: "fetch_perplexity_data", arguments: { space_id: spaceId } },
          ],
          source: "matcher",
        };
      }
    }
    if (USER.test(userQuery)) {
      const user = userQuery.match(USER)?.[1];
      if (user) {
        return {
          tool_calls: [{ name: "fetch_perplexity_data", arguments: { user } }],
          source: "matcher",
        };
      }
    }

    return { tool_calls: [], source: "matcher" };
  }

  private async callOllama(prompt: string): Promise<string> {
    const laneAHost = "127.0.0.1:124/v1";
    const ollamaUrl = this.configService.get<string>(
      "OPENAI_BASE_URL",
      `http://${laneAHost}/api/generate`,
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
          stream: true,
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
          throw new Error("No tool calls found, treating as chat response");
          return {
            //TODO potential missmatch when to go into discussion mode
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
