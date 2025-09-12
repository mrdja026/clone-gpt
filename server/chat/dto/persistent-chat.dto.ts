import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ChatMessageDto } from "./chat.dto";

export class PersistentChatRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsUUID()
  chatId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsBoolean()
  autoSave?: boolean;
}

export class PersistentChatResponseDto {
  @IsString()
  message: string;

  @IsUUID()
  chatId: string;

  @IsOptional()
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class ChatHistoryRequestDto {
  @IsUUID()
  chatId: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
