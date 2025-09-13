import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatArea } from "@/components/chat/ChatArea";
import type { Conversation, Message } from "@/components/chat/types";
import { QuerySearch } from "@/components/QuerySearch";
import { deterministicQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";
import { Moon, SunMedium } from "lucide-react";
import AboutDialog from "@/components/AboutDialog";
import AboutContent from "@/components/AboutContent";

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
    const messages = conversationHistory.map((m) => ({ role: m.role, content: m.content }));
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
  const [dark, setDark] = useState<boolean>(() =>
    document.documentElement.classList.contains("dark"),
  );
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(undefined);
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

  const setTheme = (enabled: boolean) => {
    setDark(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  };

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
      content: "",
      createdAt: Date.now(),
    };

    // Add messages immediately
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: [...c.messages, userMessage, botMessage] }
          : c,
      ),
    );

    let full = "";
    try {
      full = await callModelStreaming(
        text,
        conversations.find((c) => c.id === activeId)?.messages || [],
        (chunk) => {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === botMessageId ? { ...m, content: (m.content || "") + chunk } : m,
                    ),
                  }
                : c,
            ),
          );
        },
      );
    } finally {
      // Ensure final content is set
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === botMessageId ? { ...m, content: full || m.content } : m,
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
            { ...botMessage, content: full || botMessage.content },
          ],
        }
      : undefined;

    try {
      const existingRaw = localStorage.getItem(STORAGE_KEY);
      const existing: Conversation[] = existingRaw ? JSON.parse(existingRaw) : [];
      const filtered = finalConv
        ? existing.filter((c) => c.id !== finalConv.id)
        : existing;
      const merged = finalConv ? [finalConv, ...filtered] : existing;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      if (finalConv) localStorage.setItem(STORAGE_ACTIVE, finalConv.id);
    } catch {}

    // Go to full chat view after receiving response
    navigate("/chat");
  };

  const onBranchFrom = (messageId: string) => {
    const current = conversations.find((c) => c.id === activeId);
    if (!current) return;
    const idx = current.messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return;
    const baseGroup = current.groupId ?? current.id;
    const seed = current.messages.slice(0, idx + 1);
    const existing = conversations.filter((c) => (c.groupId ?? c.id) === baseGroup);
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
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-primary" />
            <div>
              <div className="font-semibold">JiraGPT</div>
              <div className="text-xs text-muted-foreground">Your Jira co-pilot</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AboutDialog trigger={<Button variant="ghost" size="sm">About</Button>} />
            <Button variant="ghost" size="sm" onClick={() => navigate("/chat")}>Open Full Chat</Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(!dark)}
            >
              {dark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-12 md:py-16">
        {/* Hero */}
        <section className="mb-10">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Welcome back — let’s ship smarter
            </h1>
            <p className="mt-3 text-muted-foreground">
              Search ready‑made prompts, preview the response, then hop into the full chat when you’re ready.
            </p>
          </div>
        </section>

        {/* Search + Chat panel */}
        <section
          className={cn(
            "rounded-3xl border bg-card/60 backdrop-blur ring-1 ring-border",
            "p-6 md:p-8 shadow-sm",
          )}
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

        {/* About preview on home */}
        <section className="mt-12">
          <div className="mx-auto max-w-5xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">About</h2>
              <Button variant="link" asChild>
                <Link to="/about">View full page</Link>
              </Button>
            </div>
            <div className="">
              <AboutContent compact />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
