import { cn } from "@/lib/utils";
import { QuerySearch } from "@/components/QuerySearch";
import { ChatArea } from "@/components/chat/ChatArea";
import { deterministicQueries } from "@/lib/queries";
import type { Conversation } from "@/components/chat/types";

interface ChatPanelProps {
  pendingPrompt: string | undefined;
  setPendingPrompt: (prompt: string | undefined) => void;
  onSend: (text: string) => Promise<void>;
  conversation: Conversation;
  siblingConversations: Conversation[];
  onBranchFrom: (messageId: string) => void;
  onSwitchConversation: (id: string) => void;
  onCloseConversation: (id: string) => void;
}

export default function ChatPanel({
  pendingPrompt,
  setPendingPrompt,
  onSend,
  conversation,
  siblingConversations,
  onBranchFrom,
  onSwitchConversation,
  onCloseConversation,
}: ChatPanelProps) {
  return (
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
          conversation={conversation}
          siblingConversations={siblingConversations}
          onSend={onSend}
          onBranchFrom={onBranchFrom}
          onSwitchConversation={onSwitchConversation}
          onCloseConversation={onCloseConversation}
          initialPrompt={pendingPrompt}
        />
      </div>
    </section>
  );
}
