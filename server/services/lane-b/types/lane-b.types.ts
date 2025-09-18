export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface LaneBResult {
  tool_calls: ToolCall[];
  source: "gemma" | "matcher" | "chat";
  chat?: string;
}

export interface QueryMatcherResult {
  tool_calls: ToolCall[];
  source: "matcher";
}

export interface OllamaResponse {
  response: string;
}

export const SUPPORTED_TOOLS: ToolDefinition[] = [
  {
    name: "fetch_ticket",
    description: "Fetch a Jira ticket by its key",
    parameters: {
      type: "object",
      properties: { ticketKey: { type: "string" } },
      required: ["ticketKey"],
    },
  },
  {
    name: "fetch_perplexity_data",
    description: "Fetch data from Perplexity API",
    parameters: {
      type: "object",
      properties: {
        space_id: { type: "string", nullable: true },
        query: { type: "string", nullable: true },
        user: { type: "string", nullable: true },
      },
    },
  },
];

export const QUERY_PATTERNS = {
  // Capture group for robust extraction and allow case-insensitive detection
  JIRA_KEY: /\b([A-Z][A-Z0-9]+-\d+)\b/i,
  SPACE: /\bspace\s+([A-Za-z0-9_-]+)\b/i,
  USER: /\buser\s+@?([A-Za-z0-9_.-]+)\b/i,
} as const;
