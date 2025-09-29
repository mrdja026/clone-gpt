import { useState } from "react";
import type { Message } from "@/components/chat/types";
import type {
  ThirdLaneRequest,
  ThirdLaneResponse,
  ReasoningContext,
} from "@shared/api";
import { useConversationStore } from "./useConversationStore";
import { useMcpActions } from "./useMcpActions";
import { useReasoningMode } from "./useReasoningMode";
import { uid, summarizeTitle } from "../lib";

async function callModelStreaming(
  prompt: string,
  conversationHistory: Message[] = [],
  onUpdate: (chunk: string) => void,
): Promise<string> {
  try {
    const messages = conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    messages.push({ role: "user" as const, content: prompt });

    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      text += chunk;
      onUpdate(chunk);
    }
    reader.releaseLock();
    return text;
  } catch (err) {
    const fallback = "Sorry, I couldn't process that right now.";
    onUpdate(fallback);
    return fallback;
  }
}

async function callThirdLane(
  userQuery: string,
  chatHistory: Message[] = [],
): Promise<ThirdLaneResponse> {
  try {
    const request: ThirdLaneRequest = {
      userQuery,
      chatHistory: chatHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    const response = await fetch("/api/third-lane/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(
        `Third Lane API error: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Third Lane processing failed:", error);
    throw error;
  }
}

export function usePostLogin() {
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(
    undefined,
  );
  const [reasoningContext, setReasoningContext] =
    useState<ReasoningContext | null>(null);
  const [showReasoningMode, setShowReasoningMode] = useState(false);
  const store = useConversationStore();
  const mcpActions = useMcpActions();
  const reasoningMode = useReasoningMode();

  const onSend = async (text: string) => {
    const userMessage: Message = {
      id: uid("m"),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    const botMessageId = uid("m");
    const botMessage: Message = {
      id: botMessageId,
      role: "assistant",
      content: "🔍 Processing through three-lane analysis...",
      createdAt: Date.now(),
    };

    // Add user and empty bot message immediately
    store.updateConversations((prev) =>
      prev.map((c) =>
        c.id === store.activeId
          ? { ...c, messages: [...c.messages, userMessage, botMessage] }
          : c,
      ),
    );

    try {
      // Update to show Lane A processing
      store.updateConversations((prev) =>
        prev.map((c) =>
          c.id === store.activeId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === botMessageId
                    ? { ...m, content: "🎯 Lane A: Detecting intent..." }
                    : m,
                ),
              }
            : c,
        ),
      );

      // Get conversation history for context
      const conversationHistory =
        store.conversations.find((c) => c.id === store.activeId)?.messages ||
        [];

      // Call three-lane system
      const thirdLaneResponse = await callThirdLane(text, conversationHistory);

      // Update to show Lane B processing
      store.updateConversations((prev) =>
        prev.map((c) =>
          c.id === store.activeId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === botMessageId
                    ? { ...m, content: "🔍 Lane B: Acquiring data..." }
                    : m,
                ),
              }
            : c,
        ),
      );

      // Update to show Lane C processing
      store.updateConversations((prev) =>
        prev.map((c) =>
          c.id === store.activeId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === botMessageId
                    ? { ...m, content: "🤖 Lane C: Analyzing and reasoning..." }
                    : m,
                ),
              }
            : c,
        ),
      );

      // Build final response content
      let finalContent = thirdLaneResponse.response;

      // Add raw data if available
      if (
        thirdLaneResponse.rawData &&
        thirdLaneResponse.mode === "data_analysis"
      ) {
        finalContent +=
          "\n\n**Raw Data:**\n```json\n" +
          JSON.stringify(thirdLaneResponse.rawData.rawJson, null, 2) +
          "\n```";
      }

      // Add analysis details if available
      if (thirdLaneResponse.analysis) {
        finalContent +=
          "\n\n**Key Insights:**\n" +
          thirdLaneResponse.analysis.insights
            .map((insight) => `• ${insight}`)
            .join("\n");

        finalContent +=
          "\n\n**Recommendations:**\n" +
          thirdLaneResponse.analysis.recommendations
            .map((rec) => `• ${rec}`)
            .join("\n");
      }

      // Add reasoning mode button if context is available
      if (thirdLaneResponse.reasoningContext) {
        setReasoningContext(thirdLaneResponse.reasoningContext);
        finalContent +=
          "\n\n🧠 **[Enter Reasoning Mode]** - Click to discuss and reason about this data";
      }

      // Update with final content
      store.updateConversations((prev) =>
        prev.map((c) =>
          c.id === store.activeId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === botMessageId ? { ...m, content: finalContent } : m,
                ),
              }
            : c,
        ),
      );

      // Persist conversation
      const base = store.conversations.find((c) => c.id === store.activeId);
      const finalConv = base
        ? {
            ...base,
            title: summarizeTitle(text),
            messages: [
              ...base.messages,
              userMessage,
              { ...botMessage, content: finalContent },
            ],
          }
        : undefined;

      store.persistToStorage(finalConv);
    } catch (error) {
      console.error("Three-lane processing failed:", error);

      // Fallback to original MCP + LLM approach
      const errorMessage =
        "Three-lane processing failed. Falling back to standard processing...";
      store.updateConversations((prev) =>
        prev.map((c) =>
          c.id === store.activeId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === botMessageId ? { ...m, content: errorMessage } : m,
                ),
              }
            : c,
        ),
      );

      // Execute original MCP + LLM flow as fallback
      const { enhancedPrompt, mcpResults } = await mcpActions.run(text);
      const conversationHistory =
        store.conversations.find((c) => c.id === store.activeId)?.messages ||
        [];
      let llmResponse = "";

      await callModelStreaming(enhancedPrompt, conversationHistory, (chunk) => {
        llmResponse += chunk;
        const currentContent = mcpResults
          ? `${mcpResults}\n\n**Analysis:**\n`
          : "";
        store.updateConversations((prev) =>
          prev.map((c) =>
            c.id === store.activeId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === botMessageId
                      ? { ...m, content: currentContent + llmResponse }
                      : m,
                  ),
                }
              : c,
          ),
        );
      });
    }
  };

  const startReasoningMode = () => {
    if (reasoningContext) {
      setShowReasoningMode(true);
    }
  };

  const closeReasoningMode = () => {
    setShowReasoningMode(false);
  };

  return {
    pendingPrompt,
    setPendingPrompt,
    conversations: store.conversations,
    activeId: store.activeId,
    active: store.active,
    siblings: store.siblings,
    onSend,
    onBranchFrom: store.branchFromMessage,
    onSwitchConversation: store.switchConversation,
    onCloseConversation: store.closeConversation,
    // Reasoning mode functionality
    reasoningContext,
    showReasoningMode,
    startReasoningMode,
    closeReasoningMode,
    isReasoningAvailable: reasoningMode.isReasoningAvailable(reasoningContext),
  };
}
