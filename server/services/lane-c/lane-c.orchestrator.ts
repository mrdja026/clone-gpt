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
  ReasoningContext,
} from "@shared/api";
import { LaneBService } from "../lane-b/lane-b.service";
import { LaneCService } from "./lane-c.service";
import { ReasoningService } from "../reasoning/reasoning.service";
import { McpService } from "../../mcp/mcp.service";

@Injectable()
export class ThirdLaneOrchestrator {
  private readonly logger = new Logger(ThirdLaneOrchestrator.name);

  constructor(
    private configService: ConfigService,
    private laneBService: LaneBService,
    private laneCService: LaneCService,
    private mcpService: McpService,
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
      return this.formatResponse(
        laneCOutput,
        laneBOutput,
        request.chatId,
        laneAOutput,
        request.userQuery,
      );
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
   * Execute tool calls using actual MCP service
   * Integrates with barebone MCP server for real data
   */
  private async executeToolCalls(toolCalls: any[]): Promise<any> {
    this.logger.log(`Executing ${toolCalls.length} tool calls via MCP service`);
    const results: any[] = [];

    for (const toolCall of toolCalls) {
      try {
        this.logger.log(
          `Calling MCP tool: ${toolCall.name} with args: ${JSON.stringify(toolCall.arguments)}`,
        );

        // Use actual MCP service instead of mock data
        const result = await this.mcpService.callTool(
          toolCall.name,
          toolCall.arguments,
        );

        this.logger.log(`MCP tool ${toolCall.name} completed successfully`);
        results.push(result);
      } catch (error) {
        this.logger.error(
          `MCP tool call failed: ${toolCall.name} - ${error.message}`,
        );
        results.push({
          error: `Failed to execute ${toolCall.name}: ${error.message}`,
          toolName: toolCall.name,
          arguments: toolCall.arguments,
        });
      }
    }

    return results.length === 1 ? results[0] : results;
  }

  /**
   * Format the final response from Lane C output
   */
  private formatResponse(
    laneCOutput: LaneCOutput,
    laneBOutput: LaneBOutput,
    chatId?: string,
    laneAOutput?: LaneAOutput,
    userQuery?: string,
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

    // Add reasoning context for transitioning to reasoning mode
    if (
      laneAOutput &&
      userQuery &&
      (laneCOutput.mode === "data_analysis" ||
        laneBOutput.metadata.status === "success")
    ) {
      const sessionId = ReasoningService.generateSessionId();
      response.reasoningContext = {
        originalQuery: userQuery,
        combinedData: {
          laneAOutput,
          laneBOutput,
          laneCOutput,
        },
        timestamp: Date.now(),
        sessionId,
      };
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
