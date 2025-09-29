import { useState, useCallback } from "react";
import type {
  ReasoningContext,
  ReasoningModeRequest,
  ReasoningModeResponse,
  ChatMessage,
} from "@shared/api";

interface ReasoningSession {
  sessionId: string;
  context: ReasoningContext;
  messages: ChatMessage[];
  isActive: boolean;
}

export function useReasoningMode() {
  const [session, setSession] = useState<ReasoningSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Start a new reasoning session with context from three-lane processing
   */
  const startReasoningSession = useCallback(
    async (context: ReasoningContext) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/reasoning/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(context),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to start reasoning session: ${response.statusText}`,
          );
        }

        const { sessionId } = await response.json();

        const newSession: ReasoningSession = {
          sessionId,
          context,
          messages: [],
          isActive: true,
        };

        setSession(newSession);
        return sessionId;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to start reasoning session";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /**
   * Send a message in reasoning mode
   */
  const sendReasoningMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!session) {
        throw new Error("No active reasoning session");
      }

      setIsLoading(true);
      setError(null);

      try {
        const request: ReasoningModeRequest = {
          message,
          context: session.context,
          chatHistory: session.messages,
          sessionId: session.sessionId,
        };

        const response = await fetch("/api/reasoning/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to send reasoning message: ${response.statusText}`,
          );
        }

        const result: ReasoningModeResponse = await response.json();

        // Update session with new messages
        const userMessage: ChatMessage = { role: "user", content: message };
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: result.response,
        };

        setSession((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, userMessage, assistantMessage],
              }
            : null,
        );

        return result.response;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to send reasoning message";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [session],
  );

  /**
   * Send a streaming message in reasoning mode
   */
  const sendReasoningMessageStreaming = useCallback(
    async (
      message: string,
      onUpdate: (chunk: string) => void,
    ): Promise<string> => {
      if (!session) {
        throw new Error("No active reasoning session");
      }

      setIsLoading(true);
      setError(null);

      try {
        const request: ReasoningModeRequest = {
          message,
          context: session.context,
          chatHistory: session.messages,
          sessionId: session.sessionId,
        };

        const response = await fetch("/api/reasoning/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to send reasoning message: ${response.statusText}`,
          );
        }

        // For now, handle as non-streaming since we don't have streaming implemented yet
        const result: ReasoningModeResponse = await response.json();

        // Simulate streaming by chunking the response
        const chunks = result.response.split(" ");
        let fullResponse = "";

        for (let i = 0; i < chunks.length; i++) {
          const chunk = (i === 0 ? "" : " ") + chunks[i];
          fullResponse += chunk;
          onUpdate(chunk);
          // Small delay to simulate streaming
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        // Update session with new messages
        const userMessage: ChatMessage = { role: "user", content: message };
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: result.response,
        };

        setSession((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, userMessage, assistantMessage],
              }
            : null,
        );

        return result.response;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to send reasoning message";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [session],
  );

  /**
   * End the current reasoning session
   */
  const endReasoningSession = useCallback(() => {
    setSession(null);
    setError(null);
  }, []);

  /**
   * Check if reasoning mode is available (has context)
   */
  const isReasoningAvailable = useCallback((context?: ReasoningContext) => {
    return !!context;
  }, []);

  return {
    session,
    isLoading,
    error,
    startReasoningSession,
    sendReasoningMessage,
    sendReasoningMessageStreaming,
    endReasoningSession,
    isReasoningAvailable,
    isActive: !!session?.isActive,
  };
}
