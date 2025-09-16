# Perplexity Tool Implementation

## Overview

This document details the implementation of the Perplexity search tool in the MCP HTTP bridge integration. The tool enables real-time information retrieval with intelligent domain and recency filtering.

## Implementation Details

### Tool Definition

The Perplexity tool is defined in `hello-world-mcp/src/tools/perplexity.js` with the following schema:

```javascript
{
  name: "fetch_perplexity_data",
  description: "Search for real-time information using Perplexity AI with intelligent domain and recency filtering",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query to send to Perplexity AI",
      },
      domain: {
        type: "string",
        description: "Domain filter (e.g., 'github.com', 'stackoverflow.com', 'docs.*')",
        enum: ["github.com", "stackoverflow.com", "docs.*", "reddit.com", "medium.com", "dev.to"],
      },
      recency: {
        type: "string",
        description: "Time-based filter for search results",
        enum: ["day", "week", "month", "year"],
      },
      max_results: {
        type: "integer",
        description: "Maximum number of search results to return (1-10)",
        minimum: 1,
        maximum: 10,
        default: 5,
      },
    },
    required: ["query"],
  },
}
```

### Key Features

1. **Header-based Authentication**
   - The tool supports API key authentication via the `X-Perplexity-Key` header
   - Fallback to environment variable `PERPLEXITY_API_KEY` if header is not provided

2. **Caching with TTL**
   - Implements a 1-hour TTL cache to reduce API calls and improve performance
   - Cache key based on query, domain, recency, and max_results parameters
   - Cache hit information included in the response

3. **Domain and Recency Filtering**
   - Supports domain filtering (e.g., `github.com`, `stackoverflow.com`)
   - Supports recency filtering (`day`, `week`, `month`, `year`)
   - Enhances query with appropriate filters before sending to Perplexity API

4. **Structured Response**
   - Returns structured data with content, sources, and citations
   - Includes search metadata for context and tracking

### Implementation Highlights

```javascript
async execute(args, authContext = {}) {
  const { query, domain, recency, max_results = 5 } = args || {};

  // Check cache first
  const cacheKey = this.getCacheKey(query, domain, recency, max_results);
  const cached = this.cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            ...cached.data,
            cache_hit: true,
            cached_at: new Date(cached.timestamp).toISOString(),
          }),
        },
      ],
    };
  }

  // Get API key from auth context or environment
  const apiKey = authContext.perplexityKey || process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Perplexity API key is required. " +
      "Set PERPLEXITY_API_KEY environment variable or provide X-Perplexity-Key header."
    );
  }

  // Build enhanced query with domain and recency filters
  let enhancedQuery = query;
  if (domain) {
    enhancedQuery += ` site:${domain}`;
  }
  if (recency) {
    const recencyMap = {
      day: "after:1d",
      week: "after:7d",
      month: "after:30d",
      year: "after:365d",
    };
    enhancedQuery += ` ${recencyMap[recency]}`;
  }

  // Make API call and format response
  // ...

  // Cache the result
  this.cache.set(cacheKey, {
    data: searchResult,
    timestamp: Date.now(),
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(searchResult),
      },
    ],
  };
}
```

## Integration with HTTP Bridge

The HTTP bridge in `hello-world-mcp/src/http-bridge.js` forwards authentication headers to the Perplexity tool:

```javascript
// Extract per-request credentials from headers
const perplexityKey = req.headers["x-perplexity-key"];

// Store credentials for this request
if (perplexityKey) {
  this.requestCredentials.set(id, { perplexityKey });
}

// Inject auth context for tools that need per-request credentials
if (
  perplexityKey &&
  normalized.method === "tools/call" &&
  normalized.params?.name === "fetch_perplexity_data"
) {
  enhancedParams = {
    ...normalized.params,
    _auth: { perplexityKey }, // Internal auth envelope
  };
}
```

## Testing and Validation

The Perplexity tool was tested with the following command:

```powershell
$body = '{"name":"fetch_perplexity_data","arguments":{"query":"what is the golden ratio?","max_results":3}}'
Invoke-RestMethod -Uri "http://localhost:8080/api/mcp/tool" -Method POST -ContentType "application/json" -Body $body
```

The response included comprehensive data about the golden ratio with citations and sources:

```json
{
  "search_metadata": {
    "query": "what is the golden ratio?",
    "timestamp": "2025-09-16T09:23:18.984Z",
    "recency_filter": "month",
    "domain_filter": null
  },
  "content": "The **golden ratio** is a mathematical constant, commonly denoted by the Greek letter \\( \\varphi \\) (phi), approximately equal to **1.618**...",
  "citations": [
    "https://brightchamps.com/en-us/math/commercial-math/golden-ratio",
    "https://www.youtube.com/watch?v=VO0eFoWSrlI",
    "https://app.uxcel.com/glossary/golden-ratio"
    // ...
  ],
  "sources": [
    // ...
  ],
  "cache_hit": false,
  "search_id": "mfmci24o"
}
```

## Conclusion

The Perplexity tool implementation provides a robust solution for real-time information retrieval with:

1. Secure authentication via headers
2. Efficient caching for performance
3. Flexible filtering options
4. Structured response format

This implementation enhances the MCP HTTP bridge with powerful search capabilities that can be leveraged by the `clone-gpt` application.
