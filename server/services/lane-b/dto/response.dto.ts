import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ToolCallDto {
  @IsString()
  name: string;

  @IsOptional()
  arguments?: Record<string, any>;
}

export class LaneBResponseDto {
  @IsEnum(["tool", "chat"])
  type: "tool" | "chat";

  @IsEnum(["gemma", "matcher", "chat"])
  source: "gemma" | "matcher" | "chat";

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToolCallDto)
  tool_calls?: ToolCallDto[];

  @IsOptional()
  @IsString()
  chat?: string;
}
