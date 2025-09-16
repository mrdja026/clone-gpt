import { useEffect, useMemo, useState } from "react";
import type { Conversation, Message } from "@/components/chat/types";
import { matchQuery, formatMCPResponse } from "@/lib/query-matcher";
import { mcpClient } from "@/lib/mcp-client";

const STORAGE_KEY = "jira-gpt-conversations";
const STORAGE_ACTIVE = "jira-gpt-active";

async function callModel(
  prompt: string,
  conversationHistory: Message[] = [],
): Promise<string> {
  const messages = [
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: prompt },
  ];
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      systemPrompt:
        "You are JiraGPT, a helpful assistant specialized in project management, Jira workflows, and providing actionable insights for software development teams. Provide detailed analysis and practical suggestions.",
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.message;
}

async function callModelStreaming(
  prompt: string,
  conversationHistory: Message[] = [],
  onUpdate: (chunk: string) => void,
): Promise<string> {
  const messages = [
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: prompt },
  ];
  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      systemPrompt:
        "You are JiraGPT, a helpful assistant specialized in project management, Jira workflows, and providing actionable insights for software development teams. Provide detailed analysis and practical suggestions.",
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!res.body) throw new Error("No body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      full += chunk;
      onUpdate(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  return full;
}

export function useConversations() {
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

  const openConversation = (id: string) => setActiveId(id);

  const onSwitchConversation = (id: string) => setActiveId(id);

  const onCloseConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      if (remaining[0]) setActiveId(remaining[0].id);
      else newChat();
    }
  };

  const onBranchFrom = (messageId: string) => {
    const current = conversations.find((c) => c.id === activeId);
    if (!current) return;
    const idx = current.messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return;
    const baseGroup = current.groupId ?? current.id;
    const seed = current.messages.slice(0, idx + 1);
    const root = conversations.find((c) => c.id === baseGroup);
    const existing = conversations.filter(
      (c) => (c.groupId ?? c.id) === baseGroup,
    );
    const count = existing.filter((c) => c.parentId === baseGroup).length;
    const newConv: Conversation = {
      id: uid("conv"),
      title:
        (root?.messages[0]?.content || root?.title || current.title) +
        ` (branch ${Math.max(1, count + 1)})`,
      messages: seed,
      groupId: baseGroup,
      parentId: current.id,
      createdAt: Date.now(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
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
    const cleanedText = text.trim();
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
      content: "",
      createdAt: Date.now(),
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: [...c.messages, userMessage, botMessage] }
          : c,
      ),
    );

    const queryMatch = matchQuery(cleanedText);
    let mcpResults = "";
    let enhancedPrompt = cleanedText;

    if (queryMatch.isMatch && queryMatch.mcpActions.length > 0) {
      const status = queryMatch.mcpActions.some(
        (a) => a.toolName === "fetch_perplexity_data",
      )
        ? "🔍 Fetching web results..."
        : "🔍 Fetching data from MCP...";
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === botMessageId ? { ...m, content: status } : m,
                ),
              }
            : c,
        ),
      );

      try {
        const mcpPromises = queryMatch.mcpActions.map(async (action) => {
          try {
            const response = await mcpClient.executeAction(action);
            const responseText =
              ("content" in response
                ? response.content?.[0]?.text
                : response.contents?.[0]?.text) || "No data returned";
            // Parse raw JSON if possible for grounding
            let rawParsed: unknown = responseText;
            try {
              rawParsed =
                typeof responseText === "string"
                  ? JSON.parse(responseText)
                  : responseText;
            } catch {}
            const formatted = formatMCPResponse(action, responseText);
            return { action, formatted, raw: rawParsed };
          } catch (error) {
            const err = `❌ Failed to execute ${action.description}: ${error instanceof Error ? error.message : "Unknown error"}`;
            return { action, formatted: err, raw: { error: err } };
          }
        });

        const results = await Promise.all(mcpPromises);
        const formattedSection = results.map((r) => r.formatted).join("\n\n");
        const rawAggregate = {
          retrieved: results.map((r) => ({
            action: r.action.description,
            data: r.raw,
          })),
        } as const;
        const rawJson = JSON.stringify(rawAggregate, null, 2);
        const rawCapped =
          rawJson.length > 12000
            ? rawJson.slice(0, 12000) + "\n/* truncated */"
            : rawJson;

        mcpResults = formattedSection;
        const retrievedBlock = `Retrieved Data (JSON):\n\n\`\`\`json\n${rawCapped}\n\`\`\``;
        enhancedPrompt = queryMatch.enhancedPrompt
          ? `${queryMatch.enhancedPrompt}\n\n${retrievedBlock}`
          : `${cleanedText}\n\n${retrievedBlock}`;

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === botMessageId
                      ? {
                          ...m,
                          content: `${formattedSection}\n\n📦 Raw Data available below in the model context.\n\n🤖 Analyzing data...`,
                        }
                      : m,
                  ),
                }
              : c,
          ),
        );
      } catch {}
    }

    const currentConv = conversations.find((c) => c.id === activeId);
    const conversationHistory = currentConv ? currentConv.messages : [];
    let llmResponse = "";
    try {
      const fullAnswer = await callModelStreaming(
        enhancedPrompt,
        conversationHistory,
        (chunk: string) => {
          llmResponse += chunk;
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
      const finalBotMessage: Message = {
        id: uid("m"),
        role: "assistant",
        content: mcpResults || llmResponse,
        createdAt: Date.now(),
      };
      addToHistoryIfNeeded({
        ...conv,
        messages: [...conv.messages, userMessage, finalBotMessage],
      });
    }
  };

  const applyQuery = (query: string) => {
    setPendingPrompt(query);
    // If current conversation has content, create a new one to keep history clean
    if (active.messages.length > 0) newChat();
  };

  const goHome = () => {
    setPendingPrompt(undefined);
    if (active.messages.length > 0) newChat();
  };

  const showHomePage = active.messages.length === 0 && !pendingPrompt;

  return {
    conversations,
    active,
    siblings,
    history,
    activeId,
    setActiveId,
    pendingPrompt,
    setPendingPrompt,
    newChat,
    openConversation,
    onSwitchConversation,
    onCloseConversation,
    onBranchFrom,
    onSend,
    applyQuery,
    goHome,
    showHomePage,
  };
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function summarizeTitle(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 60 ? clean.slice(0, 57) + "…" : clean || "New chat";
}
