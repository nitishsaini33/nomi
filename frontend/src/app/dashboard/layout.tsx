'use client'
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useChatStore } from '@/store/chatStore';
import { wsClient } from '@/lib/wsClient';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // On mobile: sidebar and chat panel toggle by route
  const isInChat = pathname?.startsWith('/dashboard/chat/') ?? false;

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  /**
   * Global WebSocket — one connection for the entire dashboard session.
   * Handles ALL incoming messages:
   *   • Adds to message store (dedup-safe)
   *   • Increments unread count if the chat is NOT currently open
   */
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    let reconnectTimer: NodeJS.Timeout | null = null;
    let socket: WebSocket;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
      socket = new WebSocket(`${wsBaseUrl}/ws?token=${token}`);
      wsClient.socket = socket;

      // On connect: clear all online dots — backend will re-send fresh status immediately
      socket.onopen = () => {
        const { setOnlineUser } = useChatStore.getState();
        // Reset all known friends to offline; backend will fire user_status:online for each online user
        const { friends } = useChatStore.getState();
        friends.forEach((f: any) => setOnlineUser(f.id, false));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        const eventType = data.type || 'chat_message';
        const msg = data.payload || data;

        const { 
          currentUser, 
          activeChatUserId, 
          addMessage, 
          incrementUnread,
          setOnlineUser,
          setTypingUser,
          updateMessage,
          addReaction,
          removeFriendData,
          triggerSidebarRefresh
        } = useChatStore.getState();

        if (eventType === 'chat_message') {
          const otherUserId = msg.sender_id === currentUser?.id ? msg.receiver_id : msg.sender_id;
          addMessage(otherUserId, msg);
          if (msg.sender_id !== currentUser?.id && activeChatUserId !== msg.sender_id) {
            incrementUnread(msg.sender_id);
          }
        } else if (eventType === 'user_status') {
          setOnlineUser(msg.user_id, msg.status === 'online');
        } else if (eventType === 'typing') {
          setTypingUser(msg.user_id, msg.is_typing);
        } else if (eventType === 'message_edit' || eventType === 'message_delete') {
          const otherUserId = msg.receiver_id === currentUser?.id ? msg.sender_id : msg.receiver_id;
          updateMessage(otherUserId, msg.message_id, msg);
        } else if (eventType === 'messages_read') {
          const otherUserId = msg.reader_id;
          msg.message_ids.forEach((id: string) => {
            updateMessage(otherUserId, id, { status: 'READ' });
          });
        } else if (eventType === 'message_reaction') {
          const otherUserId = msg.user_id === currentUser?.id ? activeChatUserId : msg.user_id;
          if (otherUserId) addReaction(otherUserId, msg.message_id, msg);
        } else if (eventType === 'user_unfriended' || eventType === 'user_deleted') {
          // If a friend unfriends us, OR if any user globally deletes their account, scrub them
          const friendId = eventType === 'user_deleted' ? msg.user_id : msg.friend_id;
          removeFriendData(friendId);
          triggerSidebarRefresh();
          if (activeChatUserId === friendId) router.push('/dashboard');
        } else if (eventType === 'friend_request_accepted') {
          // Our request was accepted by someone else, fetch friends immediately
          triggerSidebarRefresh();
        }
      };

      socket.onerror = () => console.warn('WebSocket error');

      socket.onclose = () => {
        wsClient.socket = null;
        // Auto-reconnect after 3 seconds if not intentionally destroyed
        if (!destroyed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) socket.close();
      wsClient.socket = null;
    };
  }, [user?.id]); // reconnect only if the logged-in user changes

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center font-black text-2xl sm:text-4xl uppercase animate-pulse">
        Loading...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-[100dvh] flex w-full overflow-hidden md:p-4 md:gap-6 relative text-text bg-background">
      {/* Sidebar panel */}
      <div
        className={[
          'w-full md:w-[320px] lg:w-[360px] h-full flex-shrink-0 z-10 md:rounded-3xl overflow-hidden clay-panel flex flex-col',
          isInChat ? 'hidden md:flex' : 'flex',
        ].join(' ')}
      >
        <Sidebar user={user} />
      </div>

      {/* Chat / content panel */}
      <div
        className={[
          'flex-1 h-full overflow-hidden flex flex-col z-10 md:rounded-3xl clay-panel relative',
          isInChat ? 'flex' : 'hidden md:flex',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  );
}
