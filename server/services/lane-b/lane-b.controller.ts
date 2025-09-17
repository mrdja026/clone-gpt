import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LaneBService } from "./lane-b.service";
import { LaneBQueryDto } from "./dto/query.dto";
import { LaneBResponseDto } from "./dto/response.dto";

@Controller("lane-b")
export class LaneBController {
  private readonly logger = new Logger(LaneBController.name);

  constructor(
    private readonly laneBService: LaneBService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log("LaneBController constructor called");
    this.logger.log("laneBService is defined:", !!this.laneBService);
  }

  @Post("query")
  @HttpCode(HttpStatus.OK)
  async processQuery(
    @Body() queryDto: LaneBQueryDto,
  ): Promise<LaneBResponseDto> {
    this.logger.log(`Processing Lane B query: ${queryDto.query}`);
    this.logger.log("About to call laneBService.processQuery");
    this.logger.log("laneBService exists:", !!this.laneBService);
    this.logger.log("laneBService type:", typeof this.laneBService);

    if (!this.laneBService) {
      this.logger.error(
        "LaneBService is null/undefined - creating fallback service!",
      );
      const fallbackService = new LaneBService(this.configService);
      const result = await fallbackService.processQuery(queryDto.query);

      const response: LaneBResponseDto = {
        type: result.tool_calls.length > 0 ? "tool" : "chat",
        source: result.source,
        tool_calls:
          result.tool_calls.length > 0 ? result.tool_calls : undefined,
        chat: result.chat,
      };

      this.logger.log(`Fallback Lane B response: ${JSON.stringify(response)}`);
      return response;
    }

    try {
      const result = await this.laneBService.processQuery(queryDto.query);

      const response: LaneBResponseDto = {
        type: result.tool_calls.length > 0 ? "tool" : "chat",
        source: result.source,
        tool_calls:
          result.tool_calls.length > 0 ? result.tool_calls : undefined,
        chat: result.chat,
      };

      this.logger.log(`Lane B response: ${JSON.stringify(response)}`);
      return response;
    } catch (error) {
      this.logger.error(`Error processing Lane B query: ${error.message}`);
      return {
        type: "chat",
        source: "chat",
        chat: `Error processing query: ${error.message}`,
      };
    }
  }
}
