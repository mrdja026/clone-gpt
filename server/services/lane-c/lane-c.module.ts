import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LaneCService } from "./lane-c.service";
import { ThirdLaneOrchestrator } from "./lane-c.orchestrator";
import { ThirdLaneService } from "./third-lane.service";
import { ThirdLaneController } from "./third-lane.controller";
import { LaneBModule } from "../lane-b/lane-b.module";
import { ReasoningModule } from "../reasoning/reasoning.module";
import { McpModule } from "../../mcp/mcp.module";
import { LaneBService } from "../lane-b/lane-b.service";
import { McpService } from "../../mcp/mcp.service";
import { ReasoningService } from "../reasoning/reasoning.service";

@Module({
  imports: [forwardRef(() => LaneBModule), ReasoningModule, McpModule],
  controllers: [ThirdLaneController],
  providers: [
    LaneCService,
    {
      provide: ThirdLaneOrchestrator,
      useFactory: (
        configService: ConfigService,
        laneB: LaneBService,
        laneC: LaneCService,
        mcp: McpService,
        reasoning: ReasoningService,
      ) =>
        new ThirdLaneOrchestrator(configService, laneB, laneC, mcp, reasoning),
      inject: [
        ConfigService,
        LaneBService,
        LaneCService,
        McpService,
        ReasoningService,
      ],
    },
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
