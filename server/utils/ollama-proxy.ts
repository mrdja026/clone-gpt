import http from "http";
import fs from "fs";

export type OllamaProxyStatus = {
  active: boolean;
  baseUrl: string;
  checkedModel: string;
  targetHost?: string | null;
  note?: string | null;
  port?: number | null;
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
  port: null,
};

export function getOllamaProxyStatus(): OllamaProxyStatus {
  return { ...lastStatus };
}

export function getEffectiveOllamaBaseUrl(): string {
  const defaultLocal = "http://127.0.0.1:11434/v1";
  const envBase = process.env.OPENAI_BASE_URL || defaultLocal;

  // If proxy is active and a port was bound, prefer the local proxy with that port
  if (lastStatus.active && lastStatus.port) {
    return `http://127.0.0.1:${lastStatus.port}/v1`;
  }

  // If proxy did not activate (e.g., ports busy or base not local), prefer direct Windows IP if provided
  const winIp = (process.env.WINDOWS_OLLAMA_HOST_IP || "")
    .replace(/^https?:\/\//, "")
    .replace(/:\d+.*$/, "");

  if (winIp) {
    // When env base points to 127.0.0.1 but we couldn't bind a proxy, route directly to Windows IP.
    const baseIsLocal127 = /^http:\/\/127\.0\.0\.1(?::\d+)?\//.test(envBase);
    if (!lastStatus.active && baseIsLocal127) {
      return `http://${winIp}:11434/v1`;
    }
  }

  // Fallback to configured base URL (env or default local)
  return envBase;
}

export async function startOllamaProxyIfNeeded() {
  if (started) return;
  const baseUrl = process.env.OPENAI_BASE_URL || "";
  const modelName = process.env.MODEL_NAME || "branko:latest";
  lastStatus = {
    active: false,
    baseUrl,
    checkedModel: modelName,
    targetHost: null,
    note: null,
    port: null,
  };
  // Only manage when targeting local 127.0.0.1:11434
  if (!/^http:\/\/127\.0\.0\.1(?::11434)?\//.test(baseUrl)) {
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

  // Try to bind proxy on 127.0.0.1 starting at START_PORT → Windows host
  const startPort = Number(process.env.OLLAMA_PROXY_START_PORT || 11434);
  const tries = Math.max(1, Number(process.env.OLLAMA_PROXY_PORT_TRIES || 7));

  for (let i = 0; i < tries; i++) {
    const port = startPort + i;
    const ok = await new Promise<boolean>((resolve) => {
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
        if (err?.code === "EADDRINUSE") {
          // Port is in use; try next
          resolve(false);
        } else {
          // Unexpected error; log and try next port as well
          console.warn(`[OllamaProxy] FAILED to start on :${port}:`, err?.message || err);
          resolve(false);
        }
      });

      server.listen(port, "127.0.0.1", () => {
        started = true;
        lastStatus.active = true;
        lastStatus.note = i === 0 ? "activated" : `activated-alt-port:${port}`;
        lastStatus.port = port;
        console.log(
          `[OllamaProxy] ACTIVATED: 127.0.0.1:${port} -> ${targetHost}:11434 (missing '${modelName}' locally)`,
        );
        resolve(true);
      });
    });
    if (ok) return; // bound successfully
  }

  // If we reach here, we failed to bind any port in the range
  lastStatus.note = `port-range-unavailable:${startPort}..${startPort + tries - 1}`;
}
