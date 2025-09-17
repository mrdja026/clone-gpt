import { Module } from "@nestjs/common";
import { LaneBService } from "./lane-b.service";
import { LaneBController } from "./lane-b.controller";
import { LaneBTestController } from "./lane-b-test.controller";

@Module({
  controllers: [LaneBController, LaneBTestController],
  providers: [LaneBService],
  exports: [LaneBService],
})
export class LaneBModule {}
