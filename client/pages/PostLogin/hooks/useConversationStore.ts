import { useState, useMemo } from "react";
import type { Conversation } from "@/components/chat/types";
import { uid, summarizeTitle, STORAGE_KEY, STORAGE_ACTIVE } from "../lib";

export function useConversationStore() {
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: uid("conv"), title: "New chat", messages: [], createdAt: Date.now() },
  ]);
  const [activeId, setActiveId] = useState<string>(conversations[0].id);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId)!,
    [conversations, activeId],
  );
  
  const activeGroup = useMemo(() => active.groupId ?? active.id, [active]);
  
  const siblings = useMemo(
    () => conversations.filter((c) => (c.groupId ?? c.id) === activeGroup),
    [conversations, activeGroup],
  );

  const updateConversations = (updater: (prev: Conversation[]) => Conversation[]) => {
    setConversations(updater);
  };

  const switchConversation = (id: string) => {
    setActiveId(id);
  };

  const closeConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  const branchFromMessage = (messageId: string) => {
    const current = conversations.find((c) => c.id === activeId);
    if (!current) return;
    
    const idx = current.messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return;
    
    const baseGroup = current.groupId ?? current.id;
    const seed = current.messages.slice(0, idx + 1);
    const existing = conversations.filter((c) => (c.groupId ?? c.id) === baseGroup);
    const count = existing.filter((c) => c.parentId === baseGroup).length;
    
    const newConv: Conversation = {
      id: uid("conv"),
      title: `Branch ${Math.max(1, count + 1)}`,
      messages: seed,
      groupId: baseGroup,
      parentId: current.id,
      createdAt: Date.now(),
    };
    
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
  };

  const persistToStorage = (finalConv?: Conversation) => {
    try {
      const existingRaw = localStorage.getItem(STORAGE_KEY);
      const existing: Conversation[] = existingRaw ? JSON.parse(existingRaw) : [];
      const filtered = finalConv
        ? existing.filter((c) => c.id !== finalConv.id)
        : existing;
      const merged = finalConv ? [finalConv, ...filtered] : existing;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      if (finalConv) localStorage.setItem(STORAGE_ACTIVE, finalConv.id);
    } catch {
      // Silent fail on storage errors
    }
  };

  return {
    conversations,
    activeId,
    active,
    siblings,
    updateConversations,
    switchConversation,
    closeConversation,
    branchFromMessage,
    persistToStorage,
  };
}
