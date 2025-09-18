import type { QueryTemplate } from "@/components/chat/types";

export const deterministicQueries: QueryTemplate[] = [
  // Tickets and tasks (SCRUM-prefixed)
  { id: "t-scrum-8", label: "Ticket details - SCRUM-8", template: "SCRUM-8" },
  {
    id: "t-status-scrum-8",
    label: "Ticket status - SCRUM-8",
    template: "Status-SCRUM-8",
  },
  {
    id: "t-realstatus-scrum-8",
    label: "Live ticket status - SCRUM-8",
    template: "RealStatus-SCRUM-8",
  },
  {
    id: "t-blockers-scrum-25",
    label: "Blockers - SCRUM-25",
    template: "blockers for SCRUM-25",
  },

  // Boards (SCRUM and HWP/HWB)
  {
    id: "b-list-scrum",
    label: "List scrum boards for project SCRUM",
    template: "list scrum boards for project SCRUM",
  },
  {
    id: "b-list-hwp",
    label: "List boards for project HWP",
    template: "list boards for project HWP",
  },
  {
    id: "b-list-hwb",
    label: "List boards for project HWB",
    template: "list boards for project HWB",
  },
  {
    id: "b-scrum-active",
    label: "Search scrum boards with active sprints",
    template: "search scrum boards with active sprints",
  },

  // Projects (SCRUM, HWP)
  {
    id: "p-search-scrum",
    label: "Search project SCRUM",
    template: "search project SCRUM",
  },
  {
    id: "p-search-hwp",
    label: "Search project HWP",
    template: "search project HWP",
  },
  { id: "p-list", label: "List projects", template: "list projects" },
  {
    id: "p-with-boards",
    label: "Search projects with boards",
    template: "search projects with boards",
  },

  // Project tree (3 levels)
  {
    id: "tree-scrum",
    label: "3-level project tree - SCRUM",
    template: "Show me the complete 3-level project tree for SCRUM",
  },
  {
    id: "tree-hwp",
    label: "3-level project tree - HWP",
    template: "Show me the complete 3-level project tree for HWP",
  },

  // Sprints (active sprint info)
  {
    id: "s-scrum",
    label: "Current sprint - SCRUM",
    template: "project SCRUM sprint",
  },
  {
    id: "s-active",
    label: "Which sprint is active now (SCRUM)",
    template: "which sprint is active right now in my scrum project?",
  },

  // Updates and release notes
  {
    id: "rn-100",
    label: "Generate release notes v1.0.0",
    template: "generate release notes for version 1.0.0",
  },
  {
    id: "rn-scrum",
    label: "Release notes ideas for SCRUM",
    template: "what can we put in release notes for the last update of SCRUM?",
  },
];
