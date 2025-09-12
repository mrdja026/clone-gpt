import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { MessageSquare, History, Plus } from "lucide-react";
import type { Conversation, QueryTemplate } from "./types";

interface RightSidebarProps {
  className?: string;
  queries: QueryTemplate[];
  onUseQuery: (t: string) => void;
  history: Conversation[];
  onOpenConversation: (id: string) => void;
  onNewChat: () => void;
}

export function RightSidebar({
  className,
  queries,
  onUseQuery,
  history,
  onOpenConversation,
  onNewChat,
}: RightSidebarProps) {
  return (
    <aside
      className={cn(
        "w-full lg:w-80 border-l bg-sidebar text-sm flex flex-col",
        className,
      )}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="font-semibold text-sidebar-foreground">Panel</div>
        <Button
          size="sm"
          onClick={onNewChat}
          className="bg-primary text-primary-foreground"
        >
          <Plus className="mr-2" /> New chat
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <section>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
              Deterministic queries
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {queries.map((q) => (
                <button
                  key={q.id}
                  onClick={() => onUseQuery(q.template)}
                  className="text-left rounded-md border bg-background hover:bg-accent hover:text-accent-foreground px-3 py-2 transition flex items-start gap-2"
                >
                  <MessageSquare className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{q.label}</span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
              Past chats
            </h3>
            <div className="space-y-2">
              {history.length === 0 && (
                <div className="text-muted-foreground text-xs">
                  No chats yet
                </div>
              )}
              {history.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onOpenConversation(c.id)}
                  className="w-full text-left rounded-md border bg-background hover:bg-accent hover:text-accent-foreground px-3 py-2 transition flex items-center gap-2"
                >
                  <History className="h-4 w-4 text-primary" />
                  <span className="truncate">{c.title}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}
