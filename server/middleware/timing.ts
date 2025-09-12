import type { Request, Response, NextFunction } from "express";

/**
 * Logs latency and enforces soft SLO (< 60s) for MCP routes.
 * Adds headers: X-Request-Id (if provided), X-Response-Time-ms
 */
export function measureMcpLatency(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const start = process.hrtime.bigint();
  const sloMs = 60_000; // 60s

  function done() {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    res.setHeader("X-Response-Time-ms", durationMs.toFixed(1));

    if (durationMs > sloMs) {
      // eslint-disable-next-line no-console
      console.warn("MCP_SLO_VIOLATION", {
        path: req.path,
        method: req.method,
        durationMs: Math.round(durationMs),
      });
    } else {
      // eslint-disable-next-line no-console
      console.log("MCP_REQUEST", {
        path: req.path,
        method: req.method,
        durationMs: Math.round(durationMs),
      });
    }
  }

  res.on("finish", done);
  res.on("close", done);
  next();
}
