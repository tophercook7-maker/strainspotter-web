'use client';

import { createContext, useContext } from 'react';

type ChatUser = {
  id: string;
  email: string;
  displayName: string;
};

const ChatUserContext = createContext<ChatUser | null>(null);

export function ChatUserProvider({ user, children }: { user: ChatUser; children: React.ReactNode }) {
  return <ChatUserContext.Provider value={user}>{children}</ChatUserContext.Provider>;
}

export function useChatUser() {
  const ctx = useContext(ChatUserContext);
  return ctx;
}

