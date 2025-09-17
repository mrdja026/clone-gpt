import { LaneAOutput, LaneBOutput, LaneCInput, LaneCOutput } from "@shared/api";

export interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface LaneCConfig {
  modelName: string;
  ollamaUrl: string;
  temperature?: number;
  maxTokens?: number;
}

export interface DataAnalysisPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export interface GeneralChatPrompt {
  systemPrompt: string;
  userPrompt: string;
}
