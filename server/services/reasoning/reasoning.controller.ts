import { Controller, Post, Body, Get, Param, Logger } from "@nestjs/common";
import { ReasoningService } from "./reasoning.service";
import type {
  ReasoningModeRequest,
  ReasoningModeResponse,
  ReasoningContext,
  ReasoningSession,
} from "@shared/api";

@Controller("reasoning")
export class ReasoningController {
  private readonly logger = new Logger(ReasoningController.name);

  constructor(private readonly reasoningService: ReasoningService) {}

  /**
   * Start a new reasoning session
   */
  @Post("start")
  async startSession(
    @Body() context: ReasoningContext,
  ): Promise<{ sessionId: string }> {
    this.logger.log(
      `Starting reasoning session for query: ${context.originalQuery}`,
    );

    const sessionId =
      await this.reasoningService.startReasoningSession(context);

    return { sessionId };
  }

  /**
   * Send a message in reasoning mode
   */
  @Post("message")
  async sendMessage(
    @Body() request: ReasoningModeRequest,
  ): Promise<ReasoningModeResponse> {
    this.logger.log(
      `Processing reasoning message for session: ${request.sessionId}`,
    );

    return await this.reasoningService.processReasoningMessage(request);
  }

  /**
   * Get reasoning session details
   */
  @Get("session/:sessionId")
  async getSession(
    @Param("sessionId") sessionId: string,
  ): Promise<ReasoningSession | null> {
    this.logger.log(`Getting reasoning session: ${sessionId}`);

    const session = this.reasoningService.getSession(sessionId);
    return session || null;
  }

  /**
   * Health check for reasoning service
   */
  @Get("health")
  async health(): Promise<{ status: string; timestamp: number }> {
    return {
      status: "ok",
      timestamp: Date.now(),
    };
  }
}
