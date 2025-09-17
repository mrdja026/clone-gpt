import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LaneCService } from "./lane-c.service";
import { ThirdLaneOrchestrator } from "./lane-c.orchestrator";
import { ThirdLaneService } from "./third-lane.service";
import { ThirdLaneController } from "./third-lane.controller";
import { LaneBModule } from "../lane-b/lane-b.module";

@Module({
  imports: [forwardRef(() => LaneBModule)],
  controllers: [ThirdLaneController],
  providers: [LaneCService, ThirdLaneOrchestrator, ThirdLaneService],
  exports: [LaneCService, ThirdLaneOrchestrator, ThirdLaneService],
})
export class LaneCModule {}
