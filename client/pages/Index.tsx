import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { RightSidebar } from "@/components/chat/RightSidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import type { Conversation, Message } from "@/components/chat/types";
import type { QueryTemplate } from "@/components/chat/types";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Moon, SunMedium } from "lucide-react";

const deterministicQueries: QueryTemplate[] = [
  { id: "q1", label: "Get Jira issue ABC-123 details", template: "Show details for issue ABC-123 including status, assignee, and blockers." },
  { id: "q2", label: "List my issues by priority", template: "List all issues assigned to me ordered by priority with links." },
  { id: "q3", label: "Release notes for vX.Y.Z", template: "Generate concise release notes for version v1.2.3 from merged tickets." },
  { id: "q4", label: "Find blockers for EPIC-1", template: "What are the current blockers for epic EPIC-1 and action items to unblock?" },
  { id: "q5", label: "Sprint plan for TEAM A", template: "Create a 2-week sprint plan for team TEAM-A targeting 30 story points based on backlog." },
];

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function summarizeTitle(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 60 ? clean.slice(0, 57) + "…" : clean || "New chat";
}

function callModel(prompt: string): Promise<string> {
  // Simple deterministic mock for demo purposes
  const reply = `Here is an analysis for: "${prompt}"\n\n— Key points\n• ${prompt.split(" ").slice(0, 6).join(" ")}\n�� Next steps suggested.\n\nYou can branch from this message to explore alternatives.`;
  return new Promise((res) => setTimeout(() => res(reply), 500));
}

const STORAGE_KEY = "jira-gpt-conversations";
const STORAGE_ACTIVE = "jira-gpt-active";

export default function Index() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Conversation[];
    } catch {}
    return [{ id: uid("conv"), title: "New chat", messages: [], createdAt: Date.now() }];
  });
  const [activeId, setActiveId] = useState<string>(() => localStorage.getItem(STORAGE_ACTIVE) || conversations[0].id);
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(undefined);
  const [dark, setDark] = useState<boolean>(() => document.documentElement.classList.contains("dark"));

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)); }, [conversations]);
  useEffect(() => { localStorage.setItem(STORAGE_ACTIVE, activeId); }, [activeId]);

  const active = useMemo(() => conversations.find((c) => c.id === activeId)!, [conversations, activeId]);
  const activeGroup = useMemo(() => (active.groupId ?? active.id), [active]);
  const siblings = useMemo(() => conversations.filter((c) => (c.groupId ?? c.id) === activeGroup), [conversations, activeGroup]);

  const setTheme = (enabled: boolean) => {
    setDark(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  };

  const openConversation = (id: string) => setActiveId(id);

  const newChat = () => {
    const c: Conversation = { id: uid("conv"), title: "New chat", messages: [], createdAt: Date.now() };
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
  };

  const addToHistoryIfNeeded = (conv: Conversation) => {
    if (!conv.messages.some((m) => m.role === "user")) return;
    const title = summarizeTitle(conv.messages[0]?.content || conv.title);
    if (conv.title !== title) {
      setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, title } : c)));
    }
  };

  const onSend = async (text: string) => {
    const userMessage: Message = { id: uid("m"), role: "user", content: text, createdAt: Date.now() };
    setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, messages: [...c.messages, userMessage] } : c)));

    const answer = await callModel(text);
    const botMessage: Message = { id: uid("m"), role: "assistant", content: answer, createdAt: Date.now() };
    setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, messages: [...c.messages, botMessage] } : c)));

    const conv = conversations.find((c) => c.id === activeId);
    if (conv) addToHistoryIfNeeded({ ...conv, messages: [...conv.messages, userMessage, botMessage] });
  };

  const onBranchFrom = (messageId: string) => {
    const base = conversations.find((c) => c.id === activeId);
    if (!base) return;
    const idx = base.messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return;
    const baseGroup = base.groupId ?? base.id;
    const seed = base.messages.slice(0, idx + 1);
    const newConv: Conversation = {
      id: uid("conv"),
      title: summarizeTitle((base.messages[0]?.content || base.title) + ` (branch ${siblings.length})`),
      messages: seed,
      groupId: baseGroup,
      createdAt: Date.now(),
    };

    setConversations((prev) => prev.map((c) => (c.id === base.id ? { ...c, groupId: baseGroup } : c)));
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
        const c: Conversation = { id: uid("conv"), title: "New chat", messages: [], createdAt: Date.now() };
        setConversations((prev) => [c, ...prev]);
        setActiveId(c.id);
      }
    }
  };

  const history = useMemo(() => {
    const seen = new Set<string>();
    const ordered = conversations.filter((c) => c.messages.length > 0).sort((a,b)=> b.createdAt - a.createdAt);
    const dedup: Conversation[] = [];
    for (const c of ordered) {
      const key = c.title.toLowerCase();
      if (!seen.has(key)) { seen.add(key); dedup.push(c); }
    }
    return dedup;
  }, [conversations]);

  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr]">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-primary" />
            <div>
              <div className="font-semibold">JiraGPT</div>
              <div className="text-xs text-muted-foreground">Deterministic prompts + branching chats</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setTheme(!dark)}>
              {dark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className={cn("grid", "grid-cols-1 lg:grid-cols-[1fr,20rem]", "min-h-0")}>
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
      </main>
    </div>
  );
}
