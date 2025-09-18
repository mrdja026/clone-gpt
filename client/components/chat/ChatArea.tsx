import { useEffect, useMemo, useRef, useState } from "react";
import type { Conversation, Message } from "./types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  GitBranch,
  Loader2,
  Folder,
  Copy,
  Check,
} from "lucide-react";
import { TabBar } from "./TabBar";

// Content type detection and parsing
interface ParsedContent {
  type: "text" | "code" | "markdown" | "structured";
  content: string;
  language?: string;
  metadata?: {
    isStructured?: boolean;
    hasCodeBlocks?: boolean;
    hasMarkdown?: boolean;
  };
}

function parseMessageContent(content: string): ParsedContent[] {
  const parts: ParsedContent[] = [];
  let remaining = content;

  // First, extract code blocks (```language\ncode\n```)
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      if (textBefore.trim()) {
        parts.push({
          type: "text",
          content: textBefore,
          metadata: { hasMarkdown: hasMarkdownSyntax(textBefore) },
        });
      }
    }

    // Add code block
    parts.push({
      type: "code",
      content: match[2],
      language: match[1] || "text",
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex);
    if (remainingText.trim()) {
      parts.push({
        type: "text",
        content: remainingText,
        metadata: {
          hasMarkdown: hasMarkdownSyntax(remainingText),
          isStructured: isStructuredContent(remainingText),
        },
      });
    }
  }

  // If no code blocks found, treat as single content
  if (parts.length === 0) {
    parts.push({
      type: "text",
      content: content,
      metadata: {
        hasMarkdown: hasMarkdownSyntax(content),
        isStructured: isStructuredContent(content),
      },
    });
  }

  return parts;
}

function hasMarkdownSyntax(text: string): boolean {
  return /(\*\*.*?\*\*|__.*?__|`.*?`|#{1,6}\s|^\s*[-*+]\s|\[.*?\]\(.*?\)|^\s*\d+\.\s)/m.test(
    text,
  );
}

function isStructuredContent(text: string): boolean {
  return (
    text.includes("JIRA Projects Search Results") ||
    text.includes("SEARCH PARAMETERS:") ||
    text.includes("FOUND") ||
    text.includes("═══") ||
    text.includes("───") ||
    text.includes("**Analysis:**") ||
    text.includes("### ")
  );
}

function formatMarkdown(text: string): string {
  let formatted = text;

  // Headers
  formatted = formatted.replace(
    /^### (.*$)/gm,
    '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>',
  );
  formatted = formatted.replace(
    /^## (.*$)/gm,
    '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>',
  );
  formatted = formatted.replace(
    /^# (.*$)/gm,
    '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>',
  );

  // Bold and italic
  formatted = formatted.replace(
    /\*\*(.*?)\*\*/g,
    '<strong class="font-semibold">$1</strong>',
  );
  formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

  // Inline code
  formatted = formatted.replace(
    /`([^`]+)`/g,
    '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>',
  );

  // Lists
  formatted = formatted.replace(
    /^\s*[-*+]\s(.*)$/gm,
    '<li class="ml-4">• $1</li>',
  );
  formatted = formatted.replace(
    /^\s*(\d+)\.\s(.*)$/gm,
    '<li class="ml-4">$1. $2</li>',
  );

  // Links
  formatted = formatted.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  return formatted;
}

// Copy to clipboard functionality
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded bg-background/80 hover:bg-background border border-border/50 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  );
}

// Language-specific syntax highlighting classes
function getLanguageClasses(language: string): string {
  const baseClasses =
    "block w-full p-3 rounded-md bg-muted font-mono text-sm overflow-x-auto";

  switch (language.toLowerCase()) {
    case "javascript":
    case "js":
      return `${baseClasses} text-yellow-600 dark:text-yellow-400`;
    case "typescript":
    case "ts":
      return `${baseClasses} text-blue-600 dark:text-blue-400`;
    case "python":
    case "py":
      return `${baseClasses} text-green-600 dark:text-green-400`;
    case "json":
      return `${baseClasses} text-purple-600 dark:text-purple-400`;
    case "bash":
    case "shell":
    case "sh":
      return `${baseClasses} text-gray-600 dark:text-gray-300`;
    case "sql":
      return `${baseClasses} text-orange-600 dark:text-orange-400`;
    case "css":
      return `${baseClasses} text-pink-600 dark:text-pink-400`;
    case "html":
      return `${baseClasses} text-red-600 dark:text-red-400`;
    default:
      return `${baseClasses} text-foreground`;
  }
}

// Enhanced message formatting with emojis and structure
function formatMessageContent(content: string): string {
  let formatted = content;

  // JIRA Projects formatting
  formatted = formatted.replace(
    /JIRA Projects Search Results/g,
    "🔍 JIRA Projects Search Results",
  );
  formatted = formatted.replace(
    /═══════════════════════════════════════════════════════════════/g,
    "═".repeat(50),
  );
  formatted = formatted.replace(
    /───────────────────────────────────────────────────────────────/g,
    "─".repeat(50),
  );

  // Search parameters
  formatted = formatted.replace(/SEARCH PARAMETERS:/g, "🔧 SEARCH PARAMETERS:");
  formatted = formatted.replace(/• Status:/g, "📊 Status:");
  formatted = formatted.replace(/• Query:/g, "🔍 Query:");
  formatted = formatted.replace(/• Domain:/g, "🌐 Domain:");
  formatted = formatted.replace(/• Recency:/g, "⏰ Recency:");

  // Found results
  formatted = formatted.replace(
    /FOUND (\d+) PROJECTS?:/g,
    "✅ FOUND $1 PROJECT(S):",
  );
  formatted = formatted.replace(
    /FOUND (\d+) BOARDS?:/g,
    "📋 FOUND $1 BOARD(S):",
  );
  formatted = formatted.replace(
    /FOUND (\d+) ISSUES?:/g,
    "🎫 FOUND $1 ISSUE(S):",
  );
  formatted = formatted.replace(/FOUND (\d+) EPICS?:/g, "🎯 FOUND $1 EPIC(S):");

  // Project details
  formatted = formatted.replace(/• ID:/g, "🆔 ID:");
  formatted = formatted.replace(/• Type:/g, "🏗️ Type:");
  formatted = formatted.replace(/• Style:/g, "🎨 Style:");
  formatted = formatted.replace(/• Simplified:/g, "⚡ Simplified:");
  formatted = formatted.replace(/• Avatar:/g, "👤 Avatar:");
  formatted = formatted.replace(/• Key:/g, "🔑 Key:");
  formatted = formatted.replace(/• Name:/g, "📝 Name:");
  formatted = formatted.replace(/• Status:/g, "📊 Status:");
  formatted = formatted.replace(/• Priority:/g, "🚨 Priority:");
  formatted = formatted.replace(/• Assignee:/g, "👨‍💻 Assignee:");
  formatted = formatted.replace(/• Reporter:/g, "📝 Reporter:");
  formatted = formatted.replace(/• Story Points:/g, "📊 Story Points:");
  formatted = formatted.replace(/• Sprint:/g, "🏃‍♂️ Sprint:");

  // Board details
  formatted = formatted.replace(/• Board Type:/g, "📋 Board Type:");
  formatted = formatted.replace(/• Active Sprints:/g, "🏃‍♂️ Active Sprints:");
  formatted = formatted.replace(/• Configuration:/g, "⚙️ Configuration:");
  formatted = formatted.replace(/• Filter ID:/g, "🔍 Filter ID:");
  formatted = formatted.replace(/• Estimation:/g, "📊 Estimation:");
  formatted = formatted.replace(/• Columns:/g, "📋 Columns:");

  // Analysis sections
  formatted = formatted.replace(/\*\*Analysis:\*\*/g, "📊 **Analysis:**");
  formatted = formatted.replace(
    /\*\*Searching for projects:\*\*/g,
    "🔍 **Searching for projects:**",
  );
  formatted = formatted.replace(
    /\*\*Project Overview\*\*/g,
    "📋 **Project Overview**",
  );
  formatted = formatted.replace(
    /### Project Overview/g,
    "📋 ### Project Overview",
  );
  formatted = formatted.replace(
    /### Key Points for Team Planning/g,
    "🎯 ### Key Points for Team Planning",
  );
  formatted = formatted.replace(/### Next Steps/g, "🚀 ### Next Steps");
  formatted = formatted.replace(
    /### Recommendations/g,
    "💡 ### Recommendations",
  );

  // Common JIRA terms
  formatted = formatted.replace(/\b(Epic|EPIC)\b/g, "🎯 Epic");
  formatted = formatted.replace(/\b(Story|STORY)\b/g, "📖 Story");
  formatted = formatted.replace(/\b(Task|TASK)\b/g, "✅ Task");
  formatted = formatted.replace(/\b(Bug|BUG)\b/g, "🐛 Bug");
  formatted = formatted.replace(/\b(Subtask|SUBTASK)\b/g, "📝 Subtask");
  formatted = formatted.replace(/\b(Sprint|SPRINT)\b/g, "🏃‍♂️ Sprint");
  formatted = formatted.replace(/\b(Board|BOARD)\b/g, "📋 Board");
  formatted = formatted.replace(/\b(Backlog|BACKLOG)\b/g, "📚 Backlog");

  // Status indicators
  formatted = formatted.replace(/\b(To Do|TODO)\b/g, "⏳ To Do");
  formatted = formatted.replace(
    /\b(In Progress|IN PROGRESS)\b/g,
    "🔄 In Progress",
  );
  formatted = formatted.replace(/\b(Done|DONE)\b/g, "✅ Done");
  formatted = formatted.replace(/\b(Blocked|BLOCKED)\b/g, "🚫 Blocked");
  formatted = formatted.replace(/\b(Review|REVIEW)\b/g, "👀 Review");
  formatted = formatted.replace(/\b(Testing|TESTING)\b/g, "🧪 Testing");

  // Priority indicators
  formatted = formatted.replace(/\b(Critical|CRITICAL)\b/g, "🔴 Critical");
  formatted = formatted.replace(/\b(High|HIGH)\b/g, "🟠 High");
  formatted = formatted.replace(/\b(Medium|MEDIUM)\b/g, "🟡 Medium");
  formatted = formatted.replace(/\b(Low|LOW)\b/g, "🟢 Low");
  formatted = formatted.replace(/\b(Lowest|LOWEST)\b/g, "⚪ Lowest");

  // Time tracking
  formatted = formatted.replace(
    /• Original Estimate:/g,
    "⏱️ Original Estimate:",
  );
  formatted = formatted.replace(/• Time Spent:/g, "⏰ Time Spent:");
  formatted = formatted.replace(/• Remaining:/g, "⏳ Remaining:");

  // Perplexity search results
  formatted = formatted.replace(/\*\*Sources:\*\*/g, "📚 **Sources:**");
  formatted = formatted.replace(/\*\*Citations:\*\*/g, "📖 **Citations:**");
  formatted = formatted.replace(
    /\*\*Search Results:\*\*/g,
    "🔍 **Search Results:**",
  );

  // General improvements
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, "✨ **$1**"); // Bold text with sparkle
  formatted = formatted.replace(/(\d+)\./g, "🔢 $1."); // Numbered lists

  // Clean up multiple consecutive emojis
  formatted = formatted.replace(/(🔢\s+)(\d+\.\s+)(🎯|📖|✅|🐛|📝)/g, "$1$2$3");

  return formatted;
}

interface ChatAreaProps {
  conversation: Conversation;
  siblingConversations: Conversation[];
  onSend: (text: string) => Promise<void>;
  onBranchFrom: (messageId: string) => void;
  onSwitchConversation: (id: string) => void;
  onCloseConversation: (id: string) => void;
  initialPrompt?: string;
}

export function ChatArea({
  conversation,
  siblingConversations,
  onSend,
  onBranchFrom,
  onSwitchConversation,
  onCloseConversation,
  initialPrompt,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages.length]);

  useEffect(() => {
    if (initialPrompt !== undefined) setInput(initialPrompt);
  }, [initialPrompt]);

  // Focus input when a new chat starts or when initialPrompt changes
  useEffect(() => {
    if (conversation.messages.length === 0 || initialPrompt !== undefined) {
      // Defer focus to next tick to ensure element is mounted
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [conversation.id, conversation.messages.length, initialPrompt]);

  const groupHeadId = conversation.groupId ?? conversation.id;
  const base = useMemo(
    () =>
      siblingConversations.find((c) => c.id === groupHeadId) || conversation,
    [siblingConversations, groupHeadId, conversation],
  );
  const branches = useMemo(
    () => siblingConversations.filter((c) => c.id !== groupHeadId),
    [siblingConversations, groupHeadId],
  );

  const firstLevelCount = useMemo(
    () => branches.filter((c) => c.parentId === base.id).length,
    [branches, base.id],
  );

  const tabs = useMemo(() => {
    if (branches.length === 0)
      return [] as { id: string; label: React.ReactNode; closable?: boolean }[];
    const branchTabs = branches.map((c, i) => ({
      id: c.id,
      label: `B${i + 1}`,
    }));
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
          <TabBar
            tabs={tabs}
            activeId={conversation.id}
            onChange={onSwitchConversation}
            onClose={(id) =>
              id === base.id ? undefined : onCloseConversation(id)
            }
          />
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="mx-auto w-full max-w-[72ch] space-y-4">
            {conversation.messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm">
                Start by selecting a deterministic query on the right or type
                your own prompt below.
              </div>
            )}
            {conversation.messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                onBranch={() => onBranchFrom(m.id)}
                allowBranch={true}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      </ScrollArea>
      <div className="border-t p-4 bg-background">
        <div className="mx-auto w-full max-w-[72ch]">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={inputRef}
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
            <Button
              onClick={handleSend}
              disabled={isSending}
              className="h-[56px] px-4"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FolderWithSubs({ count }: { count: number }) {
  const minis = Math.min(3, count);
  return (
    <span className="relative inline-flex items-center">
      <Folder className="h-4 w-4 text-primary" />
      {Array.from({ length: minis }).map((_, i) => (
        <Folder
          key={i}
          className="h-3 w-3 text-accent absolute"
          style={{ left: 10 + i * 6, bottom: -2 - i * 2, opacity: 0.9 }}
        />
      ))}
      {count > 3 && (
        <span className="ml-[28px] text-[10px] leading-none rounded-sm bg-secondary px-1 py-0.5 text-secondary-foreground">
          +{count - 3}
        </span>
      )}
    </span>
  );
}

function MessageBubble({
  message,
  onBranch,
  allowBranch,
}: {
  message: Message;
  onBranch: () => void;
  allowBranch: boolean;
}) {
  const isUser = message.role === "user";

  // Parse the message content into different types
  const parsedContent = isUser
    ? [{ type: "text" as const, content: message.content }]
    : parseMessageContent(message.content);

  // Check content types
  const hasCodeBlocks = parsedContent.some((part) => part.type === "code");
  const hasMarkdown = parsedContent.some((part) => part.metadata?.hasMarkdown);
  const isStructuredResponse = parsedContent.some(
    (part) => part.metadata?.isStructured,
  );

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          (isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card text-foreground border") +
          " max-w-[90%] rounded-lg px-4 py-3 shadow-sm"
        }
      >
        {/* Role indicator for assistant messages */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/20">
            <span className="text-xs font-medium text-muted-foreground">
              🤖 JiraGPT Assistant
            </span>
            {/* Content type indicators */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {hasCodeBlocks && <span title="Contains code">💻</span>}
              {hasMarkdown && <span title="Markdown formatted">📝</span>}
              {isStructuredResponse && <span title="Structured data">📊</span>}
            </div>
          </div>
        )}

        {/* Render parsed content */}
        <div className="space-y-3">
          {parsedContent.map((part, index) => (
            <div key={index}>
              {part.type === "code" ? (
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      💻 {part.language?.toUpperCase() || "CODE"}
                    </span>
                  </div>
                  <div className="relative">
                    <pre
                      className={getLanguageClasses(part.language || "text")}
                    >
                      <code>{part.content}</code>
                    </pre>
                    <CopyButton text={part.content} />
                  </div>
                </div>
              ) : (
                <div
                  className={
                    part.metadata?.isStructured
                      ? "font-mono text-xs leading-relaxed"
                      : "text-sm leading-relaxed"
                  }
                >
                  {part.metadata?.hasMarkdown ? (
                    <div
                      className="prose prose-sm dark:prose-invert break-words prose-pre:overflow-x-auto prose-code:break-words"
                      dangerouslySetInnerHTML={{
                        __html: formatMarkdown(
                          part.metadata?.isStructured
                            ? formatMessageContent(part.content)
                            : part.content,
                        ),
                      }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap break-words">
                      {part.metadata?.isStructured
                        ? formatMessageContent(part.content)
                        : part.content}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Enhanced metadata for complex responses */}
        {!isUser && (hasCodeBlocks || hasMarkdown || isStructuredResponse) && (
          <div className="mt-3 pt-2 border-t border-border/20">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {hasCodeBlocks && <span>💻 Code Blocks</span>}
              {hasMarkdown && <span>📝 Markdown</span>}
              {isStructuredResponse && <span>📊 Structured Data</span>}
              {(hasCodeBlocks || hasMarkdown || isStructuredResponse) && (
                <>
                  <span>•</span>
                  <span>🎨 Enhanced Formatting</span>
                </>
              )}
            </div>
          </div>
        )}

        {!isUser && allowBranch && (
          <div className="mt-3 pt-2 border-t border-border/20 text-xs text-muted-foreground flex items-center gap-3">
            <button
              className="inline-flex items-center gap-1 hover:underline hover:text-foreground transition-colors"
              onClick={onBranch}
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span>Branch conversation</span>
            </button>
            <span className="text-xs opacity-60">
              💡 Continue from this point
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
