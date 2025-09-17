import { JiraProjectTreeService } from "../../services/jira-project-tree.service";
import type { JiraProjectTreeResponse } from "@shared/api";

export interface JiraProjectTreeTool {
  name: "fetch_jira_project_tree";
  description: string;
  inputSchema: {
    type: "object";
    properties: {
      projectKeyOrId: {
        type: "string";
        description: "The JIRA project key (e.g., 'WEB') or project ID (e.g., '10010')";
      };
      pageSize: {
        type: "number";
        description: "Number of items to fetch per page (default: 100)";
        default: 100;
      };
    };
    required: ["projectKeyOrId"];
  };
}

export async function handleJiraProjectTreeTool(
  args: { projectKeyOrId: string; pageSize?: number },
  projectTreeService: JiraProjectTreeService,
): Promise<JiraProjectTreeResponse> {
  try {
    const result = await projectTreeService.getProjectTreeForMcp(
      args.projectKeyOrId,
      args.pageSize,
    );

    return result;
  } catch (error: any) {
    throw new Error(`Failed to fetch JIRA project tree: ${error.message}`);
  }
}

export const JIRA_PROJECT_TREE_TOOL: JiraProjectTreeTool = {
  name: "fetch_jira_project_tree",
  description:
    "Fetch a complete 3-level JIRA project tree: Project → Epics → Issues → Subtasks. This tool provides a comprehensive view of project structure including epics, their child issues (stories/tasks/bugs), and subtasks. Includes story points, time tracking, assignees, and status information.",
  inputSchema: {
    type: "object",
    properties: {
      projectKeyOrId: {
        type: "string",
        description:
          "The JIRA project key (e.g., 'WEB') or project ID (e.g., '10010')",
      },
      pageSize: {
        type: "number",
        description: "Number of items to fetch per page (default: 100)",
        default: 100,
      },
    },
    required: ["projectKeyOrId"],
  },
};
