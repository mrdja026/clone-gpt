import { Controller, Get, Logger } from "@nestjs/common";

@Controller("lane-b-test")
export class LaneBTestController {
  private readonly logger = new Logger(LaneBTestController.name);

  @Get()
  testEndpoint() {
    this.logger.log("LaneBTestController hit - basic controller working");
    return { message: "Lane B test controller is working" };
  }
}
