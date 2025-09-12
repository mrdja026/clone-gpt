import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import {
  Message,
  MessageInsert,
  CreateMessageDto,
  UpdateMessageDto,
} from "../entities/message.entity";

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async findByChatId(chatId: string): Promise<Message[]> {
    const { data, error } = await this.supabaseService.client
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) {
      this.logger.error("Error fetching messages:", error);
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    return data || [];
  }

  async findOne(id: string): Promise<Message> {
    const { data, error } = await this.supabaseService.client
      .from("messages")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      this.logger.error("Error fetching message:", error);
      throw new NotFoundException(`Message with ID ${id} not found`);
    }

    return data;
  }

  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    const messageData: MessageInsert = {
      chat_id: createMessageDto.chat_id,
      content: createMessageDto.content,
      role: createMessageDto.role,
    };

    const { data, error } = await this.supabaseService.client
      .from("messages")
      .insert(messageData)
      .select()
      .single();

    if (error) {
      this.logger.error("Error creating message:", error);
      throw new Error(`Failed to create message: ${error.message}`);
    }

    return data;
  }

  async update(
    id: string,
    updateMessageDto: UpdateMessageDto,
  ): Promise<Message> {
    const { data, error } = await this.supabaseService.client
      .from("messages")
      .update(updateMessageDto)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      this.logger.error("Error updating message:", error);
      throw new NotFoundException(
        `Message with ID ${id} not found or update failed`,
      );
    }

    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from("messages")
      .delete()
      .eq("id", id);

    if (error) {
      this.logger.error("Error deleting message:", error);
      throw new NotFoundException(
        `Message with ID ${id} not found or delete failed`,
      );
    }
  }

  async createBatch(messages: CreateMessageDto[]): Promise<Message[]> {
    const messagesData: MessageInsert[] = messages.map((msg) => ({
      chat_id: msg.chat_id,
      content: msg.content,
      role: msg.role,
    }));

    const { data, error } = await this.supabaseService.client
      .from("messages")
      .insert(messagesData)
      .select();

    if (error) {
      this.logger.error("Error creating messages:", error);
      throw new Error(`Failed to create messages: ${error.message}`);
    }

    return data || [];
  }
}
