import http from 'http';
import { startOllamaProxyIfNeeded, getOllamaProxyStatus, getEffectiveOllamaBaseUrl } from '../server/utils/ollama-proxy';

async function main() {
  // Force local base and Windows host IP
  process.env.OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'http://127.0.0.1:11434/v1';
  process.env.MODEL_NAME = process.env.MODEL_NAME || 'branko:latest';
  process.env.WINDOWS_OLLAMA_HOST_IP = process.env.WINDOWS_OLLAMA_HOST_IP || '192.168.128.1';
  process.env.OLLAMA_PROXY_START_PORT = '11434';
  process.env.OLLAMA_PROXY_PORT_TRIES = '7';

  // Bind a dummy server on 11434 to simulate EADDRINUSE, so the proxy must pick next port
  const blocker = http.createServer((req, res) => res.end('blocker'));
  try {
    await new Promise<void>((resolve, reject) => {
      blocker.once('error', (e: any) => {
        if (e && e.code === 'EADDRINUSE') return resolve();
        reject(e);
      });
      blocker.listen(11434, '127.0.0.1', () => resolve());
    });
  } catch (e) {
    console.error('Failed to bind blocker on :11434 (non-fatal):', (e as any)?.message || e);
  }

  try {
    await startOllamaProxyIfNeeded();
    const status = getOllamaProxyStatus();
    const eff = getEffectiveOllamaBaseUrl();
    console.log(JSON.stringify({ status, effectiveBaseUrl: eff }, null, 2));
  } finally {
    try { blocker.close(); } catch {}
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
