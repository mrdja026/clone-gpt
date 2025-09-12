import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { QueryTemplatesService } from "../services/query-templates.service";
import {
  CreateQueryTemplateDto,
  UpdateQueryTemplateDto,
} from "../entities/query-template.entity";

@Controller("query-templates")
export class QueryTemplatesController {
  constructor(private readonly queryTemplatesService: QueryTemplatesService) {}

  @Post()
  create(@Body() createQueryTemplateDto: CreateQueryTemplateDto) {
    return this.queryTemplatesService.create(createQueryTemplateDto);
  }

  @Get()
  findAll(@Query("category") category?: string) {
    if (category) {
      return this.queryTemplatesService.findByCategory(category);
    }
    return this.queryTemplatesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.queryTemplatesService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateQueryTemplateDto: UpdateQueryTemplateDto,
  ) {
    return this.queryTemplatesService.update(id, updateQueryTemplateDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.queryTemplatesService.remove(id);
  }
}
