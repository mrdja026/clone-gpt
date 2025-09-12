import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import {
  QueryTemplate,
  QueryTemplateInsert,
  CreateQueryTemplateDto,
  UpdateQueryTemplateDto,
} from "../entities/query-template.entity";

@Injectable()
export class QueryTemplatesService {
  private readonly logger = new Logger(QueryTemplatesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(): Promise<QueryTemplate[]> {
    const { data, error } = await this.supabaseService.client
      .from("query_templates")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      this.logger.error("Error fetching query templates:", error);
      throw new Error(`Failed to fetch query templates: ${error.message}`);
    }

    return data || [];
  }

  async findByCategory(category: string): Promise<QueryTemplate[]> {
    const { data, error } = await this.supabaseService.client
      .from("query_templates")
      .select("*")
      .eq("category", category)
      .order("created_at", { ascending: true });

    if (error) {
      this.logger.error("Error fetching query templates by category:", error);
      throw new Error(`Failed to fetch query templates: ${error.message}`);
    }

    return data || [];
  }

  async findOne(id: string): Promise<QueryTemplate> {
    const { data, error } = await this.supabaseService.client
      .from("query_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      this.logger.error("Error fetching query template:", error);
      throw new NotFoundException(`Query template with ID ${id} not found`);
    }

    return data;
  }

  async create(
    createQueryTemplateDto: CreateQueryTemplateDto,
  ): Promise<QueryTemplate> {
    const templateData: QueryTemplateInsert = {
      title: createQueryTemplateDto.title,
      template: createQueryTemplateDto.template,
      category: createQueryTemplateDto.category,
    };

    const { data, error } = await this.supabaseService.client
      .from("query_templates")
      .insert(templateData)
      .select()
      .single();

    if (error) {
      this.logger.error("Error creating query template:", error);
      throw new Error(`Failed to create query template: ${error.message}`);
    }

    return data;
  }

  async update(
    id: string,
    updateQueryTemplateDto: UpdateQueryTemplateDto,
  ): Promise<QueryTemplate> {
    const { data, error } = await this.supabaseService.client
      .from("query_templates")
      .update(updateQueryTemplateDto)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      this.logger.error("Error updating query template:", error);
      throw new NotFoundException(
        `Query template with ID ${id} not found or update failed`,
      );
    }

    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from("query_templates")
      .delete()
      .eq("id", id);

    if (error) {
      this.logger.error("Error deleting query template:", error);
      throw new NotFoundException(
        `Query template with ID ${id} not found or delete failed`,
      );
    }
  }
}
