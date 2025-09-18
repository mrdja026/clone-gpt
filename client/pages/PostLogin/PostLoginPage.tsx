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
import { Brain } from "lucide-react";
import { jiraUseCaseGroups } from "@/lib/queries";
import type { JiraUseCaseItem } from "@/lib/queries";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  // Helper to fill template placeholders like {TICKET_KEY}
  function fillTemplate(tmpl: string, kv: Record<string, string>) {
    return tmpl.replace(/\{([A-Z_]+)\}/g, (_, name) => {
      return kv[name] ?? `{${name}}`;
    });
  }

  async function handleUseCase(item: {
    id: string;
    label: string;
    template: string;
    friendly?: string;
    placeholders?: Array<{
      name: string;
      hint?: string;
      example?: string;
      validator?: string;
    }>;
    exampleFilled?: string;
  }) {
    // If placeholders are defined, collect values via prompt (MVP UX)
    const values: Record<string, string> = {};
    if (item.placeholders && item.placeholders.length > 0) {
      for (const ph of item.placeholders) {
        // eslint-disable-next-line no-alert
        const val = window.prompt(
          `Enter ${ph.name}${ph.hint ? ` (${ph.hint})` : ""}${ph.example ? `, e.g. ${ph.example}` : ""}:`,
          ph.example || "",
        );
        if (val == null || val.trim() === "") {
          // User cancelled or empty — abort
          return;
        }
        const trimmed = val.trim();
        if (ph.validator) {
          try {
            const re = new RegExp(ph.validator);
            if (!re.test(trimmed)) {
              // eslint-disable-next-line no-alert
              window.alert(
                `Value "${trimmed}" does not match expected format for ${ph.name}.`,
              );
              return;
            }
          } catch {
            // ignore invalid regex
          }
        }
        values[ph.name] = trimmed;
      }
    }

    const finalPrompt =
      item.placeholders && item.placeholders.length > 0
        ? fillTemplate(item.template, values)
        : item.template;

    setPendingPrompt(finalPrompt);
    // Keep user on PostLogin page per current flow; ChatPanel will pick up pendingPrompt
  }

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

            {/* Jira Use Cases Catalog */}
            <section className="rounded-xl border p-4 bg-card">
              <h3 className="font-medium mb-2">Jira Use Cases</h3>
              <div className="space-y-4">
                {jiraUseCaseGroups.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <div className="text-sm font-medium">{group.title}</div>
                    {group.description && (
                      <div className="text-xs text-muted-foreground">
                        {group.description}
                      </div>
                    )}
                    <div className="space-y-2 mt-2">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-md border bg-background p-2"
                          data-testid={`usecase-${item.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-medium">
                                {item.label}
                              </div>
                              {item.friendly && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {item.friendly}
                                </div>
                              )}
                              {item.placeholders &&
                                item.placeholders.length > 0 && (
                                  <div className="text-[11px] mt-1 text-muted-foreground">
                                    Placeholders:{" "}
                                    {item.placeholders
                                      .map((p) => p.name)
                                      .join(", ")}
                                  </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                              {item.exampleFilled && (
                                <button
                                  className="text-xs px-2 py-1 rounded-md border hover:bg-accent hover:text-accent-foreground"
                                  onClick={() =>
                                    setPendingPrompt(item.exampleFilled!)
                                  }
                                  title="Use example"
                                  data-testid={`usecase-example-${item.id}`}
                                >
                                  Example
                                </button>
                              )}
                              <button
                                className="text-xs px-2 py-1 rounded-md border bg-primary text-primary-foreground hover:opacity-90"
                                onClick={() => handleUseCase(item)}
                                data-testid={`usecase-use-${item.id}`}
                              >
                                Use
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
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
