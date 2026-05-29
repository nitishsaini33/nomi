'use client'
import { useState, useEffect, useRef, useCallback } from 'react';
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

  // Scroll refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollHeightRef = useRef<number>(0);
  const isRestoringScrollRef = useRef(false); // true while loading older msgs
  const hasScrolledToBottomRef = useRef(false); // has initial scroll fired for current chat
  const router = useRouter();

  const chatMessages = messages[otherUserId] || [];

  // ── Reset everything when switching chats ────────────────────────────────
  useEffect(() => {
    setActiveChatUserId(otherUserId);
    clearUnread(otherUserId);
    setOtherUser(null);
    hasScrolledToBottomRef.current = false; // reset so we scroll fresh

    fetchOtherUser();
    fetchMessages();

    return () => {
      setActiveChatUserId(null);
    };
  }, [otherUserId]);

  // ── scrollToBottom helper ────────────────────────────────────────────────
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'instant') => {
    // Use setTimeout(0) to push past React's render cycle AND the browser's
    // layout recalculation, guaranteeing scrollHeight is final.
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 0);
  }, []);

  // ── Main scroll effect ───────────────────────────────────────────────────
  useEffect(() => {
    if (chatMessages.length === 0) return;

    // Case 1: We just loaded older messages — restore scroll position, don't jump
    if (isRestoringScrollRef.current) {
      if (scrollRef.current) {
        scrollRef.current.scrollTop =
          scrollRef.current.scrollHeight - lastScrollHeightRef.current;
      }
      isRestoringScrollRef.current = false;
      return;
    }

    // Case 2: Initial open — always jump to bottom (once per chat switch)
    if (!hasScrolledToBottomRef.current) {
      if (scrollRef.current) {
        // Container is mounted — scroll and mark as done
        scrollToBottom('instant');
        hasScrolledToBottomRef.current = true;
      }
      // If container isn't mounted yet (loading screen showing), do NOT mark as done.
      // The otherUser useEffect below will fire the scroll once the real UI mounts.
      return;
    }

    // Case 3: New message arrived — only auto-scroll if user is near bottom
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      if (distanceFromBottom < 150) {
        scrollToBottom('smooth');
      }
    }
  }, [chatMessages.length, otherUserId]);

  // Also scroll when otherUser first loads (component transitions from loading → real UI)
  useEffect(() => {
    if (otherUser && !hasScrolledToBottomRef.current && chatMessages.length > 0) {
      scrollToBottom('instant');
      hasScrolledToBottomRef.current = true;
    }
  }, [otherUser]);

  // Send read receipts
  useEffect(() => {
    const unreadMsgIds = chatMessages
      .filter((m: any) => m.sender_id === otherUserId && m.status !== 'READ')
      .map((m: any) => m.id)
      .filter(Boolean);
    if (unreadMsgIds.length > 0) {
      wsClient.sendReadReceipt(otherUserId, unreadMsgIds);
    }
  }, [chatMessages, otherUserId]);

  // ── Data fetching ────────────────────────────────────────────────────────
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
    if (!cursor) setHasMore(true);
    try {
      const url = `/chat/${otherUserId}?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const data = await api.get(url);
      if (data.length < 50) setHasMore(false);
      setMessages(otherUserId, data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleScroll = () => {
    if (!scrollRef.current || isLoadingMore || !hasMore) return;
    if (scrollRef.current.scrollTop === 0 && chatMessages.length > 0) {
      isRestoringScrollRef.current = true;
      setIsLoadingMore(true);
      lastScrollHeightRef.current = scrollRef.current.scrollHeight;
      const oldestMsg = chatMessages[0];
      fetchMessages(oldestMsg.timestamp);
    }
  };

  // ── Input / send ─────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    wsClient.sendTyping(otherUserId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => wsClient.sendTyping(otherUserId, false), 2000);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    wsClient.sendTyping(otherUserId, false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    const content = input.trim();
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
    updateMessage(otherUserId, msgId, { is_deleted: true, content: 'This message was deleted' });
    try {
      await api.delete(`/chat/message/${msgId}`);
    } catch (e) {
      console.error('Failed to delete', e);
    }
  };

  const reactToMessage = async (msgId: string, emoji: string) => {
    setOpenReactionMsgId(null);
    try {
      addReaction(otherUserId, msgId, {
        id: 'temp-' + Date.now(),
        message_id: msgId,
        user_id: currentUser.id,
        emoji,
        timestamp: new Date().toISOString()
      });
      const data = await api.post(`/chat/message/${msgId}/react`, { emoji });
      addReaction(otherUserId, msgId, data);
    } catch (e) {
      console.error('Failed to react', e);
    }
  };

  const handleUnfriend = async () => {
    if (!confirm(`Are you sure you want to unfriend ${otherUser.username}? This will delete all chat history for both of you.`)) return;
    try {
      await api.delete(`/users/friends/${otherUserId}`);
      router.push('/dashboard');
    } catch (e) {
      console.error('Failed to unfriend', e);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
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
        style={{ overflowAnchor: 'none' }}
      >
        {isLoadingMore && (
          <div className="text-center font-bold text-xs opacity-50 py-2">Loading older messages...</div>
        )}
        
        {chatMessages.map((msg: any, i: number) => {
          const isMe = msg.sender_id === currentUser.id;
          const msgAgeMs = Date.now() - new Date(msg.timestamp).getTime();
          const canDelete = isMe && !msg.is_deleted && msg.id && msgAgeMs < 5 * 60 * 1000;
          return (
            <div
              key={msg.id || i}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
            >
              <div
                className={[
                  'max-w-[80%] sm:max-w-[72%] px-3 py-2 font-bold border-2 border-text relative',
                  'shadow-brutal text-sm sm:text-base break-words',
                  isMe ? 'bg-primary transform rotate-1' : 'bg-white transform -rotate-1',
                  msg.is_deleted ? 'opacity-50 italic' : ''
                ].join(' ')}
              >
                {/* Action buttons (visible on hover) */}
                <div className="absolute -top-3 -right-3 flex gap-1 hidden group-hover:flex z-10">
                  {/* Reaction Button */}
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
                  
                  {/* Delete button (only within 5 minutes) */}
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
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
        
        {/* ── Typing Indicator ── */}
        {typingUsers[otherUserId] && (
          <div className="flex justify-start">
            <div className="px-4 py-2 font-black border-2 border-text shadow-brutal text-sm bg-accent transform -rotate-1 flex items-center gap-1">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
            </div>
          </div>
        )}

        {/* Invisible scroll anchor at the very bottom */}
        <div ref={bottomRef} style={{ height: 1 }} />
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
