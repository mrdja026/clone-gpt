import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LaneCService } from "./lane-c.service";
import { ThirdLaneOrchestrator } from "./lane-c.orchestrator";
import { ThirdLaneService } from "./third-lane.service";
import { ThirdLaneController } from "./third-lane.controller";
import { LaneBModule } from "../lane-b/lane-b.module";
import { ReasoningModule } from "../reasoning/reasoning.module";
import { McpModule } from "../../mcp/mcp.module";

@Module({
  imports: [forwardRef(() => LaneBModule), ReasoningModule, McpModule],
  controllers: [ThirdLaneController],
  providers: [
    LaneCService,
    ThirdLaneOrchestrator,
    {
      provide: ThirdLaneService,
      useFactory: (orchestrator: ThirdLaneOrchestrator) =>
        new ThirdLaneService(orchestrator),
      inject: [ThirdLaneOrchestrator],
    },
  ],
  exports: [ThirdLaneService],
})
export class LaneCModule {}
