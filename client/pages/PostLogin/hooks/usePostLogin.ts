import { useState } from "react";
import type { Message } from "@/components/chat/types";
import { useConversationStore } from "./useConversationStore";
import { useMcpActions } from "./useMcpActions";
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

export function usePostLogin() {
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(undefined);
  const store = useConversationStore();
  const mcpActions = useMcpActions();

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
      content: "Analyzing…",
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

    // Update bot message to show MCP processing
    store.updateConversations((prev) =>
      prev.map((c) =>
        c.id === store.activeId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === botMessageId
                  ? { ...m, content: "🔍 Fetching data from JIRA..." }
                  : m,
              ),
            }
          : c,
      ),
    );

    // Execute MCP actions
    const { enhancedPrompt, mcpResults } = await mcpActions.run(text);

    if (mcpResults) {
      // Show analyzing placeholder so tests can find it
      store.updateConversations((prev) =>
        prev.map((c) =>
          c.id === store.activeId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === botMessageId
                    ? {
                        ...m,
                        content: `${mcpResults}\n\n🤖 Analyzing data...`,
                      }
                    : m,
                ),
              }
            : c,
        ),
      );
    }

    // Stream model response
    const conversationHistory =
      store.conversations.find((c) => c.id === store.activeId)?.messages || [];
    let llmResponse = "";
    
    try {
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
    } finally {
      // Ensure final content is set
      const finalContent = mcpResults
        ? `${mcpResults}\n\n**Analysis:**\n${llmResponse}`
        : llmResponse;
      store.updateConversations((prev) =>
        prev.map((c) =>
          c.id === store.activeId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === botMessageId
                    ? { ...m, content: finalContent || m.content }
                    : m,
                ),
              }
            : c,
        ),
      );
    }

    // Persist conversation
    const base = store.conversations.find((c) => c.id === store.activeId);
    const finalConv = base
      ? {
          ...base,
          title: summarizeTitle(text),
          messages: [
            ...base.messages,
            userMessage,
            { ...botMessage, content: llmResponse || botMessage.content },
          ],
        }
      : undefined;

    store.persistToStorage(finalConv);
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
  };
}
