import { useEffect, useMemo, useRef, useState } from "react";
import type { Conversation, Message } from "./types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, GitBranch, Loader2, Folder } from "lucide-react";
import { TabBar } from "./TabBar";

interface ChatAreaProps {
  conversation: Conversation;
  siblingConversations: Conversation[];
  onSend: (text: string) => Promise<void>;
  onBranchFrom: (messageId: string) => void;
  onSwitchConversation: (id: string) => void;
  onCloseConversation: (id: string) => void;
  initialPrompt?: string;
}

export function ChatArea({ conversation, siblingConversations, onSend, onBranchFrom, onSwitchConversation, onCloseConversation, initialPrompt }: ChatAreaProps) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages.length]);

  useEffect(() => {
    if (initialPrompt !== undefined) setInput(initialPrompt);
  }, [initialPrompt]);

  const groupHeadId = conversation.groupId ?? conversation.id;
  const base = useMemo(() => siblingConversations.find((c) => c.id === groupHeadId) || conversation, [siblingConversations, groupHeadId, conversation]);
  const branches = useMemo(() => siblingConversations.filter((c) => c.id !== groupHeadId), [siblingConversations, groupHeadId]);

  const firstLevelCount = useMemo(() => branches.filter((c) => c.parentId === base.id).length, [branches, base.id]);

  const tabs = useMemo(() => {
    if (branches.length === 0) return [] as { id: string; label: React.ReactNode; closable?: boolean }[];
    const branchTabs = branches.map((c, i) => ({ id: c.id, label: `B${i + 1}` }));
    const mainLabel = (
      <span className="flex items-center gap-2">
        <FolderWithSubs count={firstLevelCount} />
        <span className="truncate max-w-[26ch]">{base.title}</span>
      </span>
    );
    return [{ id: base.id, label: mainLabel, closable: false }, ...branchTabs];
  }, [branches, base.id, base.title, firstLevelCount]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setIsSending(true);
    try {
      await onSend(text);
      setInput("");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="flex-1 flex flex-col">
      {tabs.length > 0 && (
        <div className="border-b bg-card">
          <TabBar tabs={tabs} activeId={conversation.id} onChange={onSwitchConversation} onClose={(id)=> id===base.id? undefined : onCloseConversation(id)} />
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {conversation.messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm">
              Start by selecting a deterministic query on the right or type your own prompt below.
            </div>
          )}
          {conversation.messages.map((m) => (
            <MessageBubble key={m.id} message={m} onBranch={() => onBranchFrom(m.id)} allowBranch={true} />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="border-t p-4 bg-background">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything…"
            className="min-h-[56px] flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button onClick={handleSend} disabled={isSending} className="h-[56px] px-4">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </section>
  );
}

function MessageBubble({ message, onBranch, allowBranch }: { message: Message; onBranch: () => void; allowBranch: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={
        (isUser ? "bg-primary text-primary-foreground" : "bg-card text-foreground border") +
        " max-w-[80%] rounded-lg px-4 py-3 shadow-sm"
      }>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
        {!isUser && allowBranch && (
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
            <button className="inline-flex items-center gap-1 hover:underline" onClick={onBranch}>
              <GitBranch className="h-3.5 w-3.5" /> Branch
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
