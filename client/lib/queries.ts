import type { QueryTemplate } from "@/components/chat/types";

export const deterministicQueries: QueryTemplate[] = [
  {
    id: "q1",
    label: "Get Jira issue SCRUM-8 details",
    template:
      "Show details for issue SCRUM-8 including status, assignee, and blockers.",
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
  // Perplexity predefined queries
  {
    id: "p1",
    label: "Search: React 19 release notes (latest)",
    template: "search React 19 release notes latest",
  },
  {
    id: "p2",
    label: "Search: TypeScript generics best practices",
    template: "search TypeScript generics best practices",
  },
  {
    id: "p3",
    label: "Search: Node.js LTS news (recent)",
    template: "search Node.js LTS recent",
  },
  {
    id: "p4",
    label: "Perplexity Space: RAG",
    template: "space named RAG",
  },
  {
    id: "p5",
    label: "Perplexity User: your handle",
    template: "perplexity user @your-handle",
  },
];
