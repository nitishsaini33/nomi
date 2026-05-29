import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
}

interface ChatStore {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  /** Which friend's chat is currently open (null = none) */
  activeChatUserId: string | null;
  setActiveChatUserId: (id: string | null) => void;

  friends: User[];
  setFriends: (friends: User[]) => void;

  messages: Record<string, any[]>;
  addMessage: (userId: string, message: any) => void;
  /** Smart-merge: keeps in-flight WS messages not yet in the fetch response */
  setMessages: (userId: string, messages: any[]) => void;
  removeFriendData: (userId: string) => void;

  unreadCounts: Record<string, number>;
  incrementUnread: (userId: string) => void;
  clearUnread: (userId: string) => void;

  /** Epoch-ms timestamp of the last message per friend — drives sidebar sort order */
  lastMessageTimes: Record<string, number>;
  /** Bulk-set from /chat/previews on sidebar mount */
  setLastMessageTime: (userId: string, isoTimestamp: string) => void;

  onlineUsers: Record<string, boolean>;
  setOnlineUser: (userId: string, isOnline: boolean) => void;

  typingUsers: Record<string, boolean>;
  setTypingUser: (userId: string, isTyping: boolean) => void;

  updateMessage: (userId: string, messageId: string, updates: Partial<any>) => void;
  addReaction: (userId: string, messageId: string, reaction: any) => void;

  sidebarRefreshKey: number;
  triggerSidebarRefresh: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),

      activeChatUserId: null,
      setActiveChatUserId: (id) => set({ activeChatUserId: id }),

      friends: [],
      setFriends: (friends) => set({ friends }),

      messages: {},

      addMessage: (userId, message) =>
        set((state) => {
          const existing = state.messages[userId] || [];
          // Deduplicate by id
          if (message.id && existing.some((m: any) => m.id === message.id)) {
            return state;
          }
          
          // Normalize naive UTC timestamps from backend
          const safeTimestamp = message.timestamp.endsWith('Z') || message.timestamp.includes('+') 
            ? message.timestamp 
            : message.timestamp + 'Z';
          message.timestamp = safeTimestamp;

          // If this is a server-confirmed message, replace the matching optimistic one
          if (message.id && !message.id.startsWith('optimistic-')) {
            const optimisticIdx = existing.findIndex(
              (m: any) => m.id?.startsWith('optimistic-') && 
                          m.sender_id === message.sender_id && 
                          m.content === message.content
            );
            if (optimisticIdx >= 0) {
              const updated = [...existing];
              updated[optimisticIdx] = message;
              const msgTime = new Date(message.timestamp).getTime();
              return {
                messages: { ...state.messages, [userId]: updated },
                lastMessageTimes: {
                  ...state.lastMessageTimes,
                  [userId]: Math.max(state.lastMessageTimes[userId] || 0, msgTime),
                },
              };
            }
          }
          
          const msgTime = new Date(message.timestamp).getTime();
          return {
            messages: { ...state.messages, [userId]: [...existing, message] },
            // Bump last-message time if this message is newer
            lastMessageTimes: {
              ...state.lastMessageTimes,
              [userId]: Math.max(state.lastMessageTimes[userId] || 0, msgTime),
            },
          };
        }),

      setMessages: (userId, fetched) =>
        set((state) => {
          // Normalize timestamps
          const normalizedFetched = fetched.map((m: any) => ({
            ...m,
            timestamp: m.timestamp.endsWith('Z') || m.timestamp.includes('+') ? m.timestamp : m.timestamp + 'Z'
          }));

          // Keep any WS messages that arrived DURING the fetch (not yet in DB response)
          // Also keeps messages from localStorage that are older than the fetch window
          const existing = state.messages[userId] || [];
          const fetchedIds = new Set(normalizedFetched.map((m: any) => m.id));
          const wsOnly = existing.filter((m: any) => m.id && !fetchedIds.has(m.id));
          const merged = [...normalizedFetched, ...wsOnly].sort(
            (a: any, b: any) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          // Update last message time from the newest merged message
          const latest = merged[merged.length - 1];
          const latestTime = latest ? new Date(latest.timestamp).getTime() : 0;
          return {
            messages: { ...state.messages, [userId]: merged },
            lastMessageTimes: {
              ...state.lastMessageTimes,
              [userId]: Math.max(state.lastMessageTimes[userId] || 0, latestTime),
            },
          };
        }),
        
      removeFriendData: (userId) =>
        set((state) => {
          const newMessages = { ...state.messages };
          delete newMessages[userId];
          
          const newUnread = { ...state.unreadCounts };
          delete newUnread[userId];
          
          const newLastMessageTimes = { ...state.lastMessageTimes };
          delete newLastMessageTimes[userId];
          
          return {
            messages: newMessages,
            unreadCounts: newUnread,
            lastMessageTimes: newLastMessageTimes,
          };
        }),

      unreadCounts: {},
      incrementUnread: (userId) =>
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [userId]: (state.unreadCounts[userId] || 0) + 1,
          },
        })),
      clearUnread: (userId) =>
        set((state) => ({
          unreadCounts: { ...state.unreadCounts, [userId]: 0 },
        })),

      lastMessageTimes: {},
      setLastMessageTime: (userId, isoTimestamp) =>
        set((state) => {
          const safeTimestamp = isoTimestamp.endsWith('Z') || isoTimestamp.includes('+') 
            ? isoTimestamp 
            : isoTimestamp + 'Z';
          return {
            lastMessageTimes: {
              ...state.lastMessageTimes,
              [userId]: Math.max(
                state.lastMessageTimes[userId] || 0,
                new Date(safeTimestamp).getTime()
              ),
            },
          };
        }),

      onlineUsers: {},
      setOnlineUser: (userId, isOnline) =>
        set((state) => ({
          onlineUsers: { ...state.onlineUsers, [userId]: isOnline },
        })),

      typingUsers: {},
      setTypingUser: (userId, isTyping) =>
        set((state) => ({
          typingUsers: { ...state.typingUsers, [userId]: isTyping },
        })),

      updateMessage: (userId, messageId, updates) =>
        set((state) => {
          const existing = state.messages[userId];
          if (!existing) return state;
          return {
            messages: {
              ...state.messages,
              [userId]: existing.map((m: any) =>
                m.id === messageId ? { ...m, ...updates } : m
              ),
            },
          };
        }),

      addReaction: (userId, messageId, reaction) =>
        set((state) => {
          const existing = state.messages[userId];
          if (!existing) return state;
          return {
            messages: {
              ...state.messages,
              [userId]: existing.map((m: any) => {
                if (m.id === messageId) {
                  const reactions = m.reactions || [];
                  const index = reactions.findIndex((r: any) => r.user_id === reaction.user_id);
                  let newReactions;
                  if (index >= 0) {
                    newReactions = [...reactions];
                    newReactions[index] = reaction; // Update existing
                  } else {
                    newReactions = [...reactions, reaction]; // Add new
                  }
                  return { ...m, reactions: newReactions };
                }
                return m;
              }),
            },
          };
        }),
        
      sidebarRefreshKey: 0,
      triggerSidebarRefresh: () => set((state) => ({ sidebarRefreshKey: state.sidebarRefreshKey + 1 })),
    }),
    {
      name: 'chat-storage', // name of the item in the storage (must be unique)
      partialize: (state) => ({
        messages: state.messages,
        lastMessageTimes: state.lastMessageTimes,
        unreadCounts: state.unreadCounts,
        friends: state.friends,
      }),
    }
  )
);
