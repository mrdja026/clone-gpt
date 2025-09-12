import { IsString, IsOptional } from "class-validator";
import { Tables, TablesInsert, TablesUpdate } from "../types/database.types";

export type QueryTemplate = Tables<"query_templates">;
export type QueryTemplateInsert = TablesInsert<"query_templates">;
export type QueryTemplateUpdate = TablesUpdate<"query_templates">;

export class CreateQueryTemplateDto {
  @IsString()
  title: string;

  @IsString()
  template: string;

  @IsString()
  category: string;
}

export class UpdateQueryTemplateDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  template?: string;

  @IsString()
  @IsOptional()
  category?: string;
}
