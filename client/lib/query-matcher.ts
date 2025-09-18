/**
 * Query Matcher - Detects deterministic queries and maps them to MCP tool calls
 * Enhanced with Lane B's proven JIRA ticket detection and tool call generation patterns
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
 * Looks for patterns like "project SCRUM", "for WEB", "WEB tree", etc.
 */
function extractProjectIds(text: string): string[] {
  const patterns = [
    // "project WEB", "in SCRUM"
    /\b(?:project|in)\s+([A-Z][A-Z0-9-]*)\b/gi,
    // "for WEB", "of SCRUM"
    /\b(?:for|of)\s+([A-Z][A-Z0-9-]*)\b/gi,
    // "WEB project", "WEB tree", "WEB with"
    /\b([A-Z][A-Z0-9-]*)\s+(?:project|tree|with|hierarchy|breakdown)\b/gi,
  ];

  const matches = new Set<string>();
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const projectKey = match[1];
      // Validate it looks like a project key (2+ chars, starts with letter)
      if (projectKey.length >= 2 && /^[A-Z]/.test(projectKey)) {
        matches.add(projectKey);
      }
    }
  }
  return Array.from(matches);
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
 * Extract board types from text (scrum, kanban)
 */
function extractBoardTypes(text: string): string[] {
  const boardTypePattern = /\b(scrum|kanban)\b/gi;
  const matches = text.match(boardTypePattern) || [];
  return matches.map((type) => type.toLowerCase());
}

/**
 * Extract board names from text (e.g., "board MyBoard", "MyBoard board")
 */
function extractBoardNames(text: string): string[] {
  const boardNamePatterns = [
    /\bboard\s+([A-Za-z0-9][A-Za-z0-9\s_-]*)/gi, // "board MyBoard"
    /\b([A-Za-z0-9][A-Za-z0-9\s_-]*)\s+board\b/gi, // "MyBoard board"
  ];

  const names = [];
  for (const pattern of boardNamePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      if (name && !names.includes(name)) {
        names.push(name);
      }
    }
  }
  return names;
}

/**
 * Detect search intent vs specific item intent
 */
function extractSearchIntent(text: string): boolean {
  const searchKeywords = [
    "search",
    "find",
    "list",
    "show",
    "get",
    "all",
    "browse",
    "explore",
    "lookup",
    "discover",
  ];
  const lowerText = text.toLowerCase();
  return searchKeywords.some((keyword) => lowerText.includes(keyword));
}

/**
 * Detect search intent patterns for Perplexity
 */
function isSearchQuery(text: string): boolean {
  const searchKeywords = [
    "search",
    "find",
    "look up",
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
 * Lane B Enhanced Fallback Matcher - Uses proven regex patterns from Lane B success
 * This provides a deterministic fallback when main pattern matching fails
 */
function laneBEnhancedFallback(userInput: string): QueryMatch | null {
  const input = userInput.trim();

  // Lane B's core JIRA pattern - proven to work with SCRUM-42 format
  const jiraMatch = input.match(/\b([A-Z][A-Z0-9]+-\d+)\b/);
  if (jiraMatch) {
    const ticketKey = jiraMatch[1];
    return {
      isMatch: true,
      confidence: 0.98, // Very high confidence for Lane B's proven pattern
      originalQuery: userInput,
      mcpActions: [
        {
          toolName: "fetch_ticket",
          args: { ticketKey },
          description: `Fetching JIRA ticket ${ticketKey} (Lane B fallback)`,
          type: "tool",
        },
      ],
      enhancedPrompt: `Lane B enhanced fallback: Only use the retrieved JIRA data for ticket ${ticketKey}. Do not hallucinate.`,
    };
  }

  // Lane B's space pattern
  const spaceMatch = input.match(
    /\bspace\s+(?:named\s+|called\s+)?\"?([A-Za-z0-9 _-]+)\"?/i,
  );
  if (spaceMatch) {
    const spaceName = spaceMatch[1].trim();
    return {
      isMatch: true,
      confidence: 0.95,
      originalQuery: userInput,
      mcpActions: [
        {
          toolName: "fetch_perplexity_data",
          args: { space_name: spaceName },
          description: `Exploring Perplexity Space: ${spaceName} (Lane B fallback)`,
          type: "tool",
        },
      ],
      enhancedPrompt: `Lane B enhanced fallback: Provide insights about the Perplexity Space "${spaceName}".`,
    };
  }

  // Lane B's user pattern
  const userMatch = input.match(
    /\b(?:perplexity\s+)?user\s+@?([A-Za-z0-9_.-]+)/i,
  );
  if (userMatch) {
    const userName = userMatch[1].trim();
    return {
      isMatch: true,
      confidence: 0.95,
      originalQuery: userInput,
      mcpActions: [
        {
          toolName: "fetch_perplexity_data",
          args: { user: userName },
          description: `Exploring Perplexity user: ${userName} (Lane B fallback)`,
          type: "tool",
        },
      ],
      enhancedPrompt: `Lane B enhanced fallback: Provide insights about the Perplexity user "${userName}".`,
    };
  }

  return null; // No fallback match found
}

/**
 * Match user query against deterministic patterns and generate MCP actions
 * Enhanced with Lane B's proven patterns and fallback mechanisms
 */
export function matchQuery(userInput: string): QueryMatch {
  const input = userInput.toLowerCase().trim();
  const originalInput = userInput.trim();

  // Lane B Enhanced: High-priority JIRA key detection using proven regex pattern
  const laneBJiraKey = originalInput.match(/\b([A-Z][A-Z0-9]+-\d+)\b/);
  if (laneBJiraKey) {
    const ticketKey = laneBJiraKey[1];
    return {
      isMatch: true,
      confidence: 0.99,
      originalQuery: userInput,
      mcpActions: [
        {
          toolName: "fetch_ticket", // Lane B's proven tool name
          args: { ticketKey }, // Lane B's argument format
          description: `Fetching details for JIRA ticket ${ticketKey} (Lane B enhanced)`,
          type: "tool",
        },
      ],
      enhancedPrompt: `You are in strict analysis mode. Only use the 'Retrieved Data' from MCP JIRA to answer. If it is empty or an error, state that no data was retrieved for ${ticketKey} and stop. Do not hallucinate.`,
    };
  }

  // Fallback: bare JIRA key (original pattern)
  const bareKey = originalInput.match(/^\s*([A-Z][A-Z0-9]+-\d+)\s*$/);
  if (bareKey) {
    const ticketKey = bareKey[1];
    return {
      isMatch: true,
      confidence: 0.95,
      originalQuery: userInput,
      mcpActions: [
        {
          toolName: "fetch_ticket",
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
              description: `Processing text command for ticket ${ticketIds[0]} (Lane B enhanced)`,
              type: "tool",
            },
          ],
          enhancedPrompt: `You are in strict analysis mode. Only use the 'Retrieved Data' below that comes from the MCP JIRA tool. If no data is present, reply: "No JIRA data found for ${ticketIds[0]}". Do not infer or hallucinate.`,
        };
      } else {
        // Lane B Enhanced: Use proven fetch_ticket tool format for better compatibility
        return {
          isMatch: true,
          confidence: 0.97, // Higher confidence for Lane B enhanced
          originalQuery: userInput,
          mcpActions: ticketIds.map((ticketKey) => ({
            toolName: "fetch_ticket", // Lane B's proven tool name
            args: { ticketKey }, // Lane B's argument format
            description: `Fetching details for JIRA ticket ${ticketKey} (Lane B enhanced)`,
            type: "tool",
          })),
          enhancedPrompt: `You are in strict analysis mode. Only use the 'Retrieved Data' below that comes from the MCP JIRA tool. If no data is present, reply: "No JIRA data found for ${ticketIds[0]}". Do not infer or hallucinate.`,
        };
      }
    }
  }

  // Pattern 1.5: Board-specific queries (NEW - high priority)
  if (
    input.includes("board") ||
    input.includes("kanban") ||
    input.includes("scrum")
  ) {
    const boardTypes = extractBoardTypes(originalInput);
    const projectIds = extractProjectIds(originalInput);
    const boardNames = extractBoardNames(originalInput);
    const hasSearchIntent = extractSearchIntent(originalInput);

    // Combined project + board search
    if (input.includes("project") && hasSearchIntent) {
      return {
        isMatch: true,
        confidence: 0.95,
        originalQuery: userInput,
        mcpActions: [
          {
            toolName: "search_projects_with_boards",
            args: {
              ...(projectIds.length > 0 && { projectQuery: projectIds[0] }),
              ...(boardTypes.length > 0 && { boardType: boardTypes[0] }),
              projectStatus: "live",
              includeConfig: true,
              includeActiveSprints: true,
            },
            description: `Finding projects with their boards${projectIds.length > 0 ? ` for project ${projectIds[0]}` : ""}${boardTypes.length > 0 ? ` (${boardTypes[0]} boards)` : ""}`,
            type: "tool",
          },
        ],
        enhancedPrompt: `Based on the projects and boards data, provide a comprehensive overview of the project structure and available boards. Focus on active sprints and board configurations.`,
      };
    }

    // Board-only search
    return {
      isMatch: true,
      confidence: 0.9,
      originalQuery: userInput,
      mcpActions: [
        {
          toolName: "search_jira_boards",
          args: {
            ...(boardNames.length > 0 && { name: boardNames[0] }),
            ...(boardTypes.length > 0 && { type: boardTypes[0] }),
            ...(projectIds.length > 0 && { projectKeyOrId: projectIds[0] }),
            includeConfig: true,
            includeActiveSprints: true,
            includeProjects: true,
            maxResults: 10,
          },
          description: `Searching for boards${boardNames.length > 0 ? ` named "${boardNames[0]}"` : ""}${boardTypes.length > 0 ? ` (${boardTypes[0]} type)` : ""}${projectIds.length > 0 ? ` in project ${projectIds[0]}` : ""}`,
          type: "tool",
        },
      ],
      enhancedPrompt: `Based on the board search results, provide insights about the available boards, their configurations, active sprints, and associated projects. Include practical details for team planning.`,
    };
  }

  // Pattern 1.6: Project tree queries (NEW - high priority)
  if (
    (input.includes("project") &&
      (input.includes("tree") ||
        input.includes("hierarchy") ||
        input.includes("structure"))) ||
    (input.includes("epic") &&
      (input.includes("children") ||
        input.includes("subtask") ||
        input.includes("breakdown"))) ||
    input.includes("project breakdown") ||
    input.includes("epic breakdown")
  ) {
    const projectIds = extractProjectIds(originalInput);
    const projectKey = projectIds.length > 0 ? projectIds[0] : "WEB"; // Default fallback

    return {
      isMatch: true,
      confidence: 0.96,
      originalQuery: userInput,
      mcpActions: [
        {
          toolName: "fetch_jira_project_tree",
          args: {
            projectKeyOrId: projectKey,
            pageSize: 100,
          },
          description: `Fetching complete project tree for ${projectKey} (Project → Epics → Issues → Subtasks)`,
          type: "tool",
        },
      ],
      enhancedPrompt: `Based on the 3-level project tree data for ${projectKey}, provide a comprehensive analysis of the project structure. Include epic progress, issue distribution, story points, and team workload insights. Focus on actionable project management insights.`,
    };
  }

  // Pattern 2: Project-specific queries - uses "project" keyword to extract project ID
  if (input.includes("project")) {
    const projectIds = extractProjectIds(originalInput);
    const hasSearchIntent = extractSearchIntent(originalInput);

    // Enhanced: Use new search tool for search intent
    if (hasSearchIntent) {
      return {
        isMatch: true,
        confidence: 0.92,
        originalQuery: userInput,
        mcpActions: [
          {
            toolName: "search_jira_projects",
            args: {
              ...(projectIds.length > 0 && { query: projectIds[0] }),
              status: "live",
              maxResults: 15,
            },
            description: `Searching for projects${projectIds.length > 0 ? ` matching "${projectIds[0]}"` : ""}`,
            type: "tool",
          },
        ],
        enhancedPrompt: `Based on the project search results, provide a comprehensive overview of available projects. Include project types, status, and key details for team planning.`,
      };
    }

    // Specific project lookup -> use tool-based project search (forward-only MCP)
    if (projectIds.length > 0) {
      return {
        isMatch: true,
        confidence: 0.9,
        originalQuery: userInput,
        mcpActions: [
          {
            toolName: "search_jira_projects",
            args: {
              query: projectIds[0],
              status: "live",
              maxResults: 15,
            },
            description: `Searching for projects matching "${projectIds[0]}"`,
            type: "tool",
          },
        ],
        enhancedPrompt: `Based on the project search results for ${projectIds[0]}, summarize key details. Do not hallucinate beyond returned fields.`,
      };
    } else {
      // General project query without specific ID - use tool
      return {
        isMatch: true,
        confidence: 0.85,
        originalQuery: userInput,
        mcpActions: [
          {
            toolName: "search_jira_projects",
            args: {
              status: "live",
              maxResults: 10,
            },
            description: "Searching for all available projects",
            type: "tool",
          },
        ],
        enhancedPrompt: `Based on the project search results, provide an overview of all available projects with their key characteristics and purposes.`,
      };
    }
  }

  // Pattern 3: Sprint-specific queries - distinguished from projects
  if (input.includes("sprint") && !input.includes("project")) {
    // Forward-only MCP: use combined projects+boards search with active sprints included
    return {
      isMatch: true,
      confidence: 0.9,
      originalQuery: userInput,
      mcpActions: [
        {
          toolName: "search_projects_with_boards",
          args: {
            includeActiveSprints: true,
            includeConfig: true,
            projectStatus: "live",
          },
          description:
            "Fetching boards and active sprints across projects (live)",
          type: "tool",
        },
      ],
      enhancedPrompt: `Based on the boards and sprint data across projects, provide insights about sprint progress, goals, and recommendations.`,
    };
  }

  // Pattern 3b: Project + Sprint queries - specific project's sprint
  if (input.includes("sprint") && input.includes("project")) {
    const projectIds = extractProjectIds(originalInput);
    const projectKey = projectIds.length > 0 ? projectIds[0] : "SCRUM";
    // Prefer dedicated sprint tool when project is specified
    return {
      isMatch: true,
      confidence: 0.95,
      originalQuery: userInput,
      mcpActions: [
        {
          toolName: "fetch_current_sprint",
          args: { projectKey },
          description: `Fetching current sprint information for project ${projectKey}`,
          type: "tool",
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
              description: `Processing text command for ticket ${jiraKeys[0]} (Lane B enhanced)`,
              type: "tool",
            },
          ],
          enhancedPrompt: `You are in strict analysis mode. Only use the 'Retrieved Data' from MCP JIRA to answer. If it is empty or an error, state that no data was retrieved for ${jiraKeys[0]} and stop. Do not hallucinate.`,
        };
      } else {
        // Lane B Enhanced: Use proven fetch_ticket tool format for better compatibility
        return {
          isMatch: true,
          confidence: 0.9, // Higher confidence for Lane B enhanced
          originalQuery: userInput,
          mcpActions: jiraKeys.map((ticketKey) => ({
            toolName: "fetch_ticket", // Lane B's proven tool name
            args: { ticketKey }, // Lane B's argument format
            description: `Fetching details for JIRA ticket ${ticketKey} (Lane B enhanced)`,
            type: "tool",
          })),
          enhancedPrompt: `You are in strict analysis mode. Only use the 'Retrieved Data' from MCP JIRA to answer. If it is empty or an error, state that no data was retrieved for ${jiraKeys[0]} and stop. Do not hallucinate.`,
        };
      }
    } else {
      // General issue query - show projects via tool search to help find issues
      return {
        isMatch: true,
        confidence: 0.7,
        originalQuery: userInput,
        mcpActions: [
          {
            toolName: "search_jira_projects",
            args: { status: "live", maxResults: 10 },
            description: "Searching projects to help identify available issues",
            type: "tool",
          },
        ],
        enhancedPrompt: `Based on the project search results, help the user understand how to find their assigned issues. Note that detailed issue listing may require additional JIRA API endpoints.`,
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
          toolName: "search_jira_projects",
          args: { status: "live", maxResults: 10 },
          description: "Searching projects for release notes context",
          type: "tool",
        },
      ],
      enhancedPrompt: `Based on the project search results, provide guidance on generating release notes${versions.length > 0 ? ` for version ${versions[0]}` : ""}. Include typical sections like new features, bug fixes, and breaking changes.`,
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
          toolName: "fetch_ticket",
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

  // Pattern 8a: Perplexity Space or User queries
  {
    // e.g., "space named RAG" or "space RAG"
    const spaceMatch = originalInput.match(
      /\bspace\s+(?:named\s+|called\s+)?\"?([A-Za-z0-9 _-]+)\"?/i,
    );
    // e.g., "perplexity user mrdjan" or "user @mrdjan"
    const userMatch = originalInput.match(
      /\b(?:perplexity\s+)?user\s+@?([A-Za-z0-9_.-]+)/i,
    );
    if (spaceMatch || userMatch) {
      const recency = extractSearchRecency(originalInput);
      const spaceName = spaceMatch ? spaceMatch[1].trim() : undefined;
      const userName = userMatch ? userMatch[1].trim() : undefined;
      const desc = spaceName
        ? `Exploring Perplexity Space: "${spaceName}"`
        : `Exploring Perplexity user: "${userName}"`;
      return {
        isMatch: true,
        confidence: 0.95,
        originalQuery: userInput,
        mcpActions: [
          {
            toolName: "fetch_perplexity_data",
            args: {
              ...(spaceName ? { space_name: spaceName } : {}),
              ...(userName ? { user: userName } : {}),
              recency,
              max_results: 5,
            },
            description: desc,
            type: "tool",
          },
        ],
        enhancedPrompt: spaceName
          ? `Based on the Perplexity Space \"${spaceName}\" results, summarize the space's focus and list notable items with brief insights. Include citations if available.`
          : `Based on the Perplexity user \"${userName}\" profile/results, summarize key areas of expertise and notable content. Include citations if available.`,
      };
    }
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

  // Lane B Enhanced Fallback: If any JIRA key appears anywhere in the input, fetch it
  // This is Lane B's core success - catching tickets with proven regex pattern
  {
    const jiraKeys = extractJiraKeys(originalInput);
    if (jiraKeys.length > 0) {
      return {
        isMatch: true,
        confidence: 0.95, // Higher confidence for Lane B enhanced fallback
        originalQuery: userInput,
        mcpActions: jiraKeys.map((ticketKey) => ({
          toolName: "fetch_ticket", // Lane B's proven tool name
          args: { ticketKey }, // Lane B's argument format
          description: `Fetching details for JIRA ticket ${ticketKey} (Lane B enhanced fallback)`,
          type: "tool",
        })),
        enhancedPrompt: `You are in strict analysis mode. Only use the 'Retrieved Data' below that comes from the MCP JIRA tool. If no data is present, reply: "No JIRA data found for ${jiraKeys[0]}". Do not infer or hallucinate.`,
      };
    }
  }

  // Lane B Enhanced Fallback: Last resort using Lane B's proven patterns
  const fallbackResult = laneBEnhancedFallback(originalInput);
  if (fallbackResult) {
    return fallbackResult;
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
      case "fetch_ticket": // Lane B's proven tool name
        // Handle error case first
        if (data.error || data.status === "error") {
          return `⚠️ **Error:** ${data.error || "Unknown error"}
📝 **Details:** ${data.message || "No additional details available."}
`;
        }
        // Normal response - Lane B enhanced formatting
        return `**JIRA Ticket: ${data.key}** (Lane B enhanced)
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

      case "search_jira_projects":
        // Handle project search results
        if (data.error) {
          return `⚠️ **Project Search Error:** ${data.error}`;
        }

        // Parse the formatted response text from our MCP server
        if (typeof data === "string") {
          return data; // Already formatted by server
        }

        // Fallback: format raw project array
        if (Array.isArray(data)) {
          return `**🏗️ Found ${data.length} Projects:**\n${data
            .map(
              (project) =>
                `• **${project.key}** - ${project.name}\n  📂 Type: ${project.projectTypeKey || "Unknown"}\n  📊 Category: ${project.category?.name || "None"}`,
            )
            .join("\n\n")}`;
        }

        return `**Project Search Results:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;

      case "search_jira_boards":
        // Handle board search results
        if (data.error) {
          return `⚠️ **Board Search Error:** ${data.error}`;
        }

        // Parse the formatted response text from our MCP server
        if (typeof data === "string") {
          return data; // Already formatted by server
        }

        // Fallback: format raw board array
        if (Array.isArray(data)) {
          return `**📋 Found ${data.length} Boards:**\n${data
            .map(
              (board) =>
                `• **${board.name}** (${board.type})\n  🎯 Active Sprints: ${board.activeSprints?.length || 0}\n  🏗️ Projects: ${board.projects?.length || 0}\n  ⚙️ Columns: ${board.config?.columns?.length || "Unknown"}`,
            )
            .join("\n\n")}`;
        }

        return `**Board Search Results:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;

      case "search_projects_with_boards":
        // Handle combined project+board search results
        if (data.error) {
          return `⚠️ **Combined Search Error:** ${data.error}`;
        }

        // Parse the formatted response text from our MCP server
        if (typeof data === "string") {
          return data; // Already formatted by server
        }

        // Fallback: format raw combined array
        if (Array.isArray(data)) {
          return `**🏗️ Found ${data.length} Projects with Boards:**\n${data
            .map(
              (item) =>
                `• **${item.project.key}** - ${item.project.name}\n  📋 Boards: ${item.boards.length}\n  ${item.boards.map((b) => `    - ${b.name} (${b.type})`).join("\n  ")}`,
            )
            .join("\n\n")}`;
        }

        return `**Combined Search Results:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;

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

      case "fetch_jira_project_tree":
        // Handle JIRA project tree results
        if (data.error) {
          return `⚠️ **Project Tree Error:** ${data.error}`;
        }

        if (data.project && data.epics) {
          const stats = data.stats || {};
          let formatted = `**🌳 Project Tree: ${data.project}**\n\n`;

          formatted += `**📊 Project Statistics:**\n`;
          formatted += `• **Epics:** ${stats.epics || 0}\n`;
          formatted += `• **Issues:** ${stats.children || 0}\n`;
          formatted += `• **Subtasks:** ${stats.subtasks || 0}\n`;
          formatted += `• **Levels:** ${data.levels || 3}\n\n`;

          if (data.epics && data.epics.length > 0) {
            formatted += `**🎯 Epic Breakdown:**\n`;
            data.epics.slice(0, 5).forEach((epic: any) => {
              const childCount = epic.children?.length || 0;
              const subtaskCount =
                epic.children?.reduce(
                  (sum: number, child: any) =>
                    sum + (child.subtasks?.length || 0),
                  0,
                ) || 0;

              formatted += `• **${epic.key}** - ${epic.summary}\n`;
              formatted += `  📊 Status: ${epic.status || "Unknown"}\n`;
              formatted += `  👤 Assignee: ${epic.assignee || "Unassigned"}\n`;
              formatted += `  📋 Issues: ${childCount} | Subtasks: ${subtaskCount}\n`;
              if (epic.storyPoints) {
                formatted += `  🎯 Story Points: ${epic.storyPoints}\n`;
              }
              formatted += `\n`;
            });

            if (data.epics.length > 5) {
              formatted += `... and ${data.epics.length - 5} more epics\n\n`;
            }
          }

          return formatted;
        }

        // Fallback for unexpected format
        return `**Project Tree Results:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;

      default:
        return `**${action.description}:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
    }
  } catch (error) {
    console.error("Error formatting MCP response:", error);
    return `**${action.description}:**\n${response}`;
  }
}
