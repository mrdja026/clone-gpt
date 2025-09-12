import { IsString, IsUUID, IsIn } from "class-validator";
import { Tables, TablesInsert, TablesUpdate } from "../types/database.types";

export type Message = Tables<"messages">;
export type MessageInsert = TablesInsert<"messages">;
export type MessageUpdate = TablesUpdate<"messages">;

export class CreateMessageDto {
  @IsUUID()
  chat_id: string;

  @IsString()
  content: string;

  @IsString()
  @IsIn(["user", "assistant"])
  role: "user" | "assistant";
}

export class UpdateMessageDto {
  @IsString()
  content?: string;

  @IsString()
  @IsIn(["user", "assistant"])
  role?: "user" | "assistant";
}
