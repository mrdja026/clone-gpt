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

// Jira types used in both client and server
export interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  assignee?: string; // Jira display name or undefined
  priority?: string;
  description: string;
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
