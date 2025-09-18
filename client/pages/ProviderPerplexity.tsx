import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppHeader from "@/components/AppHeader";
import ProvidersMenu from "@/components/ProvidersMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { ChatArea } from "@/components/chat/ChatArea";
import { usePerplexityChat } from "@/hooks/use-perplexity-chat";
import { cn } from "@/lib/utils";
import { deterministicQueries } from "@/lib/queries";
import { TemplatesGrid } from "@/components/home/TemplatesGrid";

export default function ProviderPerplexity() {
  const {
    conversation,
    isLoading,
    isAvailable,
    sendMessage,
    clearConversation,
    checkAvailability,
  } = usePerplexityChat();

  const [showTemplates, setShowTemplates] = useState(true);
  // Local Perplexity API key managed in browser storage
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem("PERPLEXITY_API_KEY") || "";
    } catch {
      return "";
    }
  });
  const hasPerplexityKey = apiKey.trim().length > 0;

  // Check if Perplexity tool is available on mount
  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  // Filter queries to show only Perplexity-related ones
  const perplexityQueries = deterministicQueries.filter((q) =>
    q.id.startsWith("p"),
  );

  // Hide templates once conversation starts
  useEffect(() => {
    if (conversation.messages.length > 0) {
      setShowTemplates(false);
    }
  }, [conversation.messages.length]);

  // No-op handlers for chat components that aren't needed for standalone chat
  const handleBranchFrom = () => {};
  const handleSwitchConversation = () => {};
  const handleCloseConversation = () => {};

  const handleTemplateSelect = (template: string) => {
    setShowTemplates(false);
    sendMessage(template);
  };

  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr]">
      <AppHeader
        right={
          <>
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
            <ProvidersMenu />
            <ThemeToggle />
          </>
        }
      />
      <main className="container mx-auto py-6 px-4 flex flex-col">
        <section className="mx-auto max-w-4xl mb-6">
          <Card className="rounded-3xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Perplexity Search
                    {isAvailable !== null && (
                      <Badge variant={isAvailable ? "default" : "destructive"}>
                        {isAvailable ? "Available" : "Unavailable"}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Search the web using Perplexity AI with real-time
                    information. API key is handled securely on the server.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      clearConversation();
                      setShowTemplates(true);
                    }}
                    disabled={conversation.messages.length === 0}
                  >
                    Clear Chat
                  </Button>
                  {conversation.messages.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTemplates(!showTemplates)}
                    >
                      {showTemplates ? "Hide" : "Show"} Templates
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/">Back to Home</Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </section>

        {/* Perplexity API key controls */}
        <section className="mx-auto max-w-4xl mb-6">
          <Card className="rounded-3xl">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Perplexity API Key</div>
                  <Badge variant={hasPerplexityKey ? "default" : "secondary"}>
                    {hasPerplexityKey ? "Set" : "Not set"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter PERPLEXITY_API_KEY"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md bg-background"
                    aria-label="Perplexity API key"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      try {
                        if (apiKey.trim()) {
                          localStorage.setItem(
                            "PERPLEXITY_API_KEY",
                            apiKey.trim(),
                          );
                        }
                      } catch {}
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      try {
                        localStorage.removeItem("PERPLEXITY_API_KEY");
                        setApiKey("");
                      } catch {}
                    }}
                  >
                    Clear
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Stored locally and sent as the X-Perplexity-Key header only
                  when calling the Perplexity tool.
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {isAvailable === false && (
          <section className="mx-auto max-w-4xl mb-6">
            <Card className="rounded-3xl border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Perplexity tool is not available. Please ensure the
                  PERPLEXITY_API_KEY is configured on the server and the server
                  is running properly.
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        {showTemplates && isAvailable && perplexityQueries.length > 0 && (
          <section className="mx-auto max-w-4xl mb-6">
            <TemplatesGrid
              queries={perplexityQueries}
              onSelect={handleTemplateSelect}
            />
          </section>
        )}

        <section className="flex-1 mx-auto max-w-4xl w-full">
          <div
            className={cn(
              "rounded-3xl border bg-background/80 shadow-md h-full",
              "flex flex-col min-h-[600px]",
            )}
          >
            <ChatArea
              conversation={conversation}
              siblingConversations={[]}
              onSend={sendMessage}
              onBranchFrom={handleBranchFrom}
              onSwitchConversation={handleSwitchConversation}
              onCloseConversation={handleCloseConversation}
              initialPrompt={
                conversation.messages.length === 0
                  ? "What's the latest news about AI developments?"
                  : undefined
              }
            />
          </div>
        </section>
      </main>
    </div>
  );
}
