import { useEffect, useMemo, useState } from "react";
import type { Message } from "@/components/chat/types";
import { Link } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import ProvidersMenu from "@/components/ProvidersMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { deterministicQueries } from "@/lib/queries";
import { HomeLayout } from "@/components/home/HomeLayout";
import { HomeHero } from "@/components/home/HomeHero";
import { DeterministicSearchBar } from "@/components/home/DeterministicSearchBar";
import { TemplatesGrid } from "@/components/home/TemplatesGrid";
import { ChatShell } from "@/components/chat/ChatShell";
import { useConversations } from "@/hooks/use-conversations";

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
  const {
    conversations,
    active,
    siblings,
    history,
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
  } = useConversations();

  const [searchQuery, setSearchQuery] = useState<string>("");

  // history provided by hook

  const handleApplyQuery = () => {
    if (searchQuery.trim()) applyQuery(searchQuery.trim());
  };

  const handleQuerySelect = (template: string) => {
    setSearchQuery(template);
  };

  // keep Home button behavior via hook goHome

  // Show home page if no messages in active conversation and no pending prompt
  // showHomePage provided by hook

  if (showHomePage) {
    return (
      <div className="min-h-screen">
        <AppHeader
          right={
            <>
              <button
                onClick={goHome}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Home
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
                  localStorage.removeItem(STORAGE_ACTIVE);
                  window.location.reload();
                }}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Reset
              </button>
              <Link
                to="/about"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                About
              </Link>
              <Link
                to="/diagnostics"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Diagnostics
              </Link>
              <ProvidersMenu />
              <ThemeToggle />
            </>
          }
        />

        {/* Gradient comes from global.css; Home content below */}
        <HomeLayout>
          <HomeHero />
          <DeterministicSearchBar
            onApply={(q) => applyQuery(q)}
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <TemplatesGrid
            queries={deterministicQueries}
            onSelect={(t) => setSearchQuery(t)}
          />
        </HomeLayout>
      </div>
    );
  }

  // Show chat interface
  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr]">
      <AppHeader
        right={
          <>
            <button
              onClick={goHome}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Home
            </button>
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(STORAGE_ACTIVE);
                window.location.reload();
              }}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Reset
            </button>
            <Link
              to="/about"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              About
            </Link>
            <Link
              to="/diagnostics"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Diagnostics
            </Link>
            <ProvidersMenu />
            <ThemeToggle />
          </>
        }
      />

      <ChatShell
        conversation={active}
        siblings={siblings}
        queries={deterministicQueries}
        history={history}
        onSend={onSend}
        onBranchFrom={onBranchFrom}
        onSwitchConversation={onSwitchConversation}
        onCloseConversation={onCloseConversation}
        onUseQuery={(t) => setPendingPrompt(t)}
        onOpenConversation={openConversation}
        onNewChat={newChat}
        initialPrompt={pendingPrompt}
      />
    </div>
  );
}
