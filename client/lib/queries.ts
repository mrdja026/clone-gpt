import type { QueryTemplate } from "@/components/chat/types";

export const deterministicQueries: QueryTemplate[] = [
  {
    id: "q1",
    label: "Get Jira issue ABC-123 details",
    template:
      "Show details for issue ABC-123 including status, assignee, and blockers.",
  },
  {
    id: "q2",
    label: "List my issues by priority",
    template: "List all issues assigned to me ordered by priority with links.",
  },
  {
    id: "q3",
    label: "Release notes for vX.Y.Z",
    template:
      "Generate concise release notes for version v1.2.3 from merged tickets.",
  },
  {
    id: "q4",
    label: "Find blockers for EPIC-1",
    template:
      "What are the current blockers for epic EPIC-1 and action items to unblock?",
  },
  {
    id: "q5",
    label: "Sprint plan for TEAM A",
    template:
      "Create a 2-week sprint plan for team TEAM-A targeting 30 story points based on backlog.",
  },
];

