import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Inject,
} from "@nestjs/common";
import { ThirdLaneService } from "./third-lane.service";
import {
  ThirdLaneQueryDto,
  ThirdLaneResponseDto,
  ThirdLaneHealthDto,
} from "./dto/third-lane.dto";

@Controller("third-lane")
export class ThirdLaneController {
  private readonly logger = new Logger(ThirdLaneController.name);

  constructor(
    @Inject(ThirdLaneService)
    private readonly thirdLaneService: ThirdLaneService,
  ) {
    this.logger.log("ThirdLaneController initialized");
    this.logger.log("ThirdLaneService injected:", !!this.thirdLaneService);
    this.logger.log("ThirdLaneService type:", typeof this.thirdLaneService);
  }

  @Post("query")
  @HttpCode(HttpStatus.OK)
  async processQuery(
    @Body() queryDto: ThirdLaneQueryDto & Record<string, any>,
  ): Promise<ThirdLaneResponseDto> {
    // Accept both "query" (DTO) and legacy "userQuery" (client fallback)
    const userQuery: string | undefined =
      queryDto?.query ?? queryDto?.userQuery;

    if (
      !userQuery ||
      typeof userQuery !== "string" ||
      userQuery.trim().length === 0
    ) {
      this.logger.warn(
        `Third Lane query missing or invalid: ${JSON.stringify(queryDto ?? {})}`,
      );
      throw {
        status: HttpStatus.BAD_REQUEST,
        message: "Body must include 'query' (string)",
      };
    }

    // Resolve service (no fallbacks needed under canonical DI)
    const service: ThirdLaneService | undefined = this.thirdLaneService;
    if (!service || typeof service.processQuery !== "function") {
      this.logger.error(
        "ThirdLaneService is not available or improperly injected",
      );
      throw {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Third Lane service unavailable",
      };
    }

    this.logger.log(`Processing Third Lane query: ${userQuery}`);

    try {
      const result = await service.processQuery({
        userQuery,
        chatId: queryDto.chatId,
        chatHistory: queryDto.chatHistory,
        context: queryDto.context,
      });

      const response: ThirdLaneResponseDto = {
        response: result.response,
        mode: result.mode,
        analysis: result.analysis,
        rawData: result.rawData,
        chatId: result.chatId,
      };

      this.logger.log(`Third Lane response mode: ${response.mode}`);
      return response;
    } catch (error: any) {
      this.logger.error(
        `Third Lane query processing failed: ${error?.message || String(error)}`,
      );
      throw error;
    }
  }

  @Get("health")
  async healthCheck(): Promise<ThirdLaneHealthDto> {
    this.logger.log("Third Lane health check requested");

    try {
      const health = await this.thirdLaneService.healthCheck();
      const status: "healthy" | "unhealthy" =
        health.status === "healthy" ? "healthy" : "unhealthy";
      return {
        status,
        message: health.message,
      };
    } catch (error: any) {
      this.logger.error(
        `Third Lane health check failed: ${error?.message || String(error)}`,
      );
      return {
        status: "unhealthy",
        message: `Health check error: ${error?.message || String(error)}`,
      };
    }
  }

  @Post("simple-query")
  @HttpCode(HttpStatus.OK)
  async processSimpleQuery(
    @Body() body: { query: string },
  ): Promise<ThirdLaneResponseDto> {
    this.logger.log(`Processing simple Third Lane query: ${body.query}`);

    try {
      const result = await this.thirdLaneService.processSimpleQuery(body.query);

      return {
        response: result.response,
        mode: result.mode,
        analysis: result.analysis,
        rawData: result.rawData,
        chatId: result.chatId,
      };
    } catch (error) {
      this.logger.error(`Simple query processing failed: ${error.message}`);
      throw error;
    }
  }
}
