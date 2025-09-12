import { IsString, IsUUID, IsOptional, IsDateString } from "class-validator";
import { Tables, TablesInsert, TablesUpdate } from "../types/database.types";

export type Chat = Tables<"chats">;
export type ChatInsert = TablesInsert<"chats">;
export type ChatUpdate = TablesUpdate<"chats">;

export class CreateChatDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsUUID()
  @IsOptional()
  user_id?: string;
}

export class UpdateChatDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsUUID()
  @IsOptional()
  user_id?: string;
}
