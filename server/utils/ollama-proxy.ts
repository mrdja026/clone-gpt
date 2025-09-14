import http from "http";
import fs from "fs";

async function fetchJson(url: string, timeoutMs = 1500): Promise<any | null> {
  return new Promise((resolve) => {
    const req = http.request(url, { method: "GET", timeout: timeoutMs }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on("end", () => {
        try {
          const text = Buffer.concat(chunks).toString("utf-8");
          const data = JSON.parse(text);
          resolve(data);
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      try { req.destroy(); } catch {}
      resolve(null);
    });
    req.end();
  });
}

function detectWindowsHostIp(): string | null {
  try {
    // WSL2 usually writes Windows host IP as nameserver in /etc/resolv.conf
    const text = fs.readFileSync("/etc/resolv.conf", "utf-8");
    const m = text.match(/nameserver\s+([0-9.]+)/);
    if (m) return m[1];
  } catch {}
  // Common fallback used in WSL bridges
  return process.env.WINDOWS_OLLAMA_HOST_IP || "192.168.128.1";
}

let started = false;

export async function startOllamaProxyIfNeeded() {
  if (started) return;
  const baseUrl = process.env.OPENAI_BASE_URL || "";
  const modelName = process.env.MODEL_NAME || "branko:latest";
  // Only manage when targeting local 127.0.0.1:11434
  if (!/^http:\/\/127\.0\.0\.1:11434\//.test(baseUrl)) return;

  // If local already has desired model, do nothing
  const models = await fetchJson("http://127.0.0.1:11434/v1/models", 1500);
  if (models && Array.isArray(models.data)) {
    const has = models.data.some((m: any) => m?.id === modelName);
    if (has) return;
  }

  const targetHost = detectWindowsHostIp();
  if (!targetHost) return;

  // Try to bind proxy on 127.0.0.1:11434 → Windows host
  await new Promise<void>((resolve) => {
    const server = http.createServer((req, res) => {
      const options = {
        hostname: targetHost,
        port: 11434,
        method: req.method,
        path: req.url,
        headers: req.headers,
      } as http.RequestOptions;

      const upstream = http.request(options, (upRes) => {
        res.writeHead(upRes.statusCode || 502, upRes.headers as any);
        upRes.pipe(res);
      });
      upstream.on("error", (err) => {
        if (!res.headersSent) res.writeHead(502, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Bad Gateway", message: err.message }));
      });
      req.pipe(upstream);
    });

    server.on("error", (err: any) => {
      // If port already in use, assume either Ollama or another proxy is running
      if (err?.code === "EADDRINUSE") {
        console.warn("[OllamaProxy] 127.0.0.1:11434 already in use; skipping proxy.");
      } else {
        console.warn("[OllamaProxy] failed to start:", err?.message || err);
      }
      resolve();
    });

    server.listen(11434, "127.0.0.1", () => {
      started = true;
      console.log(
        `[OllamaProxy] forwarding http://127.0.0.1:11434 -> http://${targetHost}:11434 (model '${modelName}' not found locally)`,
      );
      resolve();
    });
  });
}

