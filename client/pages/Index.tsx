import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { RightSidebar } from "@/components/chat/RightSidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import type { Conversation, Message } from "@/components/chat/types";
import { cn } from "@/lib/utils";
import { Moon, SunMedium } from "lucide-react";
import { Link } from "react-router-dom";
import { matchQuery, formatMCPResponse } from "@/lib/query-matcher";
import { mcpClient } from "@/lib/mcp-client";

import { deterministicQueries } from "@/lib/queries";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function summarizeTitle(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 60 ? clean.slice(0, 57) + "…" : clean || "New chat";
}

async function callModel(
  prompt: string,
  conversationHistory: Message[] = [],
): Promise<string> {
  try {
    // Convert conversation history to the API format
    const messages = conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add the current prompt as a user message
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
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.message;
  } catch (error) {
    console.error("Error calling AI model:", error);
    // Fallback to a helpful error message
    return `I'm sorry, I'm currently unable to process your request. This might be due to a network issue or the AI service being temporarily unavailable. Please try again in a moment.

If the problem persists, you can still use the branching feature to explore different conversation paths with your previous messages.`;
  }
}

async function callModelStreaming(
  prompt: string,
  conversationHistory: Message[] = [],
  onUpdate: (chunk: string) => void,
): Promise<string> {
  try {
    // Convert conversation history to the API format
    const messages = conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add the current prompt as a user message
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
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

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
    // Fallback to a helpful error message
    const fallbackMessage = `I'm sorry, I'm currently unable to process your request. This might be due to a network issue or the AI service being temporarily unavailable. Please try again in a moment.

If the problem persists, you can still use the branching feature to explore different conversation paths with your previous messages.`;
    onUpdate(fallbackMessage);
    return fallbackMessage;
  }
}

const STORAGE_KEY = "jira-gpt-conversations";
const STORAGE_ACTIVE = "jira-gpt-active";

export default function Index() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Conversation[];
    } catch {}
    return [
      {
        id: uid("conv"),
        title: "New chat",
        messages: [],
        createdAt: Date.now(),
      },
    ];
  });
  const [activeId, setActiveId] = useState<string>(
    () => localStorage.getItem(STORAGE_ACTIVE) || conversations[0].id,
  );
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(
    undefined,
  );
  const [dark, setDark] = useState<boolean>(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);
  useEffect(() => {
    localStorage.setItem(STORAGE_ACTIVE, activeId);
  }, [activeId]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId)!,
    [conversations, activeId],
  );
  const activeGroup = useMemo(() => active.groupId ?? active.id, [active]);
  const siblings = useMemo(
    () => conversations.filter((c) => (c.groupId ?? c.id) === activeGroup),
    [conversations, activeGroup],
  );

  const setTheme = (enabled: boolean) => {
    setDark(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  };

  const openConversation = (id: string) => setActiveId(id);

  const newChat = () => {
    const c: Conversation = {
      id: uid("conv"),
      title: "New chat",
      messages: [],
      createdAt: Date.now(),
    };
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
  };

  const addToHistoryIfNeeded = (conv: Conversation) => {
    if (!conv.messages.some((m) => m.role === "user")) return;
    const title = summarizeTitle(conv.messages[0]?.content || conv.title);
    if (conv.title !== title) {
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, title } : c)),
      );
    }
  };

  const onSend = async (text: string) => {
    const userMessage: Message = {
      id: uid("m"),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    // Create bot message placeholder for streaming
    const botMessageId = uid("m");
    const botMessage: Message = {
      id: botMessageId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };

    // Add user message and empty bot message immediately
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: [...c.messages, userMessage, botMessage] }
          : c,
      ),
    );

    // Check if this is a deterministic query that needs MCP handling
    const queryMatch = matchQuery(text);
    let mcpResults: string = "";
    let enhancedPrompt = text;

    if (queryMatch.isMatch && queryMatch.mcpActions.length > 0) {
      // Update bot message to show MCP processing
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
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

      try {
        // Execute MCP actions
        const mcpPromises = queryMatch.mcpActions.map(async (action) => {
          try {
            const response = await mcpClient.executeAction(action);
            const responseText =
              ("content" in response
                ? response.content?.[0]?.text
                : response.contents?.[0]?.text) || "No data returned";
            return formatMCPResponse(action, responseText);
          } catch (error) {
            console.error(`MCP action ${action.type} failed:`, error);
            return `❌ Failed to execute ${action.description}: ${error instanceof Error ? error.message : "Unknown error"}`;
          }
        });

        const mcpResultsArray = await Promise.all(mcpPromises);
        mcpResults = mcpResultsArray.join("\n\n");

        // Use enhanced prompt if available
        if (queryMatch.enhancedPrompt) {
          enhancedPrompt = `${queryMatch.enhancedPrompt}\n\nRetrieved Data:\n${mcpResults}`;
        } else {
          enhancedPrompt = `${text}\n\nRetrieved Data:\n${mcpResults}`;
        }

        // Update bot message with MCP results immediately
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
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
      } catch (error) {
        console.error("MCP processing failed:", error);
        mcpResults = `❌ Failed to retrieve data: ${error instanceof Error ? error.message : "Unknown error"}`;

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === botMessageId ? { ...m, content: mcpResults } : m,
                  ),
                }
              : c,
          ),
        );
        return; // Don't proceed to LLM if MCP fails
      }
    }

    // Get current conversation to pass as context
    const currentConv = conversations.find((c) => c.id === activeId);
    const conversationHistory = currentConv ? currentConv.messages : [];

    // Stream the LLM response (fallback or enhancement)
    let llmResponse = "";
    try {
      const fullAnswer = await callModelStreaming(
        enhancedPrompt,
        conversationHistory,
        (chunk: string) => {
          llmResponse += chunk;
          // Update the bot message content in real-time
          const currentContent = mcpResults
            ? `${mcpResults}\n\n**Analysis:**\n`
            : "";
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeId
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
        },
      );

      // Final update to ensure we have the complete message
      const finalContent = mcpResults
        ? `${mcpResults}\n\n**Analysis:**\n${fullAnswer}`
        : fullAnswer;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === botMessageId ? { ...m, content: finalContent } : m,
                ),
              }
            : c,
        ),
      );
    } catch (error) {
      console.error("LLM processing failed:", error);
      // If we have MCP results but LLM fails, show just the MCP results
      const fallbackContent =
        mcpResults ||
        `❌ Failed to process request: ${error instanceof Error ? error.message : "Unknown error"}`;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === botMessageId
                    ? { ...m, content: fallbackContent }
                    : m,
                ),
              }
            : c,
        ),
      );
    }

    const conv = conversations.find((c) => c.id === activeId);
    if (conv) {
      const finalBotMessage = {
        ...botMessage,
        content: mcpResults || llmResponse,
      };
      addToHistoryIfNeeded({
        ...conv,
        messages: [...conv.messages, userMessage, finalBotMessage],
      });
    }
  };

  const onBranchFrom = (messageId: string) => {
    const current = conversations.find((c) => c.id === activeId);
    if (!current) return;
    const idx = current.messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return;
    const baseGroup = current.groupId ?? current.id; // group to root
    const seed = current.messages.slice(0, idx + 1);
    const root = conversations.find((c) => c.id === baseGroup);
    const existing = conversations.filter(
      (c) => (c.groupId ?? c.id) === baseGroup,
    );
    const count = existing.filter((c) => c.parentId === baseGroup).length; // first-level branches count
    const newConv: Conversation = {
      id: uid("conv"),
      title: summarizeTitle(
        (root?.messages[0]?.content || root?.title || current.title) +
          ` (branch ${Math.max(1, count + 1)})`,
      ),
      messages: seed,
      groupId: baseGroup,
      parentId: current.id,
      createdAt: Date.now(),
    };

    setConversations((prev) =>
      prev.map((c) => (c.id === baseGroup ? { ...c, groupId: baseGroup } : c)),
    );
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
  };

  const onSwitchConversation = (id: string) => setActiveId(id);
  const onCloseConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      if (remaining[0]) setActiveId(remaining[0].id);
      else {
        const c: Conversation = {
          id: uid("conv"),
          title: "New chat",
          messages: [],
          createdAt: Date.now(),
        };
        setConversations((prev) => [c, ...prev]);
        setActiveId(c.id);
      }
    }
  };

  const history = useMemo(() => {
    const seen = new Set<string>();
    const ordered = conversations
      .filter((c) => c.messages.length > 0)
      .sort((a, b) => b.createdAt - a.createdAt);
    const dedup: Conversation[] = [];
    for (const c of ordered) {
      const key = c.title.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        dedup.push(c);
      }
    }
    return dedup;
  }, [conversations]);

  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr]">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-primary" />
            <div>
              <div className="font-semibold">JiraGPT</div>
              <div className="text-xs text-muted-foreground">
                Deterministic prompts + branching chats
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Home
            </Link>
            <Link
              to="/about"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              About
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(!dark)}
            >
              {dark ? (
                <SunMedium className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="py-4">
        <div
          className={cn(
            "container mx-auto px-4",
            "grid",
            "grid-cols-1 lg:grid-cols-[1fr,20rem]",
            "min-h-0",
            "gap-4",
          )}
        >
          <div className="min-h-0 flex flex-col">
            <ChatArea
              conversation={active}
              siblingConversations={siblings}
              onSend={onSend}
            onBranchFrom={onBranchFrom}
            onSwitchConversation={onSwitchConversation}
            onCloseConversation={onCloseConversation}
            initialPrompt={pendingPrompt}
          />
        </div>
          <RightSidebar
            className="min-h-0"
            queries={deterministicQueries}
            onUseQuery={(t) => setPendingPrompt(t)}
            history={history}
            onOpenConversation={openConversation}
            onNewChat={newChat}
          />
        </div>
      </main>
    </div>
  );
}
