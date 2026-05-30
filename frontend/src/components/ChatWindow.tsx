'use client'
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { api } from '@/lib/api';
import { useChatStore, nextOptimisticId } from '@/store/chatStore';
import { wsClient } from '@/lib/wsClient';
import { Send, ArrowLeft, MoreVertical, Smile } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const _timeCache = new Map<string, string>();
function formatTime(timestamp: string): string {
  let cached = _timeCache.get(timestamp);
  if (!cached) {
    cached = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    _timeCache.set(timestamp, cached);
    if (_timeCache.size > 2000) {
      const first = _timeCache.keys().next().value;
      if (first) _timeCache.delete(first);
    }
  }
  return cached;
}

const MessageBubble = memo(function MessageBubble({
  msg,
  isMe,
  canDelete,
  currentUserId,
  otherUsername,
  openReactionMsgId,
  setOpenReactionMsgId,
  deleteMessage,
  reactToMessage,
}: {
  msg: any;
  isMe: boolean;
  canDelete: boolean;
  currentUserId: string;
  otherUsername: string;
  openReactionMsgId: string | null;
  setOpenReactionMsgId: (id: string | null) => void;
  deleteMessage: (id: string) => void;
  reactToMessage: (msgId: string, emoji: string) => void;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-4 relative`}
    >
      <div
        className={[
          'max-w-[80%] sm:max-w-[70%] px-4 py-3 relative',
          'text-sm sm:text-base break-words',
          isMe 
            ? 'msg-bubble-me rounded-2xl rounded-tr-sm' 
            : 'msg-bubble-other rounded-2xl rounded-tl-sm',
          msg.is_deleted ? 'opacity-50 italic' : ''
        ].join(' ')}
      >
        {/* Action buttons (visible on hover) */}
        <div className={`absolute -top-3 ${isMe ? '-left-8' : '-right-8'} hidden group-hover:flex gap-1 z-10`}>
          {!msg.is_deleted && msg.id && (
            <div className="relative">
              <button 
                className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all shadow-lg" 
                title="React"
                onClick={() => setOpenReactionMsgId(openReactionMsgId === msg.id ? null : msg.id)}
              >
                <Smile size={14} />
              </button>
              <AnimatePresence>
                {openReactionMsgId === msg.id && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={`absolute bottom-full mb-2 ${isMe ? 'left-0' : 'right-0'} flex bg-black/40 backdrop-blur-xl border border-white/10 rounded-full p-1.5 gap-1 shadow-xl z-20`}
                  >
                    {['👍', '❤️', '😂', '😮', '😢'].map(emoji => (
                      <button 
                        key={emoji} 
                        onClick={() => reactToMessage(msg.id, emoji)} 
                        className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-all text-lg hover:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          
          {canDelete && (
            <button
              onClick={() => deleteMessage(msg.id)}
              className="w-7 h-7 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-200 flex items-center justify-center hover:bg-red-500/40 transition-all shadow-lg text-xs font-bold"
              title="Delete Message"
            >
              ×
            </button>
          )}
        </div>

        <div className="leading-relaxed">{msg.content}</div>
        
        {/* Display Reactions */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {msg.reactions.map((r: any) => (
              <span 
                key={r.id} 
                className="text-xs bg-black/20 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-sm shadow-sm" 
                title={r.user_id === currentUserId ? 'You' : otherUsername}
              >
                {r.emoji}
              </span>
            ))}
          </div>
        )}
        
        <div className={`flex items-center gap-1.5 mt-1.5 ${isMe ? 'justify-end text-white/70' : 'justify-start text-white/50'}`}>
          {msg.is_edited && !msg.is_deleted && (
            <span className="text-[9px] font-medium">(edited)</span>
          )}
          <div className="text-[10px] font-medium">
            {formatTime(msg.timestamp)}
          </div>
          {isMe && (
            <div className="text-[10px] flex items-center ml-0.5">
              {msg.status === 'READ' ? <span className="text-cyan-300">✓✓</span> : 
               msg.status === 'DELIVERED' ? <span>✓✓</span> : 
               <span className="opacity-60">✓</span>}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});


export default function ChatWindow({
  otherUserId,
  currentUser,
}: {
  otherUserId: string;
  currentUser: any;
}) {
  const { 
    messages, 
    setMessages, 
    clearUnread, 
    setActiveChatUserId, 
    onlineUsers, 
    typingUsers,
    addReaction,
    updateMessage,
    friends,
    removeFriendData,
  } = useChatStore();
  
  const [input, setInput] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [openReactionMsgId, setOpenReactionMsgId] = useState<string | null>(null);

  const otherUser = useMemo(
    () => friends.find((f: any) => f.id === otherUserId) || null,
    [friends, otherUserId]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollHeightRef = useRef<number>(0);
  const isRestoringScrollRef = useRef(false);
  const hasScrolledToBottomRef = useRef(false);
  const prevUnreadIdsRef = useRef<Set<string>>(new Set());
  const router = useRouter();

  const chatMessages = messages[otherUserId] || [];

  useEffect(() => {
    setActiveChatUserId(otherUserId);
    clearUnread(otherUserId);
    hasScrolledToBottomRef.current = false;
    prevUnreadIdsRef.current = new Set();
    fetchMessages();
    return () => setActiveChatUserId(null);
  }, [otherUserId]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'instant') => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 0);
  }, []);

  useEffect(() => {
    if (chatMessages.length === 0) return;
    if (isRestoringScrollRef.current) {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight - lastScrollHeightRef.current;
      }
      isRestoringScrollRef.current = false;
      return;
    }
    if (!hasScrolledToBottomRef.current) {
      if (scrollRef.current) {
        scrollToBottom('instant');
        hasScrolledToBottomRef.current = true;
      }
      return;
    }
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      if (distanceFromBottom < 150) {
        scrollToBottom('smooth');
      }
    }
  }, [chatMessages.length, otherUserId]);

  useEffect(() => {
    if (otherUser && !hasScrolledToBottomRef.current && chatMessages.length > 0) {
      scrollToBottom('instant');
      hasScrolledToBottomRef.current = true;
    }
  }, [otherUser]);

  useEffect(() => {
    const unreadMsgIds = chatMessages
      .filter((m: any) => m.sender_id === otherUserId && m.status !== 'READ')
      .map((m: any) => m.id)
      .filter(Boolean);
    
    const newUnread = unreadMsgIds.filter((id: string) => !prevUnreadIdsRef.current.has(id));
    if (newUnread.length > 0) {
      wsClient.sendReadReceipt(otherUserId, newUnread);
      newUnread.forEach((id: string) => prevUnreadIdsRef.current.add(id));
    }
  }, [chatMessages, otherUserId]);

  const fetchMessages = async (cursor?: string) => {
    if (!cursor) setHasMore(true);
    try {
      const url = `/chat/${otherUserId}?limit=50${cursor ? \`&cursor=\${encodeURIComponent(cursor)}\` : ''}`;
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
      id: nextOptimisticId(),
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

  const deleteMessage = useCallback(async (msgId: string) => {
    if (!confirm('Delete this message?')) return;
    updateMessage(otherUserId, msgId, { is_deleted: true, content: 'This message was deleted' });
    try {
      await api.delete(`/chat/message/${msgId}`);
    } catch (e) {
      console.error('Failed to delete', e);
    }
  }, [otherUserId, updateMessage]);

  const reactToMessage = useCallback(async (msgId: string, emoji: string) => {
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
  }, [otherUserId, currentUser.id, addReaction]);

  const handleUnfriend = useCallback(async () => {
    if (!otherUser) return;
    if (!confirm(`Are you sure you want to unfriend ${otherUser.username}? This will delete all chat history.`)) return;
    try {
      await api.delete(`/users/friends/${otherUserId}`);
      removeFriendData(otherUserId);
      router.push('/dashboard');
    } catch (e) {
      console.error('Failed to unfriend', e);
    }
  }, [otherUserId, otherUser, router, removeFriendData]);

  if (!otherUser) {
    return (
      <div className="flex-1 flex items-center justify-center font-bold text-gray-400 p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <span>Connecting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-transparent text-white relative">
      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/5 bg-white/5 backdrop-blur-md z-10 shadow-sm">
        <button
          onClick={() => router.push('/dashboard')}
          className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex-shrink-0 border border-white/10"
        >
          <ArrowLeft size={18} />
        </button>
        
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg">
            {otherUser.username.charAt(0).toUpperCase()}
          </div>
          {onlineUsers[otherUserId] && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-cyan-400 rounded-full border-2 border-[#0B0F19] shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
          )}
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="font-semibold text-base sm:text-lg text-white truncate">
            {otherUser.username}
          </div>
          <div className="text-xs text-gray-400">
            {onlineUsers[otherUserId] ? (
              <span className="text-cyan-400 font-medium">Online</span>
            ) : (
              <span>Offline</span>
            )}
          </div>
        </div>
        
        <button
          onClick={handleUnfriend}
          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all flex-shrink-0"
          title="Unfriend User"
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar relative z-0"
      >
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <div className="bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs text-gray-400">
              Loading history...
            </div>
          </div>
        )}
        
        {chatMessages.map((msg: any, i: number) => {
          const isMe = msg.sender_id === currentUser.id;
          const msgAgeMs = Date.now() - new Date(msg.timestamp).getTime();
          const canDelete = isMe && !msg.is_deleted && msg.id && msgAgeMs < 5 * 60 * 1000;
          return (
            <MessageBubble
              key={msg.id || i}
              msg={msg}
              isMe={isMe}
              canDelete={canDelete}
              currentUserId={currentUser.id}
              otherUsername={otherUser.username}
              openReactionMsgId={openReactionMsgId}
              setOpenReactionMsgId={setOpenReactionMsgId}
              deleteMessage={deleteMessage}
              reactToMessage={reactToMessage}
            />
          );
        })}

        {chatMessages.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full text-center p-6 mt-10"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
              <Smile size={24} className="text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Say Hello!</h3>
            <p className="text-sm text-gray-400">Send the first message to start the conversation.</p>
          </motion.div>
        )}
        
        {/* ── Typing Indicator ── */}
        <AnimatePresence>
          {typingUsers[otherUserId] && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex justify-start mb-4"
            >
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* ── Input Area ── */}
      <div className="flex-shrink-0 p-4 sm:p-6 bg-gradient-to-t from-[#0B0F19] to-transparent z-10">
        <form
          onSubmit={sendMessage}
          className="flex gap-2 sm:gap-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
        >
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-white px-4 py-2 text-sm sm:text-base outline-none placeholder-gray-500"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-3 bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/10 disabled:text-gray-500 text-white rounded-xl transition-all shadow-md flex-shrink-0"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
