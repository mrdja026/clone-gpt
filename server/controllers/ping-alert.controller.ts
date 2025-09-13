import { Body, Controller, Get, Post } from "@nestjs/common";
import fs from "fs";
import { spawn } from "child_process";

interface PingBody {
  message?: string;
  noAudio?: boolean;
}

@Controller()
export class PingAlertController {
  private getScriptPath() {
    return (
      process.env.PING_ALERT_SCRIPT ||
      "/home/mrdjan/event-codex/tools/ping-alert.sh"
    );
  }

  @Get("ping-alert")
  testPing(): { status: string } {
    this.tryPing({ message: "Ping test via GET", noAudio: true });
    return { status: "ok" };
  }

  @Post("ping-alert")
  doPing(@Body() body: PingBody): { status: string } {
    this.tryPing(body || {});
    return { status: "ok" };
  }

  private tryPing({ message, noAudio }: PingBody) {
    const script = this.getScriptPath();
    const args = [] as string[];
    if (noAudio) args.push("--no-audio");
    const msg = message && message.trim().length > 0 ? message : "Prompt completed";
    args.push(msg);

    try {
      if (fs.existsSync(script)) {
        const child = spawn(script, args, { stdio: "ignore", shell: false });
        child.on("error", () => {
          // Fallback to terminal bell
          try {
            process.stdout.write("\x07");
          } catch {}
        });
        // No need to wait; fire-and-forget
        return;
      }
    } catch {}
    // Fallback if script missing or not executable
    try {
      process.stdout.write("\x07");
    } catch {}
  }
}

