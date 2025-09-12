import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import {
  Chat,
  ChatInsert,
  CreateChatDto,
  UpdateChatDto,
} from "../entities/chat.entity";

@Injectable()
export class ChatsService {
  private readonly logger = new Logger(ChatsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(userId?: string): Promise<Chat[]> {
    let query = this.supabaseService.client
      .from("chats")
      .select("*")
      .order("updated_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error("Error fetching chats:", error);
      throw new Error(`Failed to fetch chats: ${error.message}`);
    }

    return data || [];
  }

  async findOne(id: string, userId?: string): Promise<Chat> {
    let query = this.supabaseService.client
      .from("chats")
      .select("*")
      .eq("id", id);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.single();

    if (error) {
      this.logger.error("Error fetching chat:", error);
      throw new NotFoundException(`Chat with ID ${id} not found`);
    }

    return data;
  }

  async create(createChatDto: CreateChatDto): Promise<Chat> {
    const chatData: ChatInsert = {
      title: createChatDto.title || "New Chat",
      user_id: createChatDto.user_id || null,
    };

    const { data, error } = await this.supabaseService.client
      .from("chats")
      .insert(chatData)
      .select()
      .single();

    if (error) {
      this.logger.error("Error creating chat:", error);
      throw new Error(`Failed to create chat: ${error.message}`);
    }

    return data;
  }

  async update(
    id: string,
    updateChatDto: UpdateChatDto,
    userId?: string,
  ): Promise<Chat> {
    let query = this.supabaseService.client
      .from("chats")
      .update(updateChatDto)
      .eq("id", id);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.select().single();

    if (error) {
      this.logger.error("Error updating chat:", error);
      throw new NotFoundException(
        `Chat with ID ${id} not found or update failed`,
      );
    }

    return data;
  }

  async remove(id: string, userId?: string): Promise<void> {
    let query = this.supabaseService.client.from("chats").delete().eq("id", id);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { error } = await query;

    if (error) {
      this.logger.error("Error deleting chat:", error);
      throw new NotFoundException(
        `Chat with ID ${id} not found or delete failed`,
      );
    }
  }
}
