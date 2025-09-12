export type Role = "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  groupId?: string; // Conversations that share the same groupId appear as tabs (branches)
  createdAt: number;
}

export interface QueryTemplate {
  id: string;
  label: string;
  template: string;
}
