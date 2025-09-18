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

// ---------------------------------------------
// Jira Use Case Catalog (grouped, with placeholders)
// ---------------------------------------------

export interface JiraUseCasePlaceholder {
  name: string;
  hint?: string;
  example?: string;
  // String form of a RegExp for simple client-side validation
  validator?: string;
}

export interface JiraUseCaseItem {
  id: string;
  label: string;
  // Deterministic prompt template that the matcher understands
  template: string;
  // Friendly description explaining what this does and how to fill placeholders
  friendly?: string;
  placeholders?: JiraUseCasePlaceholder[];
  // Optional quick-run example with placeholders already filled
  exampleFilled?: string;
}

export interface JiraUseCaseGroup {
  title: string;
  description?: string;
  items: JiraUseCaseItem[];
}

// Common validators (string form)
const RE_TICKET_KEY = "^[A-Z][A-Z0-9]+-\\d+$";
const RE_PROJECT_KEY = "^[A-Z][A-Z0-9-]+$";
const RE_VERSION = "^v?\\d+\\.\\d+(?:\\.\\d+)?$";

// Exported catalog consumed by PostLoginPage
export const jiraUseCaseGroups: JiraUseCaseGroup[] = [
  {
    title: "Tickets",
    description:
      "Fetch deep ticket info, quick status, and analyze blockers. Replace placeholders before sending.",
    items: [
      {
        id: "uc-ticket-details",
        label: "Ticket details by key",
        template: "{TICKET_KEY}",
        friendly:
          "Fetch full ticket details (summary, status, story points, sprints, time tracking, linked issues). Replace {TICKET_KEY}, e.g., SCRUM-8.",
        placeholders: [
          {
            name: "TICKET_KEY",
            hint: "Ticket key like ABC-123",
            example: "SCRUM-8",
            validator: RE_TICKET_KEY,
          },
        ],
        exampleFilled: "SCRUM-8",
      },
      {
        id: "uc-ticket-status",
        label: "Quick ticket status",
        template: "Status-{TICKET_KEY}",
        friendly:
          "Get the ticket status in a single glance. Replace {TICKET_KEY}, e.g., Status-SCRUM-8.",
        placeholders: [
          {
            name: "TICKET_KEY",
            hint: "Ticket key like ABC-123",
            example: "SCRUM-8",
            validator: RE_TICKET_KEY,
          },
        ],
        exampleFilled: "Status-SCRUM-8",
      },
      {
        id: "uc-ticket-realstatus",
        label: "Live ticket status",
        template: "RealStatus-{TICKET_KEY}",
        friendly:
          "Request the live/current status. Replace {TICKET_KEY}, e.g., RealStatus-SCRUM-8.",
        placeholders: [
          {
            name: "TICKET_KEY",
            hint: "Ticket key like ABC-123",
            example: "SCRUM-8",
            validator: RE_TICKET_KEY,
          },
        ],
        exampleFilled: "RealStatus-SCRUM-8",
      },
      {
        id: "uc-ticket-blockers",
        label: "Blockers for a ticket",
        template: "blockers for {TICKET_KEY}",
        friendly:
          "Identify blockers by analyzing linked issues (e.g., “Blocks/Is blocked by”). Replace {TICKET_KEY}, e.g., blockers for SCRUM-25.",
        placeholders: [
          {
            name: "TICKET_KEY",
            hint: "Ticket key like ABC-123",
            example: "SCRUM-25",
            validator: RE_TICKET_KEY,
          },
        ],
        exampleFilled: "blockers for SCRUM-25",
      },
    ],
  },
  {
    title: "Projects",
    description:
      "Search or list projects to verify keys and discover portfolio items.",
    items: [
      {
        id: "uc-project-search",
        label: "Search a project by key",
        template: "search project {PROJECT_KEY}",
        friendly:
          "Search for a project and view details. Replace {PROJECT_KEY}, e.g., SCRUM or HWP.",
        placeholders: [
          {
            name: "PROJECT_KEY",
            hint: "Project key (e.g., SCRUM, HWP)",
            example: "SCRUM",
            validator: RE_PROJECT_KEY,
          },
        ],
        exampleFilled: "search project SCRUM",
      },
      {
        id: "uc-project-list",
        label: "List all projects",
        template: "list projects",
        friendly:
          "List available projects (active by default). Useful for getting an overview.",
        exampleFilled: "list projects",
      },
      {
        id: "uc-projects-with-boards",
        label: "Projects with boards",
        template: "search projects with boards",
        friendly:
          "Portfolio overview showing projects and their boards (with active sprints when available).",
        exampleFilled: "search projects with boards",
      },
    ],
  },
  {
    title: "Boards",
    description:
      "Discover boards for your projects and check active sprints and configurations.",
    items: [
      {
        id: "uc-boards-list",
        label: "List boards for a project",
        template: "list boards for project {PROJECT_KEY}",
        friendly:
          "List all boards linked to a project. Replace {PROJECT_KEY}, e.g., SCRUM.",
        placeholders: [
          {
            name: "PROJECT_KEY",
            hint: "Project key (e.g., SCRUM, HWP, HWB)",
            example: "SCRUM",
            validator: RE_PROJECT_KEY,
          },
        ],
        exampleFilled: "list boards for project SCRUM",
      },
      {
        id: "uc-boards-list-scrum",
        label: "List scrum boards for a project",
        template: "list scrum boards for project {PROJECT_KEY}",
        friendly:
          "Narrow to scrum boards for the given project. Replace {PROJECT_KEY}.",
        placeholders: [
          {
            name: "PROJECT_KEY",
            hint: "Project key (e.g., SCRUM)",
            example: "SCRUM",
            validator: RE_PROJECT_KEY,
          },
        ],
        exampleFilled: "list scrum boards for project SCRUM",
      },
      {
        id: "uc-boards-active-sprints",
        label: "Scrum boards with active sprints",
        template: "search scrum boards with active sprints",
        friendly:
          "Find scrum boards that currently have active sprints (useful for prioritizing teams).",
        exampleFilled: "search scrum boards with active sprints",
      },
    ],
  },
  {
    title: "Project Tree (3 levels)",
    description:
      "Project → Epics → Issues → Subtasks with story points and time tracking.",
    items: [
      {
        id: "uc-project-tree",
        label: "3-level project tree",
        template: "Show me the complete 3-level project tree for {PROJECT_KEY}",
        friendly:
          "Build a full hierarchical snapshot for planning and oversight. Replace {PROJECT_KEY}, e.g., SCRUM.",
        placeholders: [
          {
            name: "PROJECT_KEY",
            hint: "Project key (e.g., SCRUM, HWP)",
            example: "SCRUM",
            validator: RE_PROJECT_KEY,
          },
        ],
        exampleFilled: "Show me the complete 3-level project tree for SCRUM",
      },
    ],
  },
  {
    title: "Sprints",
    description:
      "Quickly check the current sprint for a project and verify sprint activity.",
    items: [
      {
        id: "uc-current-sprint",
        label: "Current sprint for a project",
        template: "project {PROJECT_KEY} sprint",
        friendly:
          "Discover the current sprint for a given project (via an associated board). Replace {PROJECT_KEY}.",
        placeholders: [
          {
            name: "PROJECT_KEY",
            hint: "Project key (e.g., SCRUM)",
            example: "SCRUM",
            validator: RE_PROJECT_KEY,
          },
        ],
        exampleFilled: "project SCRUM sprint",
      },
      {
        id: "uc-active-sprint-generic",
        label: "Which sprint is active now (SCRUM)?",
        template: "which sprint is active right now in my scrum project?",
        friendly:
          "Generic question for the active sprint in your scrum project. Use when a specific project key is implied.",
        exampleFilled: "which sprint is active right now in my scrum project?",
      },
    ],
  },
  {
    title: "Release Notes",
    description:
      "Compose and guide release notes from ticket and project context.",
    items: [
      {
        id: "uc-release-notes-version",
        label: "Generate release notes for a version",
        template: "generate release notes for version {VERSION}",
        friendly:
          "Produce a structured release notes draft for a version. Replace {VERSION}, e.g., v1.0.0.",
        placeholders: [
          {
            name: "VERSION",
            hint: "Semantic version (e.g., v1.0.0 or 1.2.3)",
            example: "v1.0.0",
            validator: RE_VERSION,
          },
        ],
        exampleFilled: "generate release notes for version v1.0.0",
      },
      {
        id: "uc-release-notes-project",
        label: "Release notes ideas for a project",
        template:
          "what can we put in release notes for the last update of {PROJECT_KEY}?",
        friendly:
          "Ask for a project-focused summary of notable changes. Replace {PROJECT_KEY}, e.g., SCRUM.",
        placeholders: [
          {
            name: "PROJECT_KEY",
            hint: "Project key (e.g., SCRUM)",
            example: "SCRUM",
            validator: RE_PROJECT_KEY,
          },
        ],
        exampleFilled:
          "what can we put in release notes for the last update of SCRUM?",
      },
    ],
  },
  {
    title: "Identity (optional)",
    description:
      "Sanity checks for credentials. This requires STDIO MCP or compatible HTTP bridge.",
    items: [
      {
        id: "uc-jira-whoami",
        label: "Who am I in Jira?",
        template: "whoami",
        friendly:
          "Verify Jira identity and credentials. Useful before other actions.",
        exampleFilled: "whoami",
      },
    ],
  },
];
