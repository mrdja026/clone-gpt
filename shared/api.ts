/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
  timestamp?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
}

export interface ChatResponse {
  message: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface PersistentChatRequest extends ChatRequest {
  chatId?: string;
  userId?: string;
  autoSave?: boolean;
}

export interface PersistentChatResponse extends ChatResponse {
  chatId: string;
}

export interface DBMessage {
  id: string;
  chat_id: string;
  content: string;
  role: "user" | "assistant";
  created_at: string;
}

export interface DBChat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

export interface QueryTemplate {
  id: string;
  title: string;
  template: string;
  category: string;
  created_at: string;
  updated_at: string;
}

// Enhanced Jira types used in both client and server
export interface JiraTicket {
  // Basic identification
  key: string;
  id: string;
  self: string;
  summary: string;
  description: string;

  // Status and workflow
  status: {
    name: string;
    id: string;
    statusCategory: string;
    description: string;
  };

  // Issue classification
  issueType: {
    name: string;
    id: string;
    description: string;
    iconUrl: string;
  };

  // Priority
  priority: {
    name: string;
    id: string | null;
    iconUrl: string | null;
  };

  // People
  assignee: {
    displayName: string;
    accountId: string | null;
    emailAddress?: string;
    avatarUrls?: any;
  };

  reporter: {
    displayName: string;
    accountId: string | null;
    emailAddress?: string;
    avatarUrls?: any;
  };

  // Dates
  created: string;
  updated: string;
  duedate: string | null;
  resolutiondate: string | null;

  // Project information
  project: {
    key: string;
    name: string;
    id: string;
    projectTypeKey: string;
  };

  // Resolution
  resolution: {
    name: string;
    description: string;
  } | null;

  // Components and versions
  components: Array<{
    name: string;
    id: string;
    description: string;
  }>;

  fixVersions: Array<{
    name: string;
    id: string;
    description: string;
    released: boolean;
    releaseDate: string | null;
  }>;

  affectedVersions: Array<{
    name: string;
    id: string;
    description: string;
    released: boolean;
    releaseDate: string | null;
  }>;

  // Labels and environment
  labels: string[];
  environment: string | null;

  // Story points and time tracking
  storyPoints: number | null;
  timeTracking: {
    originalEstimate?: string;
    remainingEstimate?: string;
    timeSpent?: string;
    originalEstimateSeconds?: number;
    remainingEstimateSeconds?: number;
    timeSpentSeconds?: number;
  } | null;

  // Security
  security: {
    name: string;
    description: string;
  } | null;

  // Linked issues
  linkedIssues: Array<{
    id: string;
    type: {
      name: string;
      inward: string;
      outward: string;
    };
    inwardIssue: {
      key: string;
      summary: string;
      status: string;
      priority: string;
    } | null;
    outwardIssue: {
      key: string;
      summary: string;
      status: string;
      priority: string;
    } | null;
  }>;

  // Attachments and comments
  attachmentsCount: number;
  attachments: Array<{
    id: string;
    filename: string;
    size: number;
    mimeType: string;
    created: string;
    author: string;
  }>;

  commentsCount: number;
  recentComments: Array<{
    id: string;
    author: string;
    body: string;
    created: string;
    updated: string;
  }>;

  // Activity metrics
  watchersCount: number;
  votesCount: number;

  // Progress
  progress: {
    progress: number;
    total: number;
    percent: number;
  } | null;

  // Parent/child relationships
  parent: {
    key: string;
    summary: string;
    status: string;
  } | null;

  subtasks: Array<{
    key: string;
    summary: string;
    status: string;
    assignee: string;
  }>;

  // Legacy fields for backward compatibility
  blockers?: string[];
}

// Lane B types for query interpretation
export interface LaneBQueryRequest {
  query: string;
  context?: Record<string, any>;
}

export interface LaneBToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface LaneBResponse {
  type: "tool" | "chat";
  source: "gemma" | "matcher" | "chat";
  tool_calls?: LaneBToolCall[];
  chat?: string;
}

// Third Lane types for sequential AI processing
export interface LaneAOutput {
  detectedIntent: "jira_ticket" | "search" | "analysis" | "general_chat";
  ticketKey?: string;
  confidence: number;
  rawQuery: string;
}

export interface LaneBOutput {
  rawJson: any;
  formattedData: string;
  metadata: {
    source: string;
    timestamp: number;
    status: "success" | "error";
  };
}

export interface LaneCInput {
  rawData: LaneBOutput;
  userQuery: string;
  context: LaneAOutput;
  chatHistory?: ChatMessage[];
}

export interface LaneCOutput {
  analysis: string;
  insights: string[];
  recommendations: string[];
  confidence: number;
  mode: "data_analysis" | "general_chat";
}

export interface ThirdLaneRequest {
  userQuery: string;
  chatId?: string;
  chatHistory?: ChatMessage[];
  context?: Record<string, any>;
}

export interface ThirdLaneResponse {
  response: string;
  mode: "data_analysis" | "general_chat";
  analysis?: {
    insights: string[];
    recommendations: string[];
    confidence: number;
  };
  rawData?: LaneBOutput;
  chatId?: string;
  reasoningContext?: ReasoningContext;
}

// Reasoning Mode Types
export interface ReasoningContext {
  originalQuery: string;
  combinedData: {
    laneAOutput: LaneAOutput;
    laneBOutput: LaneBOutput;
    laneCOutput: LaneCOutput;
  };
  timestamp: number;
  sessionId: string;
}

export interface ReasoningModeRequest {
  message: string;
  context: ReasoningContext;
  chatHistory?: ChatMessage[];
  sessionId: string;
}

export interface ReasoningModeResponse {
  response: string;
  sessionId: string;
  contextUpdated?: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ReasoningSession {
  id: string;
  context: ReasoningContext;
  messages: ChatMessage[];
  createdAt: number;
  lastActivity: number;
}

// JIRA Project Tree types
export interface JiraProjectTreeIssue {
  id: string;
  key: string;
  summary: string | null;
  status: string | null;
  issuetype: string | null;
  priority: string | null;
  assignee: string | null;
  reporter: string | null;
  storyPoints: number | null;
  sprint: any;
  timeTracking: {
    originalEstimate: string | null;
    remainingEstimate: string | null;
    timeSpent: string | null;
    originalEstimateSeconds: number | null;
    remainingEstimateSeconds: number | null;
    timeSpentSeconds: number | null;
    aggregate: {
      originalEstimateSeconds: number | null;
      remainingEstimateSeconds: number | null;
      timeSpentSeconds: number | null;
    };
  };
  subtasks?: JiraProjectTreeIssue[];
}

export interface JiraProjectTreeEpic extends JiraProjectTreeIssue {
  children: JiraProjectTreeIssue[];
}

export interface JiraProjectTreeResponse {
  project: string | number;
  levels: number;
  stats: {
    epics: number;
    children: number;
    subtasks: number;
  };
  epics: JiraProjectTreeEpic[];
}

export interface JiraProjectTreeRequest {
  projectKeyOrId: string | number;
  pageSize?: number;
}
