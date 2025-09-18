import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import ProvidersMenu from "@/components/ProvidersMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { usePostLogin } from "./hooks/usePostLogin";
import Hero from "./components/Hero";
import ChatPanel from "./components/ChatPanel";
import ProvidersPanel from "./components/ProvidersPanel";
import AboutPreview from "./components/AboutPreview";
import ReasoningMode from "./components/ReasoningMode";
import { DeterministicSearchBar } from "@/components/home/DeterministicSearchBar";
import { jiraDeterministicPrompts } from "@/content/jira-placeholders";
import { Brain } from "lucide-react";

const providers = [
  {
    name: "Perplexity",
    description: "Set up your Perplexity credentials",
    to: "/providers/perplexity",
  },
  {
    name: "Notion",
    description: "Set up your Notion credentials",
    to: "/providers/notion",
  },
];

export default function PostLoginPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const {
    pendingPrompt,
    setPendingPrompt,
    active,
    siblings,
    onSend,
    onBranchFrom,
    onSwitchConversation,
    onCloseConversation,
    reasoningContext,
    showReasoningMode,
    startReasoningMode,
    closeReasoningMode,
    isReasoningAvailable,
  } = usePostLogin();

  const handleApplyQuery = async (query: string) => {
    setPendingPrompt(query);
    await onSend(query);
  };

  const handleTemplateSelect = (template: string) => {
    setSearchQuery(template);
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
            <Hero />

            {/* Deterministic Search Bar */}
            <DeterministicSearchBar
              onApply={handleApplyQuery}
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Type to search deterministic queries..."
              suggestions={jiraDeterministicPrompts}
              autoExecuteOnSelect
            />

            <ChatPanel
              pendingPrompt={pendingPrompt}
              setPendingPrompt={setPendingPrompt}
              onSend={onSend}
              conversation={active}
              siblingConversations={siblings}
              onBranchFrom={onBranchFrom}
              onSwitchConversation={onSwitchConversation}
              onCloseConversation={onCloseConversation}
            />

            {/* Reasoning Mode Button */}
            {isReasoningAvailable && (
              <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                      <Brain className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-purple-900 dark:text-purple-100">
                        Reasoning Mode Available
                      </h3>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Continue the conversation with deeper analysis and
                        reasoning
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={startReasoningMode}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Enter Reasoning Mode
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* Right: Context */}
          <aside
            data-testid="golden-right"
            className="space-y-5 md:max-h-[calc(100vh-12rem)] md:overflow-auto"
            aria-label="Context"
          >
            <ProvidersPanel providers={providers} />
            <AboutPreview />
          </aside>
        </div>
      </main>

      {/* Reasoning Mode Modal */}
      {showReasoningMode && reasoningContext && (
        <ReasoningMode
          context={reasoningContext}
          onClose={closeReasoningMode}
        />
      )}
    </div>
  );
}
