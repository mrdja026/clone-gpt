import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  LaneAOutput,
  LaneBOutput,
  LaneCInput,
  LaneCOutput,
  ThirdLaneRequest,
  ThirdLaneResponse,
  ChatMessage,
} from "@shared/api";
import { LaneBService } from "../lane-b/lane-b.service";
import { LaneCService } from "./lane-c.service";

@Injectable()
export class ThirdLaneOrchestrator {
  private readonly logger = new Logger(ThirdLaneOrchestrator.name);

  constructor(
    private configService: ConfigService,
    private laneBService: LaneBService,
    private laneCService: LaneCService,
  ) {
    this.logger.log("ThirdLaneOrchestrator initialized");
  }

  /**
   * Main orchestration method that processes queries through the three lanes
   */
  async processQuery(request: ThirdLaneRequest): Promise<ThirdLaneResponse> {
    this.logger.log(`Processing Third Lane query: ${request.userQuery}`);

    try {
      // Phase 1: Lane A - Intent Detection (using Lane B's existing logic)
      const laneAOutput = await this.processLaneA(request.userQuery);
      this.logger.log(
        `Lane A detected intent: ${laneAOutput.detectedIntent} (${laneAOutput.confidence})`,
      );

      // Phase 2: Lane B - Data Acquisition
      const laneBOutput = await this.processLaneB(laneAOutput);
      this.logger.log(`Lane B status: ${laneBOutput.metadata.status}`);

      // Phase 3: Lane C - Intelligent Analysis
      const laneCInput: LaneCInput = {
        rawData: laneBOutput,
        userQuery: request.userQuery,
        context: laneAOutput,
        chatHistory: request.chatHistory,
      };

      const laneCOutput = await this.laneCService.processAnalysis(laneCInput);
      this.logger.log(
        `Lane C mode: ${laneCOutput.mode}, confidence: ${laneCOutput.confidence}`,
      );

      // Format final response
      return this.formatResponse(laneCOutput, laneBOutput, request.chatId);
    } catch (error) {
      this.logger.error(`Error in Third Lane processing: ${error.message}`);
      return this.createErrorResponse(error.message, request.chatId);
    }
  }

  /**
   * Lane A: Intent Detection using the existing Lane B fuzzy matching
   */
  private async processLaneA(userQuery: string): Promise<LaneAOutput> {
    this.logger.debug("Processing Lane A - Intent Detection");

    try {
      const laneBResult = await this.laneBService.processQuery(userQuery);

      // Convert Lane B result to Lane A output
      return this.convertLaneBToLaneA(laneBResult, userQuery);
    } catch (error) {
      this.logger.warn(
        `Lane A processing failed, falling back to general chat: ${error.message}`,
      );
      return {
        detectedIntent: "general_chat",
        confidence: 0.3,
        rawQuery: userQuery,
      };
    }
  }

  /**
   * Lane B: Data Acquisition using MCP servers
   */
  private async processLaneB(laneAOutput: LaneAOutput): Promise<LaneBOutput> {
    this.logger.debug("Processing Lane B - Data Acquisition");

    try {
      // If Lane A detected tool calls, execute them
      if (
        laneAOutput.detectedIntent === "jira_ticket" ||
        laneAOutput.detectedIntent === "search" ||
        laneAOutput.detectedIntent === "analysis"
      ) {
        const laneBResult = await this.laneBService.processQuery(
          laneAOutput.rawQuery,
        );

        if (laneBResult.tool_calls && laneBResult.tool_calls.length > 0) {
          // Execute the tool calls to get actual data
          const rawData = await this.executeToolCalls(laneBResult.tool_calls);
          return {
            rawJson: rawData,
            formattedData: JSON.stringify(rawData, null, 2),
            metadata: {
              source: laneBResult.source,
              timestamp: Date.now(),
              status: "success",
            },
          };
        }
      }

      // No tool calls or general chat - return empty data
      return {
        rawJson: {},
        formattedData: "No structured data available for this query.",
        metadata: {
          source: "none",
          timestamp: Date.now(),
          status: "success",
        },
      };
    } catch (error) {
      this.logger.error(`Lane B processing failed: ${error.message}`);
      return {
        rawJson: { error: error.message },
        formattedData: `Error fetching data: ${error.message}`,
        metadata: {
          source: "error",
          timestamp: Date.now(),
          status: "error",
        },
      };
    }
  }

  /**
   * Convert Lane B result to Lane A output format
   */
  private convertLaneBToLaneA(
    laneBResult: any,
    userQuery: string,
  ): LaneAOutput {
    // Determine intent based on Lane B result
    let detectedIntent: LaneAOutput["detectedIntent"] = "general_chat";
    let confidence = 0.5;

    if (laneBResult.tool_calls && laneBResult.tool_calls.length > 0) {
      // Has tool calls - likely structured data query
      const toolCall = laneBResult.tool_calls[0];

      if (toolCall.name === "fetch_ticket") {
        detectedIntent = "jira_ticket";
        confidence = 0.9;
      } else if (toolCall.name === "fetch_perplexity_data") {
        detectedIntent = "search";
        confidence = 0.8;
      } else {
        detectedIntent = "analysis";
        confidence = 0.7;
      }
    } else if (laneBResult.source === "matcher") {
      // Pattern matched but no tools - likely analysis
      detectedIntent = "analysis";
      confidence = 0.6;
    } else {
      // No tools found - general chat
      detectedIntent = "general_chat";
      confidence = 0.4;
    }

    return {
      detectedIntent,
      confidence,
      rawQuery: userQuery,
      ticketKey:
        detectedIntent === "jira_ticket"
          ? laneBResult.tool_calls?.[0]?.arguments?.ticketKey
          : undefined,
    };
  }

  /**
   * Execute tool calls to fetch actual data
   * This would integrate with your MCP server
   */
  private async executeToolCalls(toolCalls: any[]): Promise<any> {
    // This is a placeholder - you would integrate with your actual MCP server
    // For now, return mock data based on tool call type

    const results: any[] = [];

    for (const toolCall of toolCalls) {
      try {
        switch (toolCall.name) {
          case "fetch_ticket":
            const ticketData = await this.fetchJiraTicket(
              toolCall.arguments.ticketKey,
            );
            results.push(ticketData);
            break;

          case "fetch_perplexity_data":
            const searchData = await this.fetchPerplexityData(
              toolCall.arguments,
            );
            results.push(searchData);
            break;

          default:
            this.logger.warn(`Unknown tool call: ${toolCall.name}`);
        }
      } catch (error) {
        this.logger.error(`Tool call execution failed: ${error.message}`);
        results.push({
          error: `Failed to execute ${toolCall.name}: ${error.message}`,
        });
      }
    }

    return results.length === 1 ? results[0] : results;
  }

  /**
   * Mock JIRA ticket fetching - replace with actual MCP integration
   */
  private async fetchJiraTicket(ticketKey: string): Promise<any> {
    // This should be replaced with actual MCP server call
    this.logger.log(`Mock fetching JIRA ticket: ${ticketKey}`);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      ticket: {
        key: ticketKey,
        summary: `Mock ticket summary for ${ticketKey}`,
        status: "In Progress",
        assignee: "John Doe",
        priority: "High",
        description:
          "This is a mock ticket description. In real implementation, this would come from your JIRA MCP server.",
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      metadata: {
        fetchedAt: new Date().toISOString(),
        source: "JIRA MCP Server",
      },
    };
  }

  /**
   * Mock Perplexity data fetching - replace with actual MCP integration
   */
  private async fetchPerplexityData(args: any): Promise<any> {
    // This should be replaced with actual MCP server call
    this.logger.log(`Mock fetching Perplexity data: ${JSON.stringify(args)}`);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 150));

    return {
      search: {
        query: args.query || args.user || "general search",
        results: [
          {
            title: "Mock Search Result 1",
            content:
              "This is mock search content. In real implementation, this would come from your Perplexity MCP server.",
            url: "https://example.com/result1",
            relevance: 0.95,
          },
          {
            title: "Mock Search Result 2",
            content: "Additional mock content for demonstration purposes.",
            url: "https://example.com/result2",
            relevance: 0.87,
          },
        ],
        timestamp: new Date().toISOString(),
      },
      metadata: {
        fetchedAt: new Date().toISOString(),
        source: "Perplexity MCP Server",
      },
    };
  }

  /**
   * Format the final response from Lane C output
   */
  private formatResponse(
    laneCOutput: LaneCOutput,
    laneBOutput: LaneBOutput,
    chatId?: string,
  ): ThirdLaneResponse {
    const response: ThirdLaneResponse = {
      response: laneCOutput.analysis,
      mode: laneCOutput.mode,
      chatId,
    };

    // Include analysis details if in data analysis mode
    if (laneCOutput.mode === "data_analysis") {
      response.analysis = {
        insights: laneCOutput.insights,
        recommendations: laneCOutput.recommendations,
        confidence: laneCOutput.confidence,
      };
      response.rawData = laneBOutput;
    }

    return response;
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    errorMessage: string,
    chatId?: string,
  ): ThirdLaneResponse {
    return {
      response: `I apologize, but I encountered an error while processing your request: ${errorMessage}. Please try rephrasing your question or contact support if the issue persists.`,
      mode: "general_chat",
      chatId,
    };
  }
}
