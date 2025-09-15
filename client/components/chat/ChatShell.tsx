import { cn } from "@/lib/utils";
import { ChatArea } from "@/components/chat/ChatArea";
import { RightSidebar } from "@/components/chat/RightSidebar";
import type { Conversation } from "@/components/chat/types";
import type { QueryTemplate } from "@/components/chat/types";

export function ChatShell({
  conversation,
  siblings,
  queries,
  history,
  onSend,
  onBranchFrom,
  onSwitchConversation,
  onCloseConversation,
  onUseQuery,
  onOpenConversation,
  onNewChat,
  initialPrompt,
}: {
  conversation: Conversation;
  siblings: Conversation[];
  queries: QueryTemplate[];
  history: Conversation[];
  onSend: (text: string) => Promise<void>;
  onBranchFrom: (messageId: string) => void;
  onSwitchConversation: (id: string) => void;
  onCloseConversation: (id: string) => void;
  onUseQuery: (t: string) => void;
  onOpenConversation: (id: string) => void;
  onNewChat: () => void;
  initialPrompt?: string;
}) {
  return (
    <main className="py-4">
      <div
        className={cn(
          "mx-auto w-full max-w-[1500px] px-6",
          "grid",
          "grid-cols-1 lg:grid-cols-[1fr,20rem]",
          "min-h-0",
          "gap-4",
        )}
      >
        <div className="min-h-0 flex flex-col">
          <ChatArea
            conversation={conversation}
            siblingConversations={siblings}
            onSend={onSend}
            onBranchFrom={onBranchFrom}
            onSwitchConversation={onSwitchConversation}
            onCloseConversation={onCloseConversation}
            initialPrompt={initialPrompt}
          />
        </div>
        <RightSidebar
          className="min-h-0"
          queries={queries}
          onUseQuery={onUseQuery}
          history={history}
          onOpenConversation={onOpenConversation}
          onNewChat={onNewChat}
        />
      </div>
    </main>
  );
}
