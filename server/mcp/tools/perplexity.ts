import { z } from "zod";

// Perplexity tool schema
export const perplexitySearchSchema = z.object({
  query: z.string(),
  system: z.string().optional(),
  recency: z.enum(["day", "week", "month", "year"]).optional(),
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
  stream: z.boolean().optional(),
  domain: z.string().optional(),
});

export type PerplexitySearchArgs = z.infer<typeof perplexitySearchSchema>;

// In-memory cache by query hash
const cache = new Map<string, any>();

// In-memory history
const history: Array<{
  ts: number;
  query: string;
  params: any;
  result: any;
}> = [];

function buildMessages(args: PerplexitySearchArgs) {
  const sys = args.system || "Be precise and concise.";
  const domainHint = args.domain
    ? ` Only use or prioritize sources from domain: ${args.domain}`
    : "";
  return [
    { role: "system", content: sys },
    { role: "user", content: `${args.query}${domainHint}` },
  ];
}

function getCacheKey(args: PerplexitySearchArgs) {
  return JSON.stringify({
    q: args.query,
    r: args.recency,
    d: args.domain,
    t: args.temperature,
    m: args.max_tokens,
  });
}

export async function callPerplexity(args: PerplexitySearchArgs) {
  const base = process.env.PERPLEXITY_API_BASE || "https://api.perplexity.ai";
  const model = process.env.PERPLEXITY_MODEL || "sonar-pro";
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY is not configured");
  }

  const body: any = {
    model,
    messages: buildMessages(args),
  };

  if (args.max_tokens) body.max_tokens = args.max_tokens;
  if (args.temperature !== undefined) body.temperature = args.temperature;
  if (args.stream) body.stream = true;
  if (args.recency) body.search_recency_filter = args.recency;

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Perplexity API error: ${res.status} ${errText}`);
  }

  return res.json();
}

export async function executePerplexitySearch(args: PerplexitySearchArgs) {
  const cacheKey = getCacheKey(args);

  // Check cache first
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    history.push({
      ts: Date.now(),
      query: args.query,
      params: args,
      result: cached,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(cached, null, 2) }],
    };
  }

  // Make the API call
  const result = await callPerplexity(args);
  cache.set(cacheKey, result);
  history.push({
    ts: Date.now(),
    query: args.query,
    params: args,
    result,
  });

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export function getPerplexityHistory() {
  return history;
}

export function getPerplexityHistoryFiltered(uri: string) {
  const parts = uri
    .replace("perplexity://history/", "")
    .split("/")
    .filter(Boolean);
  let items = history;

  if (parts.length >= 2) {
    if (parts[0] === "since" && parts[1]) {
      const since = Number(parts[1]);
      if (!Number.isNaN(since)) {
        items = history.filter((h) => h.ts >= since);
      }
    } else if (parts[0] === "last" && parts[1]) {
      const n = Number(parts[1]);
      if (!Number.isNaN(n)) {
        items = history.slice(-n);
      }
    }
  }

  return items;
}

// Health check helper
export async function checkPerplexityHealth() {
  try {
    const base = process.env.PERPLEXITY_API_BASE || "https://api.perplexity.ai";
    const model = process.env.PERPLEXITY_MODEL || "sonar-pro";
    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
      return "no_api_key";
    }

    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "health check" }],
        max_tokens: 1,
      }),
    });

    return res.ok ? "healthy" : "unhealthy";
  } catch {
    return "unhealthy";
  }
}
