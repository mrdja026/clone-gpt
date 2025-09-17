import { IsString, IsOptional, IsObject } from "class-validator";

export class LaneBQueryDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}
