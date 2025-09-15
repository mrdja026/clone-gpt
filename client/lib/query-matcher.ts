/**
 * Query Matcher - Detects deterministic queries and maps them to MCP tool calls
 */

export interface MCPAction {
  toolName?: string;
  resourceUri?: string;
  args: Record<string, any>;
  description: string;
  type: "tool" | "resource";
}

export interface QueryMatch {
  isMatch: boolean;
  confidence: number;
  originalQuery: string;
  mcpActions: MCPAction[];
  enhancedPrompt?: string;
}

/**
 * Extract JIRA ticket keys from text (e.g., SCRUM-8, ABC-123)
 */
function extractJiraKeys(text: string): string[] {
  const jiraKeyPattern = /\b[A-Z][A-Z0-9]+-\d+\b/g;
  return text.match(jiraKeyPattern) || [];
}

/**
 * Extract ticket ID when "Ticket" is mentioned (case insensitive) or "Status-TICKET-123"/"RealStatus-TICKET-123" format is used
 * Looks for patterns like "Ticket SCRUM-8", "ticket ABC-123", "Status-SCRUM-8", or "RealStatus-SCRUM-8", etc.
 */
function extractTicketIds(text: string): string[] {
  // First check for Status-TICKET-123 or RealStatus-TICKET-123 format (new pattern)
  const statusPattern = /\b(Status|RealStatus)-([A-Z][A-Z0-9]+-\d+)\b/g;
  const statusMatches = text.match(statusPattern);
  if (statusMatches && statusMatches.length > 0) {
    return statusMatches
      .map((match) => {
        // Extract just the ticket ID portion regardless of prefix
        const ticketMatch = match.match(/-(([A-Z][A-Z0-9]+)-\d+)$/);
        return ticketMatch ? ticketMatch[1] : "";
      })
      .filter((id) => id); // Filter out any empty strings
  }

  // Then check for "ticket TICKET-123" format (original pattern)
  const ticketPattern = /\bticket\s+([A-Z][A-Z0-9]+-\d+)\b/gi;
  const matches = [];
  let match;
  while ((match = ticketPattern.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return matches.length > 0 ? matches : extractJiraKeys(text);
}

/**
 * Extract project IDs from text (project names, keys)
 * Looks for patterns like "project SCRUM", "in PROJECT-X", etc.
 */
function extractProjectIds(text: string): string[] {
  const projectPattern = /\b(?:project|in)\s+([A-Z][A-Z0-9-]*)\b/gi;
  const matches = [];
  let match;
  while ((match = projectPattern.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

/**
 * Extract version numbers from text (e.g., v1.2.3, version 2.0.1)
 */
function extractVersions(text: string): string[] {
  const versionPattern = /v?\d+\.\d+(?:\.\d+)?/g;
  return text.match(versionPattern) || [];
}

/**
 * Extract team names from text (e.g., TEAM-A, team Alpha)
 */
function extractTeamNames(text: string): string[] {
  const teamPattern = /\b(?:team\s+)?([A-Z][A-Z0-9-]*|[A-Z][a-z]+)\b/gi;
  const matches = text.match(teamPattern) || [];
  return matches.map((m) => m.replace(/^team\s+/i, ""));
}

/**
 * Detect search intent patterns for Perplexity
 */
function isSearchQuery(text: string): boolean {
  const searchKeywords = [
    "search",
    "find",
    "look up",
    "what is",
    "how to",
    "explain",
    "define",
    "latest",
    "recent",
    "news",
    "trends",
    "information about",
    "learn about",
    "compare",
    "best practices",
    "tutorial",
    "guide",
    "examples",
  ];

  const lowerText = text.toLowerCase();
  return searchKeywords.some((keyword) => lowerText.includes(keyword));
}

/**
 * Extract domain hints from search queries
 */
function extractSearchDomain(text: string): string | undefined {
  const domainPatterns = [
    { pattern: /\b(github|git|repository|repo)\b/i, domain: "github.com" },
    {
      pattern: /\b(stack overflow|stackoverflow)\b/i,
      domain: "stackoverflow.com",
    },
    { pattern: /\b(documentation|docs|api)\b/i, domain: "docs" },
    {
      pattern: /\b(react|javascript|typescript|js|ts)\b/i,
      domain: "developer.mozilla.org",
    },
    { pattern: /\b(python|django|flask)\b/i, domain: "python.org" },
    { pattern: /\b(aws|amazon web services)\b/i, domain: "aws.amazon.com" },
  ];

  for (const { pattern, domain } of domainPatterns) {
    if (pattern.test(text)) {
      return domain;
    }
  }

  return undefined;
}

/**
 * Extract recency hints from search queries
 */
function extractSearchRecency(text: string): string {
  if (/\b(today|latest|recent|new|current)\b/i.test(text)) return "day";
  if (/\b(this week|weekly)\b/i.test(text)) return "week";
  if (/\b(this month|monthly)\b/i.test(text)) return "month";
  if (/\b(this year|yearly|annual)\b/i.test(text)) return "year";
  return "month"; // default
}

/**
 * Match user query against deterministic patterns and generate MCP actions
 */
export function matchQuery(userInput: string): QueryMatch {
  const input = userInput.toLowerCase().trim();
  const originalInput = userInput.trim();

  // High-priority: bare JIRA key (e.g., "SCRUM-8") should directly call the ticket tool
  const bareKey = originalInput.match(/^\s*([A-Z][A-Z0-9]+-\d+)\s*$/);
  if (bareKey) {
    const ticketKey = bareKey[1];
    return {
      isMatch: true,
      confidence: 0.99,
      originalQuery: userInput,
      mcpActions: [
        {
          toolName: "fetch_jira_ticket",
          args: { ticketKey },
          description: `Fetching details for JIRA ticket ${ticketKey}`,
          type: "tool",
        },
      ],
      enhancedPrompt: `You are in strict analysis mode. Only use the 'Retrieved Data' from MCP JIRA to answer. If it is empty or an error, state that no data was retrieved for ${ticketKey} and stop. Do not hallucinate.`,
    };
  }

  // Pattern 1: Ticket-specific queries - uses "Ticket" keyword or Status-TICKET/RealStatus-TICKET pattern to extract ID
  if (
    input.includes("ticket") ||
    input.includes("status-") ||
    input.includes("realstatus-")
  ) {
    const ticketIds = extractTicketIds(originalInput);
    if (ticketIds.length > 0) {
      // Use process_text tool if query includes Status-TICKET or RealStatus-TICKET pattern
      if (originalInput.match(/\b(Status|RealStatus)-([A-Z][A-Z0-9]+-\d+)\b/)) {
        return {
          isMatch: true,
          confidence: 0.99,
          originalQuery: userInput,
          mcpActions: [
            {
              toolName: "process_text",
              args: { text: originalInput },
              description: `Processing text command for ticket ${ticketIds[0]}`,
              type: "tool",
            },
          ],
          enhancedPrompt: `You are in strict analysis mode. Only use the 'Retrieved Data' below that comes from the MCP JIRA tool. If no data is present, reply: "No JIRA data found for ${ticketIds[0]}". Do not infer or hallucinate.`,
        };
      } else {
        // Use traditional fetch_jira_ticket for other patterns
        return {
          isMatch: true,
          confidence: 0.95,
          originalQuery: userInput,
          mcpActions: ticketIds.map((ticketKey) => ({
            toolName: "fetch_jira_ticket",
            args: { ticketKey },
            description: `Fetching details for JIRA ticket ${ticketKey}`,
            type: "tool",
          })),
          enhancedPrompt: `You are in strict analysis mode. Only use the 'Retrieved Data' below that comes from the MCP JIRA tool. If no data is present, reply: "No JIRA data found for ${ticketIds[0]}". Do not infer or hallucinate.`,
        };
      }
    }
  }

  // Pattern 2: Project-specific queries - uses "project" keyword to extract project ID
  if (input.includes("project")) {
    const projectIds = extractProjectIds(originalInput);
    if (projectIds.length > 0) {
      return {
        isMatch: true,
        confidence: 0.9,
        originalQuery: userInput,
        mcpActions: [
          {
            resourceUri: "mcp://local-mcp-server/jira/projects",
            args: { projectKey: projectIds[0] },
            description: `Fetching information for project ${projectIds[0]}`,
            type: "resource",
          },
        ],
        enhancedPrompt: `You are in strict analysis mode. Only summarize what is present in 'Retrieved Data' from MCP for project ${projectIds[0]}. Do not infer or hallucinate beyond those fields.`,
      };
    } else {
      // General project query without specific ID
      return {
        isMatch: true,
        confidence: 0.8,
        originalQuery: userInput,
        mcpActions: [
          {
            resourceUri: "mcp://local-mcp-server/jira/projects",
            args: {},
            description: "Fetching all available projects (SCRUM, HWP, etc.)",
            type: "resource",
          },
        ],
        enhancedPrompt: `You are in strict analysis mode. Only summarize what is present in 'Retrieved Data' from MCP about available projects. Do not infer or hallucinate beyond those fields.`,
      };
    }
  }

  // Pattern 3: Sprint-specific queries - distinguished from projects
  if (input.includes("sprint") && !input.includes("project")) {
    return {
      isMatch: true,
      confidence: 0.9,
      originalQuery: userInput,
      mcpActions: [
        {
          resourceUri: "mcp://local-mcp-server/jira/current-sprint",
          args: {},
          description:
            "Fetching current active sprint information across all projects",
          type: "resource",
        },
      ],
      enhancedPrompt: `Based on the current sprint data across projects (SCRUM, HWP), provide insights about sprint progress, goals, and any recommendations for the teams.`,
    };
  }

  // Pattern 3b: Project + Sprint queries - specific project's sprint
  if (input.includes("sprint") && input.includes("project")) {
    const projectIds = extractProjectIds(originalInput);
    const projectKey = projectIds.length > 0 ? projectIds[0] : "SCRUM";
    return {
      isMatch: true,
      confidence: 0.95,
      originalQuery: userInput,
      mcpActions: [
        {
          resourceUri: "mcp://local-mcp-server/jira/current-sprint",
          args: { projectKey },
          description: `Fetching current sprint information for project ${projectKey}`,
          type: "resource",
        },
      ],
      enhancedPrompt: `Based on the current sprint data for project ${projectKey}, provide insights about sprint progress, goals, and specific recommendations for this project team.`,
    };
  }

  // Pattern 4: Issue/ticket queries (fallback without "ticket" keyword)
  if (input.includes("issue") || input.includes("task")) {
    const jiraKeys = extractJiraKeys(originalInput);
    if (jiraKeys.length > 0) {
      // Use process_text tool if query includes Status-TICKET or RealStatus-TICKET pattern
      if (originalInput.match(/\b(Status|RealStatus)-([A-Z][A-Z0-9]+-\d+)\b/)) {
        return {
          isMatch: true,
          confidence: 0.99,
          originalQuery: userInput,
          mcpActions: [
            {
              toolName: "process_text",
              args: { text: originalInput },
              description: `Processing text command for ticket ${jiraKeys[0]}`,
              type: "tool",
            },
          ],
          enhancedPrompt: `You are in strict analysis mode. Only use the 'Retrieved Data' from MCP JIRA to answer. If it is empty or an error, state that no data was retrieved for ${jiraKeys[0]} and stop. Do not hallucinate.`,
        };
      } else {
        // Use traditional fetch_jira_ticket for other patterns
        return {
          isMatch: true,
          confidence: 0.85,
          originalQuery: userInput,
          mcpActions: jiraKeys.map((ticketKey) => ({
            toolName: "fetch_jira_ticket",
            args: { ticketKey },
            description: `Fetching details for JIRA ticket ${ticketKey}`,
            type: "tool",
          })),
          enhancedPrompt: `You are in strict analysis mode. Only use the 'Retrieved Data' from MCP JIRA to answer. If it is empty or an error, state that no data was retrieved for ${jiraKeys[0]} and stop. Do not hallucinate.`,
        };
      }
    } else {
      // General issue query - show projects to help find issues
      return {
        isMatch: true,
        confidence: 0.7,
        originalQuery: userInput,
        mcpActions: [
          {
            resourceUri: "mcp://local-mcp-server/jira/projects",
            args: {},
            description: "Fetching project list to identify available issues",
            type: "resource",
          },
        ],
        enhancedPrompt: `Based on the project data, help the user understand how to find their assigned issues. Note that detailed issue listing would require additional JIRA API endpoints.`,
      };
    }
  }

  // Pattern 5: Release notes and version queries
  if (
    input.includes("release notes") ||
    input.includes("release") ||
    (input.includes("generate") && input.includes("version"))
  ) {
    const versions = extractVersions(originalInput);
    return {
      isMatch: true,
      confidence: 0.8,
      originalQuery: userInput,
      mcpActions: [
        {
          resourceUri: "mcp://local-mcp-server/jira/projects",
          args: {},
          description:
            "Fetching project information for release notes generation",
          type: "resource",
        },
      ],
      enhancedPrompt: `Based on the project data, provide guidance on generating release notes${versions.length > 0 ? ` for version ${versions[0]}` : ""}. Include typical sections like new features, bug fixes, and breaking changes.`,
    };
  }

  // Pattern 6: Blocker analysis
  if (input.includes("blockers") || input.includes("blocked")) {
    const jiraKeys = extractJiraKeys(originalInput);
    if (jiraKeys.length > 0) {
      return {
        isMatch: true,
        confidence: 0.9,
        originalQuery: userInput,
        mcpActions: jiraKeys.map((ticketKey) => ({
          toolName: "fetch_jira_ticket",
          args: { ticketKey },
          description: `Fetching details for ${ticketKey} to identify blockers`,
          type: "tool",
        })),
        enhancedPrompt: `You are in strict analysis mode. Analyze only the 'Retrieved Data' for blockers or dependencies. If empty, reply that blockers cannot be determined because no data was retrieved for ${jiraKeys[0]}. Do not hallucinate.`,
      };
    }
  }

  // Pattern 7: Direct Status-TICKET-X or RealStatus-TICKET-X command (highest priority)
  const statusMatch = originalInput.match(
    /\b(Status|RealStatus)-([A-Z][A-Z0-9]+-\d+)\b/,
  );
  if (statusMatch) {
    const prefix = statusMatch[1]; // Status or RealStatus
    const ticketKey = statusMatch[2]; // Extract the ticket key part
    const isRealStatus = prefix.toLowerCase() === "realstatus";

    return {
      isMatch: true,
      confidence: 1.0, // Highest confidence
      originalQuery: userInput,
      mcpActions: [
        {
          toolName: "process_text",
          args: { text: originalInput },
          description: `Processing ${isRealStatus ? "live " : ""}status command for ticket ${ticketKey}`,
          type: "tool",
        },
      ],
      enhancedPrompt: `You are in strict analysis mode. Only analyze the JIRA ticket data returned by the MCP server for ${ticketKey}. ${isRealStatus ? "This is live data from the API." : ""} Provide a clear summary of its status and details.`,
    };
  }

  // Pattern 8: Perplexity search queries - detect search intent
  if (
    isSearchQuery(input) &&
    !input.includes("ticket") &&
    !input.includes("project") &&
    !input.includes("sprint")
  ) {
    const domain = extractSearchDomain(originalInput);
    const recency = extractSearchRecency(originalInput);

    return {
      isMatch: true,
      confidence: 0.85,
      originalQuery: userInput,
      mcpActions: [
        {
          toolName: "fetch_perplexity_data",
          args: {
            query: originalInput,
            recency,
            ...(domain && { domain }),
            return_citations: true,
            return_sources: true,
            max_results: 5,
          },
          description: `Searching for: "${originalInput}"${domain ? ` (focused on ${domain})` : ""}`,
          type: "tool",
        },
      ],
      enhancedPrompt: `Based on the search results from Perplexity, provide a comprehensive answer to the user's query: "${originalInput}". Include relevant citations and sources from the search data.`,
    };
  }

  // Fallback: If any JIRA key appears anywhere in the input, fetch it
  {
    const jiraKeys = extractJiraKeys(originalInput);
    if (jiraKeys.length > 0) {
      return {
        isMatch: true,
        confidence: 0.9,
        originalQuery: userInput,
        mcpActions: jiraKeys.map((ticketKey) => ({
          toolName: "fetch_jira_ticket",
          args: { ticketKey },
          description: `Fetching details for JIRA ticket ${ticketKey}`,
          type: "tool",
        })),
        enhancedPrompt: `You are in strict analysis mode. Only use the 'Retrieved Data' below that comes from the MCP JIRA tool. If no data is present, reply: "No JIRA data found for ${jiraKeys[0]}". Do not infer or hallucinate.`,
      };
    }
  }

  // No match found
  return {
    isMatch: false,
    confidence: 0,
    originalQuery: userInput,
    mcpActions: [],
  };
}

/**
 * Format MCP response data for display
 */
export function formatMCPResponse(action: MCPAction, response: any): string {
  try {
    const data = typeof response === "string" ? JSON.parse(response) : response;

    // Handle based on action type and identifier
    const identifier = action.toolName || action.resourceUri;

    switch (identifier) {
      case "process_text": // dumbing down the process @mrdjanstajic
      case "fetch_jira_ticket":
        // Handle error case first
        if (data.error || data.status === "error") {
          return `⚠️ **Error:** ${data.error || "Unknown error"}
📝 **Details:** ${data.message || "No additional details available."}
`;
        }
        // Normal response
        return `**JIRA Ticket: ${data.key}**
📋 **Summary:** ${data.summary}
📊 **Status:** ${data.status}
👤 **Assignee:** ${data.assignee || "Unassigned"}
⚡ **Priority:** ${data.priority || "Normal"}
📝 **Description:** ${data.description}
${data.blockers && data.blockers.length > 0 ? `🚫 **Blockers:**\n${data.blockers.map((b: string) => `  • ${b}`).join("\n")}` : ""}
`;

      case "mcp://local-mcp-server/jira/projects":
      case "list_jira_projects": // backward compatibility
      case "fetch_jira_projects": // backward compatibility
        if (Array.isArray(data)) {
          return `**Available Projects:**
${data.map((project) => `• **${project.key}** - ${project.name} (${project.projectTypeKey})`).join("\n")}
`;
        }
        break;

      case "mcp://local-mcp-server/jira/current-sprint":
      case "get_current_sprint_summary": // backward compatibility
      case "fetch_current_sprint": // backward compatibility
        if (data.activeSprints && Array.isArray(data.activeSprints)) {
          return `**Active Sprints:**
${data.activeSprints
  .map(
    (sprint) =>
      `• **${sprint.name}** (${sprint.boardName})
  - Goal: ${sprint.goal}
  - Dates: ${sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : "TBD"} - ${sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : "TBD"}`,
  )
  .join("\n\n")}
`;
        }
        return `**Sprint Summary:** ${data.summary || "No active sprints found"}`;

      case "fetch_perplexity_data":
        // Handle Perplexity search results
        if (data.error) {
          return `⚠️ **Search Error:** ${data.error}`;
        }

        const searchContent = data.content || "";
        const citations = data.citations || [];
        const sources = data.sources || [];
        const metadata = data.search_metadata || {};

        let formatted = `**Search Results**${metadata.query ? ` for "${metadata.query}"` : ""}:\n\n`;

        if (searchContent) {
          formatted += `${searchContent}\n\n`;
        }

        if (sources.length > 0) {
          formatted += `**Sources:**\n`;
          sources.slice(0, 5).forEach((source: any, index: number) => {
            formatted += `${index + 1}. [${source.name || source.title || "Source"}](${source.url})\n`;
          });
          formatted += "\n";
        }

        if (citations.length > 0) {
          formatted += `**Citations:**\n`;
          citations.slice(0, 3).forEach((citation: string, index: number) => {
            formatted += `${index + 1}. ${citation}\n`;
          });
        }

        return formatted;

      default:
        return `**${action.description}:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
    }
  } catch (error) {
    console.error("Error formatting MCP response:", error);
    return `**${action.description}:**\n${response}`;
  }
}
