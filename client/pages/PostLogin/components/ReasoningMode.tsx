import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Brain, Send, X, MessageCircle, Database, Clock } from "lucide-react";
import type { ReasoningContext, ChatMessage } from "@shared/api";
import { useReasoningMode } from "../hooks/useReasoningMode";
import { cn } from "@/lib/utils";

interface ReasoningModeProps {
  context: ReasoningContext;
  onClose: () => void;
}

export default function ReasoningMode({
  context,
  onClose,
}: ReasoningModeProps) {
  const [input, setInput] = useState("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    session,
    isLoading,
    error,
    startReasoningSession,
    sendReasoningMessageStreaming,
    endReasoningSession,
  } = useReasoningMode();

  // Initialize session when component mounts
  useEffect(() => {
    startReasoningSession(context).catch(console.error);
    return () => {
      endReasoningSession();
    };
  }, [context, startReasoningSession, endReasoningSession]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.messages, streamingMessage]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput("");
    setStreamingMessage("");

    try {
      await sendReasoningMessageStreaming(message, (chunk) => {
        setStreamingMessage((prev) => prev + chunk);
      });
    } catch (err) {
      console.error("Failed to send reasoning message:", err);
    } finally {
      setStreamingMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case "jira_ticket":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "search":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "analysis":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <CardHeader className="flex-shrink-0 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">Reasoning Mode</CardTitle>
              <Badge variant="secondary" className="text-xs">
                Active Session
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Context Summary */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="font-medium">Original Query:</span>
              <span className="truncate">{context.originalQuery}</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="font-medium">Intent:</span>
              <Badge
                className={cn(
                  "text-xs",
                  getIntentColor(
                    context.combinedData.laneAOutput.detectedIntent,
                  ),
                )}
              >
                {context.combinedData.laneAOutput.detectedIntent.replace(
                  "_",
                  " ",
                )}
              </Badge>
              <span className="text-xs">
                ({Math.round(context.combinedData.laneAOutput.confidence * 100)}
                % confidence)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Session:</span>
              <span className="text-xs">
                {formatTimestamp(context.timestamp)}
              </span>
            </div>
          </div>
        </CardHeader>

        <Separator />

        {/* Chat Messages */}
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {/* Initial context message */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                  <Brain className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="text-sm font-medium">Reasoning Assistant</div>
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    I now have full context from your three-lane analysis. I can
                    help you reason about the data, explore insights, answer
                    follow-up questions, or dive deeper into any aspect of the
                    results. What would you like to discuss?
                  </div>
                </div>
              </div>

              {/* Conversation messages */}
              {session?.messages.map((message, index) => (
                <div key={index} className="flex gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      message.role === "user"
                        ? "bg-blue-100 dark:bg-blue-900"
                        : "bg-purple-100 dark:bg-purple-900",
                    )}
                  >
                    {message.role === "user" ? (
                      <span className="text-xs font-medium text-blue-600">
                        U
                      </span>
                    ) : (
                      <Brain className="h-4 w-4 text-purple-600" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-medium">
                      {message.role === "user" ? "You" : "Reasoning Assistant"}
                    </div>
                    <div
                      className={cn(
                        "text-sm p-3 rounded-lg whitespace-pre-wrap",
                        message.role === "user"
                          ? "bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100"
                          : "bg-muted",
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming message */}
              {streamingMessage && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                    <Brain className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-medium">
                      Reasoning Assistant
                    </div>
                    <div className="text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap">
                      {streamingMessage}
                      <span className="animate-pulse">▋</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center flex-shrink-0">
                    <X className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-medium text-red-600">
                      Error
                    </div>
                    <div className="text-sm bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 p-3 rounded-lg">
                      {error}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Input area */}
          <div className="p-4 space-y-2">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask questions, explore insights, or reason about the data..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Press Enter to send • This is a reasoning conversation about your
              analyzed data
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
