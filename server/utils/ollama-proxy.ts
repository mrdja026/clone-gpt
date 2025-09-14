import http from "http";
import fs from "fs";

export type OllamaProxyStatus = {
  active: boolean;
  baseUrl: string;
  checkedModel: string;
  targetHost?: string | null;
  note?: string | null;
};

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
let lastStatus: OllamaProxyStatus = {
  active: false,
  baseUrl: process.env.OPENAI_BASE_URL || "",
  checkedModel: process.env.MODEL_NAME || "",
  targetHost: null,
  note: "not-initialized",
};

export function getOllamaProxyStatus(): OllamaProxyStatus {
  return { ...lastStatus };
}

export function getEffectiveOllamaBaseUrl(): string {
  const envBase = process.env.OPENAI_BASE_URL || "http://127.0.0.1:11434/v1";
  // If the proxy is active, keep using 127.0.0.1 base
  if (lastStatus.active) return envBase;
  // If port binding failed due to EADDRINUSE or base was localhost, try direct Windows host IP
  const note = lastStatus.note || "";
  const winIp = process.env.WINDOWS_OLLAMA_HOST_IP || "";
  const ipOnly = winIp.replace(/^https?:\/\//, "").replace(/:\d+.*$/, "");
  if (
    ipOnly &&
    (/port-in-use-skip/.test(note) || /base-url-not-127\.0\.0\.1:11434/.test(note) || /missing/i.test(note))
  ) {
    return `http://${ipOnly}:11434/v1`;
  }
  return envBase;
}

export async function startOllamaProxyIfNeeded() {
  if (started) return;
  const baseUrl = process.env.OPENAI_BASE_URL || "";
  const modelName = process.env.MODEL_NAME || "branko:latest";
  lastStatus = { active: false, baseUrl, checkedModel: modelName, targetHost: null, note: null };
  // Only manage when targeting local 127.0.0.1:11434
  if (!/^http:\/\/127\.0\.0\.1:11434\//.test(baseUrl)) {
    lastStatus.note = "base-url-not-127.0.0.1:11434";
    return;
  }

  // If local already has desired model, do nothing
  const models = await fetchJson("http://127.0.0.1:11434/v1/models", 1500);
  if (models && Array.isArray(models.data)) {
    const has = models.data.some((m: any) => m?.id === modelName);
    if (has) {
      lastStatus.note = "local-has-model";
      return;
    }
  }

  const targetHost = detectWindowsHostIp();
  if (!targetHost) {
    lastStatus.note = "no-target-host";
    return;
  }
  lastStatus.targetHost = targetHost;

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
        lastStatus.note = "port-in-use-skip";
        console.warn("[OllamaProxy] SKIP: 127.0.0.1:11434 already in use.");
      } else {
        lastStatus.note = `start-failed:${err?.message || err}`;
        console.warn("[OllamaProxy] FAILED to start:", err?.message || err);
      }
      resolve();
    });

    server.listen(11434, "127.0.0.1", () => {
      started = true;
      lastStatus.active = true;
      lastStatus.note = "activated";
      console.log(
        `[OllamaProxy] ACTIVATED: 127.0.0.1:11434 -> ${targetHost}:11434 (missing '${modelName}' locally)`,
      );
      resolve();
    });
  });
}
