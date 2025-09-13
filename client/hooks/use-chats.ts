import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { DBChat, DBMessage } from "@shared/api";

export function useChats(userId?: string) {
  const [chats, setChats] = useState<DBChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChats();
  }, [userId]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("chats")
        .select("*")
        .order("updated_at", { ascending: false });

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setChats(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch chats");
    } finally {
      setLoading(false);
    }
  };

  const createChat = async (title?: string): Promise<DBChat | null> => {
    try {
      const { data, error } = await supabase
        .from("chats")
        .insert({
          title: title || "New Chat",
          user_id: userId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setChats((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create chat");
      return null;
    }
  };

  const updateChat = async (
    id: string,
    updates: Partial<DBChat>,
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("chats")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setChats((prev) =>
        prev.map((chat) => (chat.id === id ? { ...chat, ...updates } : chat)),
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update chat");
      return false;
    }
  };

  const deleteChat = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from("chats").delete().eq("id", id);

      if (error) throw error;

      // Remove from local state
      setChats((prev) => prev.filter((chat) => chat.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete chat");
      return false;
    }
  };

  return {
    chats,
    loading,
    error,
    fetchChats,
    createChat,
    updateChat,
    deleteChat,
  };
}

export function useChatMessages(chatId: string) {
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (chatId) {
      fetchMessages();
    }
  }, [chatId]);

  const fetchMessages = async () => {
    if (!chatId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(
        (data || []).map((m) => ({
          ...m,
          role: (m.role === "user" || m.role === "assistant"
            ? m.role
            : "assistant") as DBMessage["role"],
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch messages");
    } finally {
      setLoading(false);
    }
  };

  const addMessage = async (
    content: string,
    role: "user" | "assistant",
  ): Promise<DBMessage | null> => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          content,
          role,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      const coerced: DBMessage = {
        ...data,
        role: (data.role === "user" || data.role === "assistant"
          ? data.role
          : "assistant") as DBMessage["role"],
      };
      setMessages((prev) => [...prev, coerced]);
      return coerced;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add message");
      return null;
    }
  };

  return {
    messages,
    loading,
    error,
    fetchMessages,
    addMessage,
  };
}
