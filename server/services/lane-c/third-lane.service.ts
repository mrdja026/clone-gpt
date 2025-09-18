import { Injectable, Logger } from "@nestjs/common";
import { ThirdLaneOrchestrator } from "./lane-c.orchestrator";
import { ThirdLaneRequest, ThirdLaneResponse, ChatMessage } from "@shared/api";

@Injectable()
export class ThirdLaneService {
  private readonly logger = new Logger(ThirdLaneService.name);

  constructor(private readonly orchestrator: ThirdLaneOrchestrator) {
    this.logger.log("ThirdLaneService initialized");
  }

  /**
   * Process a user query through the Third Lane architecture
   */
  async processQuery(request: ThirdLaneRequest): Promise<ThirdLaneResponse> {
    this.logger.log(`Processing Third Lane query: ${request.userQuery}`);

    const orchestrator = this.orchestrator;
    if (!orchestrator || typeof orchestrator.processQuery !== "function") {
      this.logger.error(
        "ThirdLaneOrchestrator is not available or improperly injected",
      );
      throw new Error("Third Lane orchestrator unavailable");
    }

    try {
      const response = await orchestrator.processQuery(request);
      this.logger.log(
        `Third Lane processing completed. Mode: ${response.mode}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`Third Lane processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process a query with chat history context
   */
  async processQueryWithHistory(
    userQuery: string,
    chatHistory: ChatMessage[],
    chatId?: string,
  ): Promise<ThirdLaneResponse> {
    const request: ThirdLaneRequest = {
      userQuery,
      chatId,
      chatHistory,
    };

    return this.processQuery(request);
  }

  /**
   * Simple query processing without chat context
   */
  async processSimpleQuery(userQuery: string): Promise<ThirdLaneResponse> {
    const request: ThirdLaneRequest = {
      userQuery,
    };

    return this.processQuery(request);
  }

  /**
   * Health check for the Third Lane system
   */
  async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      // Test basic functionality with a simple query
      const testResponse = await this.processSimpleQuery("Hello");

      return {
        status: "healthy",
        message: `Third Lane is operational. Last test mode: ${testResponse.mode}`,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        message: `Third Lane error: ${error.message}`,
      };
    }
  }
}
