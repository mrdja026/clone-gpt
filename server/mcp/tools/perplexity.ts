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

// Perplexity data fetcher schema - optimized for data collection
export const perplexityDataFetcherSchema = z.object({
  query: z.string(),
  recency: z.enum(["day", "week", "month", "year"]).optional(),
  domain: z.string().optional(),
  return_citations: z.boolean().optional(),
  return_sources: z.boolean().optional(),
  max_results: z.number().optional(),
});

export type PerplexityDataFetcherArgs = z.infer<
  typeof perplexityDataFetcherSchema
>;

// Perplexity space search schema - for scoped RAG Space queries
export const perplexitySpaceSearchSchema = z.object({
  query: z.string(),
  strict_mode: z.boolean().optional(),
});

export type PerplexitySpaceSearchArgs = z.infer<
  typeof perplexitySpaceSearchSchema
>;

// In-memory cache by query hash
const cache = new Map<string, any>();

// Enhanced in-memory history with search IDs
const history: Array<{
  id: string;
  ts: number;
  query: string;
  params: any;
  result: any;
  tool_type: "search" | "data_fetch" | "space_search";
}> = [];

// Data fetcher specific cache and history
const dataFetcherCache = new Map<string, any>();

// Space search specific cache
const spaceSearchCache = new Map<string, any>();

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

function getDataFetcherCacheKey(args: PerplexityDataFetcherArgs) {
  return JSON.stringify({
    q: args.query.toLowerCase(),
    r: args.recency,
    d: args.domain,
  });
}

function generateSearchId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getSpaceSearchCacheKey(args: PerplexitySpaceSearchArgs) {
  return JSON.stringify({
    q: args.query.toLowerCase(),
    strict: args.strict_mode || false,
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

// Data fetcher optimized for local LLM consumption
export async function fetchPerplexityData(args: PerplexityDataFetcherArgs) {
  const base = process.env.PERPLEXITY_API_BASE || "https://api.perplexity.ai";
  const model = process.env.PERPLEXITY_MODEL || "sonar-pro";
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY is not configured");
  }

  // System prompt optimized for data collection, not reasoning
  const systemPrompt =
    "Return comprehensive, detailed search results with all relevant information and sources. Do not summarize or analyze - provide complete data for further processing.";

  const body: any = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: args.domain
          ? `Search for: ${args.query}. Focus on domain: ${args.domain}`
          : args.query,
      },
    ],
    search_recency_filter: args.recency || "month",
    return_citations: args.return_citations !== false,
    return_sources: args.return_sources !== false,
    max_tokens: args.max_results
      ? Math.min(args.max_results * 100, 4000)
      : 4000,
  };

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

  const result = await res.json();

  // Format data specifically for local LLM consumption
  const formattedData = {
    search_metadata: {
      query: args.query,
      timestamp: new Date().toISOString(),
      recency_filter: args.recency || "month",
      domain_filter: args.domain || null,
    },
    content: result.choices?.[0]?.message?.content || "",
    citations: result.citations || [],
    sources: result.sources || [],
    raw_response: result,
    instructions_for_local_llm:
      "Process this search data according to the user's needs. Analyze, summarize, compare, or answer questions based on this information.",
  };

  return formattedData;
}

// Space-scoped search for RAG Space
export async function searchPerplexitySpace(args: PerplexitySpaceSearchArgs) {
  const base = process.env.PERPLEXITY_API_BASE || "https://api.perplexity.ai";
  const model = process.env.PERPLEXITY_MODEL || "sonar-pro";
  const apiKey = process.env.PERPLEXITY_API_KEY;
  const spaceUrl = process.env.RAG_SPACE_URL;

  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY is not configured");
  }

  if (!spaceUrl) {
    throw new Error("RAG_SPACE_URL is not configured");
  }

  // Build space-scoped query
  const scopedQuery = `site:${spaceUrl} ${args.query}`;

  // System prompt for space-scoped searches
  const systemPrompt = args.strict_mode
    ? `You must only use sources from the specified RAG Space URL: ${spaceUrl}. If no relevant information is found in this space, clearly state that. Do not use external sources.`
    : `Focus primarily on information from the RAG Space URL: ${spaceUrl}. Prioritize these sources but you may supplement with other relevant information if needed.`;

  const body: any = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: scopedQuery },
    ],
    domain: "www.perplexity.ai",
    search_recency_filter: "year",
    temperature: 0,
    max_tokens: 3000,
    return_citations: true,
    return_sources: true,
  };

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

  const result = await res.json();

  // Post-process to filter and annotate sources
  const processedResult = processSpaceSearchResult(
    result,
    spaceUrl,
    args.strict_mode,
  );

  return processedResult;
}

function processSpaceSearchResult(
  result: any,
  spaceUrl: string,
  strictMode: boolean = false,
) {
  const sources = result.sources || [];
  const citations = result.citations || [];

  // Filter sources and citations
  const spaceBaseDomain = spaceUrl.split("/").slice(0, 3).join("/"); // Get domain part
  const spaceSources = sources.filter(
    (source: any) => source.url && source.url.startsWith(spaceUrl),
  );
  const nonSpaceSources = sources.filter(
    (source: any) => source.url && !source.url.startsWith(spaceUrl),
  );

  const spaceCitations = citations.filter(
    (citation: any) => citation.url && citation.url.startsWith(spaceUrl),
  );
  const nonSpaceCitations = citations.filter(
    (citation: any) => citation.url && !citation.url.startsWith(spaceUrl),
  );

  // Build metadata about source filtering
  const sourceMetadata = {
    total_sources: sources.length,
    space_sources: spaceSources.length,
    non_space_sources: nonSpaceSources.length,
    space_coverage:
      sources.length > 0
        ? ((spaceSources.length / sources.length) * 100).toFixed(1) + "%"
        : "0%",
    strict_mode: strictMode,
    space_url: spaceUrl,
  };

  // In strict mode, only include space sources
  const finalSources = strictMode ? spaceSources : sources;
  const finalCitations = strictMode ? spaceCitations : citations;

  // Add warnings if needed
  const warnings = [];
  if (strictMode && nonSpaceSources.length > 0) {
    warnings.push(
      `Filtered out ${nonSpaceSources.length} non-space sources in strict mode`,
    );
  }
  if (!strictMode && nonSpaceSources.length > 0) {
    warnings.push(
      `Found ${nonSpaceSources.length} sources outside the RAG space - marked for reference`,
    );
  }
  if (spaceSources.length === 0) {
    warnings.push("No sources found from the specified RAG space");
  }

  return {
    ...result,
    sources: finalSources,
    citations: finalCitations,
    space_metadata: sourceMetadata,
    warnings: warnings,
    non_space_sources: strictMode
      ? []
      : nonSpaceSources.map((s: any) => ({
          ...s,
          _note: "Source outside RAG space",
        })),
  };
}

export async function executePerplexitySearch(args: PerplexitySearchArgs) {
  const cacheKey = getCacheKey(args);
  const searchId = generateSearchId();

  // Check cache first
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    history.push({
      id: searchId,
      ts: Date.now(),
      query: args.query,
      params: args,
      result: cached,
      tool_type: "search",
    });
    return {
      content: [{ type: "text", text: JSON.stringify(cached, null, 2) }],
    };
  }

  // Make the API call
  const result = await callPerplexity(args);
  cache.set(cacheKey, result);
  history.push({
    id: searchId,
    ts: Date.now(),
    query: args.query,
    params: args,
    result,
    tool_type: "search",
  });

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

// Execute space search with caching and formatted response
export async function executePerplexitySpaceSearch(
  args: PerplexitySpaceSearchArgs,
) {
  const cacheKey = getSpaceSearchCacheKey(args);
  const searchId = generateSearchId();

  // Check cache first
  if (spaceSearchCache.has(cacheKey)) {
    const cached = spaceSearchCache.get(cacheKey);
    history.push({
      id: searchId,
      ts: Date.now(),
      query: args.query,
      params: args,
      result: cached,
      tool_type: "space_search",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ...cached,
              cache_hit: true,
              search_id: searchId,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  // Make the API call
  const result = await searchPerplexitySpace(args);
  spaceSearchCache.set(cacheKey, result);

  history.push({
    id: searchId,
    ts: Date.now(),
    query: args.query,
    params: args,
    result,
    tool_type: "space_search",
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            ...result,
            cache_hit: false,
            search_id: searchId,
          },
          null,
          2,
        ),
      },
    ],
  };
}

// Execute data fetch with caching and formatted response
export async function executePerplexityDataFetch(
  args: PerplexityDataFetcherArgs,
) {
  const cacheKey = getDataFetcherCacheKey(args);
  const searchId = generateSearchId();

  // Check cache first
  if (dataFetcherCache.has(cacheKey)) {
    const cached = dataFetcherCache.get(cacheKey);
    history.push({
      id: searchId,
      ts: Date.now(),
      query: args.query,
      params: args,
      result: cached,
      tool_type: "data_fetch",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ...cached,
              cache_hit: true,
              search_id: searchId,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  // Make the API call
  const data = await fetchPerplexityData(args);
  dataFetcherCache.set(cacheKey, data);

  history.push({
    id: searchId,
    ts: Date.now(),
    query: args.query,
    params: args,
    result: data,
    tool_type: "data_fetch",
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            ...data,
            cache_hit: false,
            search_id: searchId,
          },
          null,
          2,
        ),
      },
    ],
  };
}

export function getPerplexityHistory() {
  return history;
}

export function getPerplexityHistoryFiltered(uri: string) {
  const parts = uri
    .replace(/^(perplexity|search):\/\/history\//, "")
    .split("/")
    .filter(Boolean);
  let items = history;

  if (parts.length === 0) {
    // Return all history
    return items;
  } else if (parts[0] === "recent" && parts[1]) {
    const count = parseInt(parts[1]);
    if (!isNaN(count)) {
      items = history.slice(-count);
    }
  } else if (parts[0] === "since" && parts[1]) {
    const since = Number(parts[1]);
    if (!Number.isNaN(since)) {
      items = history.filter((h) => h.ts >= since);
    }
  } else if (parts[0] === "last" && parts[1]) {
    const n = Number(parts[1]);
    if (!Number.isNaN(n)) {
      items = history.slice(-n);
    }
  } else if (parts[0] === "query" && parts[1]) {
    const searchTerm = decodeURIComponent(parts[1]).toLowerCase();
    if (searchTerm === "space") {
      // Filter for space searches only
      items = history.filter((h) => h.tool_type === "space_search");
    } else {
      // Filter by query content
      items = history.filter((h) => h.query.toLowerCase().includes(searchTerm));
    }
  } else if (parts[0] === "full" && parts[1]) {
    const searchId = parts[1];
    items = history.filter((h) => h.id === searchId);
  } else if (parts[0] === "type" && parts[1]) {
    const toolType = parts[1] as "search" | "data_fetch" | "space_search";
    items = history.filter((h) => h.tool_type === toolType);
  }

  return items;
}

// Get search history formatted for local LLM context consumption
export function getSearchHistoryFormatted(uri: string) {
  const filtered = getPerplexityHistoryFiltered(uri);

  // Format for local LLM context consumption
  const contextData = {
    resource_type: "search_history",
    total_searches: history.length,
    filtered_count: filtered.length,
    searches: filtered.map((search) => ({
      id: search.id,
      timestamp: new Date(search.ts).toISOString(),
      query: search.query,
      tool_type: search.tool_type,
      summary:
        typeof search.result === "object" && search.result.content
          ? search.result.content.substring(0, 200) + "..."
          : typeof search.result === "string"
            ? search.result.substring(0, 200) + "..."
            : "No summary available",
      source_count: search.result?.sources?.length || 0,
      domain_filter: search.params.domain || null,
      recency_filter:
        search.params.recency ||
        (search.tool_type === "data_fetch" ? "month" : null),
    })),
    full_data_available:
      "Use search://history/full/{id} to get complete search data",
    usage_note:
      "This context helps understand previous searches and their relationships",
  };

  return contextData;
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
