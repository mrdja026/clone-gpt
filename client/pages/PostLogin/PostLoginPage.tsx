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
  const {
    pendingPrompt,
    setPendingPrompt,
    active,
    siblings,
    onSend,
    onBranchFrom,
    onSwitchConversation,
    onCloseConversation,
  } = usePostLogin();

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
    </div>
  );
}
