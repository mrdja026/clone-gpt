import { IsString, IsOptional, IsArray, IsObject } from "class-validator";
import { ChatMessage } from "@shared/api";

export class ThirdLaneQueryDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  chatId?: string;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  chatHistory?: ChatMessage[];

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class ThirdLaneResponseDto {
  @IsString()
  response: string;

  @IsString()
  mode: "data_analysis" | "general_chat";

  @IsOptional()
  @IsObject()
  analysis?: {
    insights: string[];
    recommendations: string[];
    confidence: number;
  };

  @IsOptional()
  @IsObject()
  rawData?: any;

  @IsOptional()
  @IsString()
  chatId?: string;
}

export class ThirdLaneHealthDto {
  @IsString()
  status: "healthy" | "unhealthy";

  @IsString()
  message: string;
}
