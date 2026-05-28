'use client'
import { useEffect } from 'react';
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

    const socket = new WebSocket(`ws://localhost:8000/ws?token=${token}`);
    wsClient.socket = socket;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Support old raw messages and new event-based messages
      const eventType = data.type || 'chat_message';
      const msg = data.payload || data;

      // Read latest store state inside handler to avoid stale closure
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
        // msg.message_ids, msg.reader_id
        const otherUserId = msg.reader_id;
        msg.message_ids.forEach((id: string) => {
          updateMessage(otherUserId, id, { status: 'READ' });
        });
      } else if (eventType === 'message_reaction') {
        // msg is the ReactionResponse object
        // we need to know the other user ID
        // msg payload has message_id, user_id, emoji, timestamp.
        // Wait, the message_reaction event comes TO us, but we don't know who the original message belongs to from just the reaction.
        // Actually, if we are the receiver of the event, the reaction happened in a chat between us and msg.user_id (the reactor) OR we reacted and this is our own broadcast (wait, broadcast goes to the other user).
        // If the other user reacted, `msg.user_id` is the other user. 
        // If WE reacted, the backend doesn't send us a WS event (the API returns it), but if it does, `msg.user_id` is us.
        // Let's iterate through messages if we have to, or just find it.
        // A simple way is to check if `msg.user_id` is in our messages store keys.
        const otherUserId = msg.user_id === currentUser?.id ? activeChatUserId : msg.user_id;
        if (otherUserId) {
          addReaction(otherUserId, msg.message_id, msg);
        }
      } else if (eventType === 'user_unfriended') {
        const friendId = msg.friend_id;
        removeFriendData(friendId);
        triggerSidebarRefresh();
        
        // If we are currently chatting with this user, redirect to dashboard
        if (activeChatUserId === friendId) {
          router.push('/dashboard');
        }
      }
    };

    socket.onerror = () => console.warn('WebSocket connection error');

    return () => {
      socket.close();
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
    <div className="h-dvh flex bg-background overflow-hidden md:p-4 md:gap-4">
      {/* Decorative blob – desktop only */}
      <div className="hidden md:block absolute top-0 right-0 w-64 h-64 bg-primary opacity-10 transform rotate-45 pointer-events-none rounded-full" />

      {/* Sidebar panel */}
      <div
        className={[
          'w-full md:w-72 lg:w-80 h-full flex-shrink-0 z-10',
          isInChat ? 'hidden md:block' : 'block',
        ].join(' ')}
      >
        <Sidebar user={user} />
      </div>

      {/* Chat / content panel */}
      <div
        className={[
          'flex-1 h-full overflow-hidden flex flex-col brutal-box bg-white z-10',
          isInChat ? 'flex' : 'hidden md:flex',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  );
}
