'use client'
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import { wsClient } from '@/lib/wsClient';
import { Send, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ChatWindow({
  otherUserId,
  currentUser,
}: {
  otherUserId: string;
  currentUser: any;
}) {
  const [otherUser, setOtherUser] = useState<any>(null);
  const { 
    messages, 
    setMessages, 
    clearUnread, 
    setActiveChatUserId, 
    onlineUsers, 
    typingUsers,
    addReaction,
    updateMessage
  } = useChatStore();
  
  const [input, setInput] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [openReactionMsgId, setOpenReactionMsgId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollHeightRef = useRef<number>(0);
  const initialScrollDoneRef = useRef<string | null>(null); // tracks which chat we've scrolled for
  const router = useRouter();

  const chatMessages = messages[otherUserId] || [];

  useEffect(() => {
    // Tell the store this conversation is now open → stops unread from incrementing
    setActiveChatUserId(otherUserId);
    // Clear existing unread badge for this friend
    clearUnread(otherUserId);

    fetchOtherUser();
    fetchMessages();

    return () => {
      // Chat closed — no longer an active chat
      setActiveChatUserId(null);
    };
  }, [otherUserId]);

  // Scroll handling: scroll to newest message on load/new message, or restore scroll on pagination
  useEffect(() => {
    if (scrollRef.current) {
      if (isLoadingMore) {
        // We just loaded older messages, restore scroll position
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight - lastScrollHeightRef.current;
        setIsLoadingMore(false); // Reset
      } else if (initialScrollDoneRef.current !== otherUserId) {
        // First open of this chat: always jump to the very bottom
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        initialScrollDoneRef.current = otherUserId;
      } else {
        // Already scrolled for this chat — only auto-scroll if user is near bottom
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
        if (isNearBottom) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }
    }
    
    // Send read receipts for any messages from otherUser that aren't READ
    const unreadMsgIds = chatMessages
      .filter((m: any) => m.sender_id === otherUserId && m.status !== 'READ')
      .map((m: any) => m.id)
      .filter(Boolean); // ensure they have IDs
      
    if (unreadMsgIds.length > 0) {
      wsClient.sendReadReceipt(otherUserId, unreadMsgIds);
    }
  }, [chatMessages, otherUserId]);

  const fetchOtherUser = async () => {
    try {
      const users = await api.get('/users/friends');
      const friend = users.find((u: any) => u.id === otherUserId);
      if (friend) setOtherUser(friend);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (cursor?: string) => {
    if (!cursor) setHasMore(true); // reset on initial load
    
    try {
      const url = `/chat/${otherUserId}?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const data = await api.get(url);
      
      if (data.length < 50) {
        setHasMore(false);
      }
      
      if (cursor) {
        // Prepend old messages. The store will dedup by ID.
        // Zustand store's `setMessages` currently just merges and sorts.
        // Actually, we'll let the store handle sorting.
        setMessages(otherUserId, data); 
      } else {
        setMessages(otherUserId, data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleScroll = () => {
    if (!scrollRef.current || isLoadingMore || !hasMore) return;
    
    // If scrolled to top
    if (scrollRef.current.scrollTop === 0) {
      if (chatMessages.length > 0) {
        setIsLoadingMore(true);
        lastScrollHeightRef.current = scrollRef.current.scrollHeight;
        const oldestMsg = chatMessages[0]; // because they are sorted chronologically
        fetchMessages(oldestMsg.timestamp);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    // Typing indicator logic
    wsClient.sendTyping(otherUserId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      wsClient.sendTyping(otherUserId, false);
    }, 2000);
  };

  // Send via the global singleton WebSocket (no own WS connection needed)
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    wsClient.sendTyping(otherUserId, false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    const content = input.trim();
    
    // Optimistic message — shows in the UI instantly before server confirms
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      sender_id: currentUser.id,
      receiver_id: otherUserId,
      content,
      timestamp: new Date().toISOString(),
      status: 'SENT',
      is_edited: false,
      is_deleted: false,
      reactions: [],
    };
    
    const { addMessage } = useChatStore.getState();
    addMessage(otherUserId, optimisticMsg);
    
    const sent = wsClient.sendMessage(otherUserId, content);
    if (sent) setInput('');
  };

  const deleteMessage = async (msgId: string) => {
    if (!confirm('Delete this message?')) return;
    
    // Optimistic update
    updateMessage(otherUserId, msgId, { 
      is_deleted: true, 
      content: 'This message was deleted' 
    });
    
    try {
      await api.delete(`/chat/message/${msgId}`);
    } catch (e) {
      console.error('Failed to delete', e);
      // Ideally revert the optimistic update here if needed
    }
  };

  const reactToMessage = async (msgId: string, emoji: string) => {
    setOpenReactionMsgId(null); // close picker immediately
    try {
      // Optimistic update locally
      addReaction(otherUserId, msgId, {
        id: 'temp-' + Date.now(),
        message_id: msgId,
        user_id: currentUser.id,
        emoji: emoji,
        timestamp: new Date().toISOString()
      });
      
      const data = await api.post(`/chat/message/${msgId}/react`, { emoji });
      // The real ID will be updated when the WS event comes back, or we just leave it.
      // But the endpoint also returns the reaction, so we can update it immediately.
      addReaction(otherUserId, msgId, data);
    } catch (e) {
      console.error('Failed to react', e);
    }
  };

  const handleUnfriend = async () => {
    if (!confirm(`Are you sure you want to unfriend ${otherUser.username}? This will delete all chat history for both of you.`)) return;
    
    try {
      await api.delete(`/users/friends/${otherUserId}`);
      // The store update and redirect is handled automatically by the user_unfriended WS event, 
      // but let's do it optimistically just in case
      router.push('/dashboard');
    } catch (e) {
      console.error('Failed to unfriend', e);
    }
  };

  if (!otherUser) {
    return (
      <div className="flex-1 flex items-center justify-center font-black text-lg sm:text-2xl uppercase p-8 animate-pulse">
        Loading chat...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3 border-b-4 border-text bg-background">
        <button
          onClick={() => router.push('/dashboard')}
          className="md:hidden p-2 bg-white border-2 border-text shadow-brutal hover:bg-primary transition-colors flex-shrink-0"
          aria-label="Back to contacts"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex flex-col flex-1 truncate">
          <div className="flex items-center gap-2">
            <div className="font-black text-base sm:text-xl md:text-2xl uppercase bg-text text-white px-2 sm:px-3 py-1 transform -rotate-1 truncate">
              {otherUser.username}
            </div>
            {onlineUsers[otherUserId] && (
              <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-text animate-pulse" title="Online" />
            )}
          </div>
        </div>
        
        <button
          onClick={handleUnfriend}
          className="bg-red-500 text-white font-black px-2 py-1 text-xs sm:text-sm border-2 border-text shadow-brutal hover:bg-red-600 transition-colors transform rotate-1"
          title="Unfriend and delete chat"
        >
          UNFRIEND
        </button>
      </div>

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNjY2MiIG9wYWNpdHk9IjAuNSIvPjwvc3ZnPg==')] bg-repeat"
      >
        {isLoadingMore && (
          <div className="text-center font-bold text-xs opacity-50 py-2">Loading older messages...</div>
        )}
        
        {chatMessages.map((msg: any, i: number) => {
          const isMe = msg.sender_id === currentUser.id;
          const msgAgeMs = Date.now() - new Date(msg.timestamp).getTime();
          const canDelete = isMe && !msg.is_deleted && msg.id && msgAgeMs < 5 * 60 * 1000; // 5 min window
          return (
            <div
              key={msg.id || i}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
            >
              <div
                className={[
                  'max-w-[80%] sm:max-w-[72%] px-3 py-2 font-bold border-2 border-text relative',
                  'shadow-brutal text-sm sm:text-base break-words',
                  isMe
                    ? 'bg-primary transform rotate-1'
                    : 'bg-white transform -rotate-1',
                  msg.is_deleted ? 'opacity-50 italic' : ''
                ].join(' ')}
              >
                {/* Action buttons (visible on hover) */}
                <div className="absolute -top-3 -right-3 flex gap-1 hidden group-hover:flex z-10">
                  {/* Reaction Button (for all msgs) */}
                  {!msg.is_deleted && msg.id && (
                    <div className="relative">
                      <button 
                        className="bg-yellow-300 text-text w-6 h-6 border-2 border-text font-black text-xs flex items-center justify-center hover:scale-110 transition-transform shadow-sm" 
                        title="React"
                        onClick={() => setOpenReactionMsgId(openReactionMsgId === msg.id ? null : msg.id)}
                      >
                        +
                      </button>
                      {openReactionMsgId === msg.id && (
                        <div className="absolute top-full right-0 mt-1 flex bg-white border-2 border-text shadow-brutal p-1 gap-1 flex-row z-20">
                          {['👍', '❤️', '😂', '😮', '😢'].map(emoji => (
                            <button key={emoji} onClick={() => reactToMessage(msg.id, emoji)} className="hover:scale-125 transition-transform">
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Delete button (only for my msgs within 5 minutes) */}
                  {canDelete && (
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="bg-red-500 text-white w-6 h-6 border-2 border-text font-black text-xs flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                      title="Delete Message (5 min window)"
                    >
                      X
                    </button>
                  )}
                </div>

                {msg.content}
                
                {/* Display Reactions */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {msg.reactions.map((r: any) => (
                      <span key={r.id} className="text-sm bg-white/50 px-1 border border-text/20 rounded-sm" title={r.user_id === currentUser.id ? 'You' : otherUser.username}>
                        {r.emoji}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-end gap-1 mt-1 border-t border-text/20 pt-1">
                  {msg.is_edited && !msg.is_deleted && (
                    <span className="text-[9px] sm:text-[10px] font-black opacity-50 mr-1">(edited)</span>
                  )}
                  <div className="text-[9px] sm:text-[10px] font-black opacity-60 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  {/* Read Receipts */}
                  {isMe && (
                    <div className="text-[10px] font-black">
                      {msg.status === 'READ' ? <span className="text-blue-600">✓✓</span> : 
                       msg.status === 'DELIVERED' ? <span>✓✓</span> : 
                       <span className="opacity-60">✓</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {chatMessages.length === 0 && (
          <div className="text-center font-bold mt-8 sm:mt-10 p-4 sm:p-6 brutal-box bg-white mx-auto max-w-xs sm:max-w-sm text-sm sm:text-base transform rotate-2">
            NO MESSAGES YET.
            <br />
            START SHOUTING!
          </div>
        )}
        
        {/* ── Typing Indicator Bubble ── */}
        {typingUsers[otherUserId] && (
          <div className="flex justify-start">
            <div className="px-4 py-2 font-black border-2 border-text shadow-brutal text-sm bg-accent transform -rotate-1 flex items-center gap-1">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <form
        onSubmit={sendMessage}
        className="flex-shrink-0 flex gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-t-4 border-text bg-background"
      >
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="TYPE SOMETHING LOUD..."
          className="brutal-input flex-1 font-bold text-sm sm:text-base py-2 sm:py-3"
          autoComplete="off"
        />
        <button
          type="submit"
          className="brutal-btn p-2 sm:p-3 bg-primary flex-shrink-0"
          aria-label="Send message"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
