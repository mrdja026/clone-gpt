import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatArea } from "@/components/chat/ChatArea";
import type { Conversation, Message } from "@/components/chat/types";
import { QuerySearch } from "@/components/QuerySearch";
import { deterministicQueries } from "@/lib/queries";
import { matchQuery, formatMCPResponse } from "@/lib/query-matcher";
import { mcpClient } from "@/lib/mcp-client";
import { cn } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import ProvidersMenu from "@/components/ProvidersMenu";
import ThemeToggle from "@/components/ThemeToggle";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

const STORAGE_KEY = "jira-gpt-conversations";
const STORAGE_ACTIVE = "jira-gpt-active";

function summarizeTitle(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 60 ? clean.slice(0, 57) + "…" : clean || "New chat";
}

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

export default function PostLogin() {
  const navigate = useNavigate();
  // Theme is controlled via ThemeToggle component
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(
    undefined,
  );
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: uid("conv"), title: "New chat", messages: [], createdAt: Date.now() },
  ]);
  const [activeId, setActiveId] = useState<string>(conversations[0].id);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId)!,
    [conversations, activeId],
  );
  const activeGroup = useMemo(() => active.groupId ?? active.id, [active]);
  const siblings = useMemo(
    () => conversations.filter((c) => (c.groupId ?? c.id) === activeGroup),
    [conversations, activeGroup],
  );

  // no-op

  const onSend = async (text: string) => {
    // Use the input as-is
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
      content: "Analyzing…",
      createdAt: Date.now(),
    };

    // Add user and empty bot message immediately
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: [...c.messages, userMessage, botMessage] }
          : c,
      ),
    );

    // MCP matching for deterministic queries
    const queryMatch = matchQuery(cleanedText);
    let mcpResults = "";
    let enhancedPrompt = cleanedText;

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
        const mcpPromises = queryMatch.mcpActions.map(async (action) => {
          try {
            const response = await mcpClient.executeAction(action);
            const responseText =
              ("content" in response
                ? response.content?.[0]?.text
                : response.contents?.[0]?.text) || "No data returned";
            return formatMCPResponse(action, responseText);
          } catch (err) {
            return `❌ Failed to execute ${action.description}: ${err instanceof Error ? err.message : "Unknown error"}`;
          }
        });
        const mcpResultsArray = await Promise.all(mcpPromises);
        mcpResults = mcpResultsArray.join("\n\n");

        enhancedPrompt = queryMatch.enhancedPrompt
          ? `${queryMatch.enhancedPrompt}\n\nRetrieved Data:\n${mcpResults}`
          : `${cleanedText}\n\nRetrieved Data:\n${mcpResults}`;

        // Show analyzing placeholder so tests can find it
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
      } catch (err) {
        mcpResults = `❌ Failed to retrieve data: ${err instanceof Error ? err.message : "Unknown error"}`;
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
        return;
      }
    }

    // Stream model response
    const conversationHistory =
      conversations.find((c) => c.id === activeId)?.messages || [];
    let llmResponse = "";
    try {
      await callModelStreaming(enhancedPrompt, conversationHistory, (chunk) => {
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
      });
    } finally {
      // Ensure final content is set
      const finalContent = mcpResults
        ? `${mcpResults}\n\n**Analysis:**\n${llmResponse}`
        : llmResponse;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
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

    // Persist this conversation into the main chat storage and redirect
    const base = conversations.find((c) => c.id === activeId);
    const finalConv: Conversation | undefined = base
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

    try {
      const existingRaw = localStorage.getItem(STORAGE_KEY);
      const existing: Conversation[] = existingRaw
        ? JSON.parse(existingRaw)
        : [];
      const filtered = finalConv
        ? existing.filter((c) => c.id !== finalConv.id)
        : existing;
      const merged = finalConv ? [finalConv, ...filtered] : existing;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      if (finalConv) localStorage.setItem(STORAGE_ACTIVE, finalConv.id);
    } catch {}

    // Persist into main chat storage and optionally navigate
    // Keep user on PostLogin per task; still persist for continuity
    // navigate("/chat");
  };

  const onBranchFrom = (messageId: string) => {
    const current = conversations.find((c) => c.id === activeId);
    if (!current) return;
    const idx = current.messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return;
    const baseGroup = current.groupId ?? current.id;
    const seed = current.messages.slice(0, idx + 1);
    const existing = conversations.filter(
      (c) => (c.groupId ?? c.id) === baseGroup,
    );
    const count = existing.filter((c) => c.parentId === baseGroup).length;
    const newConv: Conversation = {
      id: uid("conv"),
      title: `Branch ${Math.max(1, count + 1)}`,
      messages: seed,
      groupId: baseGroup,
      parentId: current.id,
      createdAt: Date.now(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
  };

  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr]">
      <AppHeader
        subtitle="Your Jira co-pilot"
        right={
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/about">About</Link>
            </Button>
            <ProvidersMenu />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/diagnostics">Diagnostics</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/chat")}>
              Open Full Chat
            </Button>
            <ThemeToggle />
          </>
        }
      />

      <main className="container mx-auto py-12 md:py-16">
        <div className="grid gap-5 md:grid-cols-[1.618fr_1fr]">
          {/* Left: Hero + Chat */}
          <section data-testid="golden-left" className="space-y-5">
            <div>
              <div className="mx-auto max-w-3xl text-center">
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                  Welcome back — let’s ship smarter
                </h1>
                <p className="mt-3 text-muted-foreground">
                  Search ready‑made prompts, preview the response, then hop into
                  the full chat when you’re ready.
                </p>
              </div>
            </div>

            <section
              className={cn(
                "rounded-3xl border bg-card/60 backdrop-blur ring-1 ring-border",
                "p-6 md:p-8 shadow-sm",
              )}
              aria-labelledby="chat-section-title"
            >
              <div className="max-w-3xl mx-auto w-full">
                <QuerySearch
                  queries={deterministicQueries}
                  onSelect={(t) => setPendingPrompt(t)}
                  className="mb-4"
                />
              </div>
              <div className="rounded-3xl border bg-background/80 shadow-md">
                <ChatArea
                  conversation={active}
                  siblingConversations={siblings}
                  onSend={onSend}
                  onBranchFrom={onBranchFrom}
                  onSwitchConversation={(id) => setActiveId(id)}
                  onCloseConversation={(id) =>
                    setConversations((prev) => prev.filter((c) => c.id !== id))
                  }
                  initialPrompt={pendingPrompt}
                />
              </div>
            </section>
          </section>

          {/* Right: Context */}
          <aside
            data-testid="golden-right"
            className="space-y-5 md:max-h-[calc(100vh-12rem)] md:overflow-auto"
            aria-label="Context"
          >
            <section>
              <div className="mx-auto max-w-5xl">
                <h2 className="text-lg font-semibold mb-4">
                  Connect to provider
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border bg-card p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Perplexity</div>
                        <div className="text-sm text-muted-foreground">
                          Set up your Perplexity credentials
                        </div>
                      </div>
                      <Button asChild>
                        <Link to="/providers/perplexity">Open</Link>
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-card p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Notion</div>
                        <div className="text-sm text-muted-foreground">
                          Set up your Notion credentials
                        </div>
                      </div>
                      <Button asChild>
                        <Link to="/providers/notion">Open</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
