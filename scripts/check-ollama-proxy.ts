import 'dotenv/config';
// Use explicit .ts extension for Node --experimental-strip-types ESM resolver
import { startOllamaProxyIfNeeded, getOllamaProxyStatus, getEffectiveOllamaBaseUrl } from '../server/utils/ollama-proxy.ts';

async function main() {
  try {
    await startOllamaProxyIfNeeded();
  } catch (e) {
    console.warn('[check-ollama-proxy] start skipped:', (e as any)?.message || e);
  }

  const status = getOllamaProxyStatus();
  const effective = getEffectiveOllamaBaseUrl();

  const out = {
    effectiveBaseUrl: effective,
    ollamaProxy: status,
    env: {
      OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || '',
      MODEL_NAME: process.env.MODEL_NAME || '',
      WINDOWS_OLLAMA_HOST_IP: process.env.WINDOWS_OLLAMA_HOST_IP || '',
      OLLAMA_PROXY_START_PORT: process.env.OLLAMA_PROXY_START_PORT || '11434',
      OLLAMA_PROXY_PORT_TRIES: process.env.OLLAMA_PROXY_PORT_TRIES || '7',
    },
    time: new Date().toISOString(),
  };

  console.log(JSON.stringify(out, null, 2));
}

main();
