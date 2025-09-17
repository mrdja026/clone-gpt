import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
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

  constructor(private readonly thirdLaneService: ThirdLaneService) {
    this.logger.log("ThirdLaneController initialized");
  }

  @Post("query")
  @HttpCode(HttpStatus.OK)
  async processQuery(
    @Body() queryDto: ThirdLaneQueryDto,
  ): Promise<ThirdLaneResponseDto> {
    this.logger.log(`Processing Third Lane query: ${queryDto.query}`);

    try {
      const result = await this.thirdLaneService.processQuery({
        userQuery: queryDto.query,
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
    } catch (error) {
      this.logger.error(`Third Lane query processing failed: ${error.message}`);
      throw error;
    }
  }

  @Get("health")
  async healthCheck(): Promise<ThirdLaneHealthDto> {
    this.logger.log("Third Lane health check requested");

    try {
      const health = await this.thirdLaneService.healthCheck();
      return health;
    } catch (error) {
      this.logger.error(`Third Lane health check failed: ${error.message}`);
      return {
        status: "unhealthy",
        message: `Health check error: ${error.message}`,
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
