// MCP Fixtures Adapter (default mode)
// Provides deterministic tool results and resource reads for development and tests.

import type { JiraProjectTreeResponse } from "@shared/api";

export const fixturesEnabledByDefault = true;

type Tool = {
  name: string;
  description: string;
  inputSchema?: any;
};

type McpTextContent = {
  type: "text";
  text: string;
};

type McpJsonContent = {
  type: "json";
  json: unknown;
};

type ToolEnvelope = {
  content: Array<McpTextContent | McpJsonContent>;
};

function wrapResult(result: unknown): ToolEnvelope {
  if (
    result &&
    typeof result === "object" &&
    "content" in (result as Record<string, unknown>)
  ) {
    return result as ToolEnvelope;
  }

  if (typeof result === "string") {
    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  }

  const jsonPayload = result ?? {};
  const text = JSON.stringify(jsonPayload, null, 2);

  return {
    content: [
      {
        type: "text",
        text,
      },
      {
        type: "json",
        json: jsonPayload,
      },
    ],
  };
}

// ---- Tool registry (no Perplexity tools yet) ----
const tools: Tool[] = [
  {
    name: "fetch_ticket",
    description: "Fetch details for a JIRA ticket by key (fixtures)",
    inputSchema: {
      type: "object",
      properties: { ticketKey: { type: "string" } },
      required: ["ticketKey"],
    },
  },
  {
    name: "fetch_jira_project_tree",
    description:
      "Fetch a 3-level JIRA project tree: Project → Epics → Issues → Subtasks (fixtures)",
    inputSchema: {
      type: "object",
      properties: {
        projectKeyOrId: { type: "string" },
        pageSize: { type: "number" },
      },
      required: ["projectKeyOrId"],
    },
  },
  {
    name: "search_jira_projects",
    description: "Search or list JIRA projects (fixtures)",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        status: { type: "string" },
        maxResults: { type: "number" },
      },
    },
  },
  {
    name: "fetch_current_sprint",
    description: "Get current sprint summary (fixtures)",
    inputSchema: {
      type: "object",
      properties: { projectKey: { type: "string" } },
      required: ["projectKey"],
    },
  },
  {
    name: "search_projects_with_boards",
    description: "List projects and boards with active sprints (fixtures)",
    inputSchema: {
      type: "object",
      properties: {
        includeActiveSprints: { type: "boolean" },
        includeConfig: { type: "boolean" },
        projectStatus: { type: "string" },
      },
    },
  },
  {
    name: "process_text",
    description:
      "Process a text command, extracting ticket references and returning a summary (fixtures)",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
  },
];

export function fixturesListTools() {
  return { tools };
}

export function fixturesListResources() {
  return { resources: [] };
}

// ---- Tool handlers ----

function loadScrum8(): any {
  // Inline minimal fixture to avoid fs reads in sandbox
  return {
    key: "SCRUM-8",
    summary: "Sample ticket SCRUM-8 - API Integration Issue",
    status: "In Progress",
    assignee: "John Doe",
    priority: "High",
    description: "Investigate API integration failures and implement retries.",
    blockers: ["Waiting on credentials rotation"],
  };
}

function handleFetchTicket(args: any) {
  const key = String(args?.ticketKey || "").trim().toUpperCase();
  if (!key) return { error: "ticketKey is required" };
  if (key === "SCRUM-8") return loadScrum8();
  // Unknown tickets return a simple not-found shape suitable for UI
  return { error: `Ticket not found: ${key}`, status: "error" };
}

function handleProjectTree(args: any): JiraProjectTreeResponse | any {
  const project = String(args?.projectKeyOrId || "WEB");
  return {
    project,
    levels: 3,
    stats: { epics: 2, children: 4, subtasks: 3 },
    epics: [
      {
        id: "10001",
        key: `${project}-1`,
        summary: "Epic: Authentication overhaul",
        status: "In Progress",
        issuetype: "Epic",
        priority: "High",
        assignee: "Lead Dev",
        reporter: "PM",
        storyPoints: 13,
        sprint: null,
        timeTracking: {
          originalEstimate: null,
          remainingEstimate: null,
          timeSpent: null,
          originalEstimateSeconds: null,
          remainingEstimateSeconds: null,
          timeSpentSeconds: null,
          aggregate: {
            originalEstimateSeconds: null,
            remainingEstimateSeconds: null,
            timeSpentSeconds: null,
          },
        },
        children: [
          {
            id: "20001",
            key: `${project}-10`,
            summary: "Implement OAuth2 login flow",
            status: "In Progress",
            issuetype: "Story",
            priority: "High",
            assignee: "Dev A",
            reporter: "PM",
            storyPoints: 5,
            sprint: null,
            timeTracking: {
              originalEstimate: null,
              remainingEstimate: null,
              timeSpent: null,
              originalEstimateSeconds: null,
              remainingEstimateSeconds: null,
              timeSpentSeconds: null,
              aggregate: {
                originalEstimateSeconds: null,
                remainingEstimateSeconds: null,
                timeSpentSeconds: null,
              },
            },
            subtasks: [
              {
                id: "30001",
                key: `${project}-11`,
                summary: "Add login UI",
                status: "To Do",
                issuetype: "Sub-task",
                priority: "Medium",
                assignee: "Dev B",
                reporter: "PM",
                storyPoints: null,
                sprint: null,
                timeTracking: {
                  originalEstimate: null,
                  remainingEstimate: null,
                  timeSpent: null,
                  originalEstimateSeconds: null,
                  remainingEstimateSeconds: null,
                  timeSpentSeconds: null,
                  aggregate: {
                    originalEstimateSeconds: null,
                    remainingEstimateSeconds: null,
                    timeSpentSeconds: null,
                  },
                },
              },
            ],
          },
          {
            id: "20002",
            key: `${project}-12`,
            summary: "Implement token refresh",
            status: "To Do",
            issuetype: "Task",
            priority: "Medium",
            assignee: "Dev C",
            reporter: "PM",
            storyPoints: 3,
            sprint: null,
            timeTracking: {
              originalEstimate: null,
              remainingEstimate: null,
              timeSpent: null,
              originalEstimateSeconds: null,
              remainingEstimateSeconds: null,
              timeSpentSeconds: null,
              aggregate: {
                originalEstimateSeconds: null,
                remainingEstimateSeconds: null,
                timeSpentSeconds: null,
              },
            },
            subtasks: [],
          },
        ],
      },
      {
        id: "10002",
        key: `${project}-2`,
        summary: "Epic: Performance improvements",
        status: "To Do",
        issuetype: "Epic",
        priority: "Medium",
        assignee: null,
        reporter: "PM",
        storyPoints: 8,
        sprint: null,
        timeTracking: {
          originalEstimate: null,
          remainingEstimate: null,
          timeSpent: null,
          originalEstimateSeconds: null,
          remainingEstimateSeconds: null,
          timeSpentSeconds: null,
          aggregate: {
            originalEstimateSeconds: null,
            remainingEstimateSeconds: null,
            timeSpentSeconds: null,
          },
        },
        children: [
          {
            id: "20003",
            key: `${project}-20`,
            summary: "Optimize DB queries",
            status: "To Do",
            issuetype: "Story",
            priority: "Low",
            assignee: null,
            reporter: "PM",
            storyPoints: null,
            sprint: null,
            timeTracking: {
              originalEstimate: null,
              remainingEstimate: null,
              timeSpent: null,
              originalEstimateSeconds: null,
              remainingEstimateSeconds: null,
              timeSpentSeconds: null,
              aggregate: {
                originalEstimateSeconds: null,
                remainingEstimateSeconds: null,
                timeSpentSeconds: null,
              },
            },
            subtasks: [
              {
                id: "30002",
                key: `${project}-21`,
                summary: "Add DB indices",
                status: "To Do",
                issuetype: "Sub-task",
                priority: "Low",
                assignee: null,
                reporter: "PM",
                storyPoints: null,
                sprint: null,
                timeTracking: {
                  originalEstimate: null,
                  remainingEstimate: null,
                  timeSpent: null,
                  originalEstimateSeconds: null,
                  remainingEstimateSeconds: null,
                  timeSpentSeconds: null,
                  aggregate: {
                    originalEstimateSeconds: null,
                    remainingEstimateSeconds: null,
                    timeSpentSeconds: null,
                  },
                },
              },
              {
                id: "30003",
                key: `${project}-22`,
                summary: "Analyze slow queries",
                status: "To Do",
                issuetype: "Sub-task",
                priority: "Low",
                assignee: null,
                reporter: "PM",
                storyPoints: null,
                sprint: null,
                timeTracking: {
                  originalEstimate: null,
                  remainingEstimate: null,
                  timeSpent: null,
                  originalEstimateSeconds: null,
                  remainingEstimateSeconds: null,
                  timeSpentSeconds: null,
                  aggregate: {
                    originalEstimateSeconds: null,
                    remainingEstimateSeconds: null,
                    timeSpentSeconds: null,
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  } satisfies JiraProjectTreeResponse;
}

function handleSearchProjects(_args: any) {
  return [
    { key: "SCRUM", name: "Scrum Project", projectTypeKey: "software", category: { name: "Engineering" } },
    { key: "HWP", name: "Hardware", projectTypeKey: "business", category: { name: "Ops" } },
  ];
}

function handleCurrentSprint(args: any) {
  const projectKey = String(args?.projectKey || "SCRUM");
  return {
    activeSprints: [
      {
        name: `${projectKey} Sprint 24`,
        boardName: `${projectKey} Team Board`,
        goal: "Deliver authentication and performance improvements",
        startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
        endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      },
    ],
  };
}

function handleProjectsWithBoards(_args: any) {
  // Return a formatted string so the client displays a Sprint Summary (for tests)
  return (
    "**Sprint Summary:**\n" +
    "• SCRUM Sprint 24 - Goal: Deliver authentication and performance improvements\n" +
    "• WEB Sprint 7 - Goal: Platform stability and minor features"
  );
}

function handleProcessText(args: any) {
  const text = String(args?.text || "");
  const m = text.match(/\b([A-Z][A-Z0-9]+-\d+)\b/);
  if (m) {
    const ticketKey = m[1];
    return handleFetchTicket({ ticketKey });
  }
  return { message: "No actionable entities found in text" };
}

export async function fixturesCallTool(
  name: string,
  args: Record<string, any>,
  _headers?: Record<string, string>,
) {
  switch (name) {
    case "fetch_ticket":
    case "fetch_jira_ticket":
      return wrapResult(handleFetchTicket(args));
    case "fetch_jira_project_tree":
      return wrapResult(handleProjectTree(args));
    case "search_jira_projects":
      return wrapResult(handleSearchProjects(args));
    case "fetch_current_sprint":
      return wrapResult(handleCurrentSprint(args));
    case "search_projects_with_boards":
      return wrapResult(handleProjectsWithBoards(args));
    case "process_text":
      return wrapResult(handleProcessText(args));
    default:
      return wrapResult({ error: `Unknown tool: ${name}` });
  }
}

export async function fixturesReadResource(_uri: string) {
  // No resources in fixtures yet
  return { contents: [{ type: "text", text: "" }] };
}
