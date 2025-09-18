import { useState, useCallback } from "react";
import { mcpClient } from "@/lib/mcp-client";
import { useToast } from "@/hooks/use-toast";
import type { Conversation, Message } from "@/components/chat/types";

// Simple ID generator
const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function usePerplexityChat() {
  const [conversation, setConversation] = useState<Conversation>({
    id: "perplexity-chat",
    title: "Perplexity Search",
    messages: [],
    createdAt: Date.now(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const { toast } = useToast();

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      // Check if Perplexity is available before sending
      if (isAvailable === false) {
        toast({
          title: "Service Unavailable",
          description:
            "Perplexity search is not available. Please check the server configuration.",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);

      const actualQuery = text.trim();

      // Add user message
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: text.trim(),
        createdAt: Date.now(),
      };

      setConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      try {
        // Call appropriate Perplexity tool via MCP
        const response = await mcpClient.callTool("fetch_perplexity_data", {
          query: actualQuery,
        });

        // Parse the response content
        const contentText =
          response.content?.[0]?.text || "No response received";
        let responseContent = contentText;

        // Try to parse and extract the assistant's message from the API response
        try {
          const parsed = JSON.parse(contentText);
          if (parsed.choices?.[0]?.message?.content) {
            responseContent = parsed.choices[0].message.content;
          } else if (parsed.content) {
            responseContent = parsed.content;
          } else if (parsed.error) {
            responseContent = `Error: ${parsed.error}${parsed.message ? ` - ${parsed.message}` : ""}`;
          }
        } catch {
          // If parsing fails, use the raw content
          responseContent = contentText;
        }

        // Add assistant message
        const assistantMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: responseContent,
          createdAt: Date.now(),
        };

        setConversation((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
        }));
      } catch (error) {
        console.error("Perplexity search error:", error);
        const errorMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Failed to search with Perplexity"}`,
          createdAt: Date.now(),
        };

        setConversation((prev) => ({
          ...prev,
          messages: [...prev.messages, errorMessage],
        }));

        toast({
          title: "Search Error",
          description:
            "Failed to search with Perplexity. Please check your API configuration.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, toast, isAvailable],
  );

  const clearConversation = useCallback(() => {
    setConversation((prev) => ({
      ...prev,
      messages: [],
    }));
  }, []);

  const checkAvailability = useCallback(async () => {
    try {
      const tools = await mcpClient.listTools();
      const available = tools.some(
        (tool) => tool.name === "fetch_perplexity_data",
      );
      setIsAvailable(available);
      return available;
    } catch (error) {
      console.error("Failed to check Perplexity tool availability:", error);
      setIsAvailable(false);
      return false;
    }
  }, []);

  return {
    conversation,
    isLoading,
    isAvailable,
    sendMessage,
    clearConversation,
    checkAvailability,
  };
}
