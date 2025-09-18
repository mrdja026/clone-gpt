import { Module } from "@nestjs/common";
import { ReasoningService } from "./reasoning.service";
import { ReasoningController } from "./reasoning.controller";

@Module({
  imports: [],
  controllers: [ReasoningController],
  providers: [ReasoningService],
  exports: [ReasoningService],
})
export class ReasoningModule {}
