/**
 * Jira Quick Actions - static placeholders that execute deterministic queries.
 * These prompts are phrased to hit specific branches in matchQuery().
 */

export interface QuickAction {
  label: string;
  prompt: string;
  ariaLabel?: string;
}

export interface QuickActionGroup {
  title: string;
  description?: string;
  items: QuickAction[];
}

export const jiraQuickActions: QuickActionGroup[] = [
  {
    title: "Tickets",
    description: "Direct ticket lookups and status commands",
    items: [
      { label: "Show me ticket SCRUM-8", prompt: "Show me ticket SCRUM-8" },
      { label: "Status-SCRUM-8", prompt: "Status-SCRUM-8" },
      { label: "Show me ticket SCRUM-1", prompt: "Show me ticket SCRUM-1" },
      { label: "Show me ticket SCRUM-3", prompt: "Show me ticket SCRUM-3" },
      { label: "Show me ticket SCRUM-4", prompt: "Show me ticket SCRUM-4" },
      { label: "Show me ticket SCRUM-7", prompt: "Show me ticket SCRUM-7" },
      { label: "Show me ticket SCRUM-13", prompt: "Show me ticket SCRUM-13" },
      { label: "Show me ticket SCRUM-25", prompt: "Show me ticket SCRUM-25" },
      { label: "Show me ticket SCRUM-26", prompt: "Show me ticket SCRUM-26" },
      { label: "Show me ticket SCRUM-28", prompt: "Show me ticket SCRUM-28" },
      { label: "Show me ticket HWP-1", prompt: "Show me ticket HWP-1" },
    ],
  },
  {
    title: "Epic",
    description: "Epic details and project breakdowns",
    items: [
      {
        label: "get details for epic HELLO WORLD EPIC",
        prompt: "get details for epic HELLO WORLD EPIC",
      },
      { label: "project SCRUM tree", prompt: "project SCRUM tree" },
    ],
  },
  {
    title: "Projects",
    description: "Search and list projects",
    items: [
      { label: "search project SCRUM", prompt: "search project SCRUM" },
      { label: "search project HWP", prompt: "search project HWP" },
      { label: "list projects", prompt: "list projects" },
    ],
  },
  {
    title: "Boards",
    description: "Boards by project and type",
    items: [
      {
        label: "list scrum boards for project SCRUM",
        prompt: "list scrum boards for project SCRUM",
      },
      {
        label: "list boards for project HWP",
        prompt: "list boards for project HWP",
      },
    ],
  },
  {
    title: "Sprint",
    description: "Active sprint information",
    items: [
      { label: "project SCRUM sprint", prompt: "project SCRUM sprint" },
      {
        label: "which sprint is active right now in my scrum project?",
        prompt: "which sprint is active right now in my scrum project?",
      },
    ],
  },
  {
    title: "Blockers",
    description: "Analyze blockers for a ticket",
    items: [
      { label: "blockers for SCRUM-25", prompt: "blockers for SCRUM-25" },
    ],
  },
  {
    title: "Release Notes",
    description: "Generate release notes guidance",
    items: [
      {
        label: "generate release notes for version 1.0.0",
        prompt: "generate release notes for version 1.0.0",
      },
      {
        label: "what can we put in release notes for the last update of SCRUM?",
        prompt:
          "what can we put in release notes for the last update of SCRUM?",
      },
    ],
  },
];

/**
 * Flattened deterministic prompts derived from jiraQuickActions.
 * Use in dropdowns like DeterministicSearchBar suggestions.
 */
export const jiraDeterministicPrompts: string[] = jiraQuickActions.flatMap(
  (g) => g.items.map((i) => i.prompt),
);
