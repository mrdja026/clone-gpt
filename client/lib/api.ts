import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  PersistentChatRequest,
  PersistentChatResponse,
  DBMessage,
} from "@shared/api";
// Minimal SSE parser for AI SDK DataStream protocol
function parseAiSdkDataStream(
  body: ReadableStream<Uint8Array>,
  onText: (t: string) => void,
): Promise<void> {
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = "";
  return (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Split by SSE message separator
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const lines = part.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data:")) {
              const payload = trimmed.slice(5).trim();
              try {
                const json = JSON.parse(payload);
                if (
                  json &&
                  json.type === "text-delta" &&
                  typeof json.text === "string"
                ) {
                  onText(json.text);
                } else if (typeof json === "string") {
                  onText(json);
                }
              } catch {
                // Not JSON, treat as raw text
                if (payload) onText(payload);
              }
            }
          }
        }
      }
      // Flush any residual buffer as plain text
      if (buffer) {
        onText(buffer);
      }
    } finally {
      reader.releaseLock();
    }
  })();
}

// Legacy API functions (for backward compatibility)
export async function callModel(
  prompt: string,
  conversationHistory: ChatMessage[] = [],
): Promise<string> {
  try {
    const messages = conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    messages.push({
      role: "user" as const,
      content: prompt,
    });

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        systemPrompt:
          "You are JiraGPT, a helpful assistant specialized in project management, Jira workflows, and providing actionable insights for software development teams. Provide detailed analysis and practical suggestions.",
      } as ChatRequest),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ChatResponse = await response.json();
    return data.message;
  } catch (error) {
    console.error("Error calling AI model:", error);
    return `I'm sorry, I'm currently unable to process your request. This might be due to a network issue or the AI service being temporarily unavailable. Please try again in a moment.

If the problem persists, you can still use the branching feature to explore different conversation paths with your previous messages.`;
  }
}

export async function callModelStreaming(
  prompt: string,
  conversationHistory: ChatMessage[] = [],
  onUpdate: (chunk: string) => void,
): Promise<string> {
  try {
    const messages = conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    messages.push({
      role: "user" as const,
      content: prompt,
    });

    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        systemPrompt:
          "You are JiraGPT, a helpful assistant specialized in project management, Jira workflows, and providing actionable insights for software development teams. Provide detailed analysis and practical suggestions.",
      } as ChatRequest),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const ct = response.headers.get("Content-Type") || "";
    let fullText = "";

    if (ct.includes("text/event-stream")) {
      await parseAiSdkDataStream(response.body, (t) => {
        fullText += t;
        onUpdate(t);
      });
      return fullText;
    }

    // Fallback: raw chunked text
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        onUpdate(chunk);
      }
    } finally {
      reader.releaseLock();
    }

    return fullText;
  } catch (error) {
    console.error("Error calling AI model:", error);
    const fallbackMessage = `I'm sorry, I'm currently unable to process your request. This might be due to a network issue or the AI service being temporarily unavailable. Please try again in a moment.

If the problem persists, you can still use the branching feature to explore different conversation paths with your previous messages.`;
    onUpdate(fallbackMessage);
    return fallbackMessage;
  }
}

// Enhanced API functions with database persistence
export async function callPersistentModel(
  prompt: string,
  conversationHistory: ChatMessage[] = [],
  chatId?: string,
  userId?: string,
): Promise<{ message: string; chatId: string }> {
  try {
    const messages = conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    messages.push({
      role: "user" as const,
      content: prompt,
    });

    const response = await fetch("/api/chat/persistent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        chatId,
        userId,
        autoSave: true,
        systemPrompt:
          "You are JiraGPT, a helpful assistant specialized in project management, Jira workflows, and providing actionable insights for software development teams. Provide detailed analysis and practical suggestions.",
      } as PersistentChatRequest),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: PersistentChatResponse = await response.json();
    return { message: data.message, chatId: data.chatId };
  } catch (error) {
    console.error("Error calling persistent AI model:", error);
    throw error;
  }
}

export async function callPersistentModelStreaming(
  prompt: string,
  conversationHistory: ChatMessage[] = [],
  onUpdate: (chunk: string) => void,
  chatId?: string,
  userId?: string,
): Promise<{ message: string; chatId: string; messageId: string }> {
  try {
    const messages = conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    messages.push({
      role: "user" as const,
      content: prompt,
    });

    const response = await fetch("/api/chat/persistent/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        chatId,
        userId,
        autoSave: true,
        systemPrompt:
          "You are JiraGPT, a helpful assistant specialized in project management, Jira workflows, and providing actionable insights for software development teams. Provide detailed analysis and practical suggestions.",
      } as PersistentChatRequest),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    // Extract metadata from headers
    const responseChatId = response.headers.get("X-Chat-Id") || chatId || "";
    const messageId = response.headers.get("X-Message-Id") || "";

    const ct = response.headers.get("Content-Type") || "";
    let fullText = "";

    if (ct.includes("text/event-stream")) {
      await parseAiSdkDataStream(response.body, (t) => {
        fullText += t;
        onUpdate(t);
      });
      return { message: fullText, chatId: responseChatId, messageId };
    }

    // Fallback: raw chunked text
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        onUpdate(chunk);
      }
    } finally {
      reader.releaseLock();
    }

    return {
      message: fullText,
      chatId: responseChatId,
      messageId,
    };
  } catch (error) {
    console.error("Error calling persistent streaming AI model:", error);
    throw error;
  }
}

export async function getChatHistory(
  chatId: string,
  userId?: string,
): Promise<DBMessage[]> {
  try {
    const params = new URLSearchParams({ chatId });
    if (userId) {
      params.append("userId", userId);
    }

    const response = await fetch(`/api/chat/history?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching chat history:", error);
    throw error;
  }
}
