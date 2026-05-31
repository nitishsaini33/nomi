'use client'
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { api } from '@/lib/api';
import { useChatStore, nextOptimisticId } from '@/store/chatStore';
import { wsClient } from '@/lib/wsClient';
import { Send, ArrowLeft, UserMinus, Smile } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import ConfirmModal from './ConfirmModal';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

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
  const [showActions, setShowActions] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const startPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      setShowActions(true);
    }, 500);
  };

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  useEffect(() => {
    if (showActions) {
      const hide = () => setShowActions(false);
      window.addEventListener('click', hide);
      window.addEventListener('scroll', hide, { capture: true, passive: true });
      return () => {
        window.removeEventListener('click', hide);
        window.removeEventListener('scroll', hide, { capture: true });
      };
    }
  }, [showActions]);

  return (
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-6 relative`}
      >
        <div
          onMouseDown={startPress}
          onMouseUp={cancelPress}
          onMouseLeave={cancelPress}
          onTouchStart={startPress}
          onTouchEnd={cancelPress}
          onTouchMove={cancelPress}
          className={[
            'max-w-[85%] sm:max-w-[75%] px-3 pt-2 pb-1.5 relative min-w-[70px]',
            'shadow-sm',
            isMe 
              ? 'msg-bubble-me rounded-2xl rounded-tr-[4px]' 
              : 'msg-bubble-other rounded-2xl rounded-tl-[4px]',
            msg.is_deleted ? 'opacity-50 italic' : ''
          ].join(' ')}
        >
          {/* Action buttons (visible on hover desktop, or long press mobile) */}
          <div 
            className={`absolute -top-3 ${isMe ? '-left-8' : '-right-8'} ${showActions ? 'flex' : 'hidden md:group-hover:flex'} gap-1 z-10`}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
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
                      className={`absolute bottom-full mb-2 ${isMe ? 'right-0' : 'left-0'} flex bg-black/40 backdrop-blur-xl border border-white/10 rounded-full p-1.5 gap-1 shadow-xl z-20`}
                    >
                      {['👍', '❤️', '😂', '😮', '😢'].map(emoji => (
                        <button 
                          key={emoji} 
                          onClick={() => {
                            reactToMessage(msg.id, emoji);
                            setShowActions(false);
                          }} 
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
                onClick={() => {
                  deleteMessage(msg.id);
                  setShowActions(false);
                }}
                className="w-7 h-7 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-200 flex items-center justify-center hover:bg-red-500/40 transition-all shadow-lg text-xs font-bold"
                title="Delete Message"
              >
                ×
              </button>
            )}
          </div>

          <div className="relative">
            <div className="text-[15px] leading-snug whitespace-pre-wrap break-words">
              {msg.content}
              {/* Spacer for time to ensure it never overlaps text */}
              <span className={`inline-block h-1 ${
                msg.is_edited && !msg.is_deleted 
                  ? (isMe ? 'w-[6.5rem]' : 'w-[5.5rem]') 
                  : (isMe ? 'w-[4.5rem]' : 'w-[3.5rem]')
              }`} />
            </div>

            <div className={`absolute bottom-[-2px] right-0 flex items-center gap-1 text-[10px] ${isMe ? 'text-white/80' : 'text-white/50'}`}>
              {msg.is_edited && !msg.is_deleted && (
                <span className="text-[9px] font-medium mr-0.5">(edited)</span>
              )}
              <span className="leading-none">{formatTime(msg.timestamp)}</span>
              {isMe && (
                <span className="flex items-center ml-0.5 leading-none">
                  {msg.status === 'READ' ? <span className="text-cyan-300">✓✓</span> : 
                   msg.status === 'DELIVERED' ? <span>✓✓</span> : 
                   <span className="opacity-60">✓</span>}
                </span>
              )}
            </div>
          </div>
          
          {/* Display Reactions */}
          {!msg.is_deleted && msg.reactions && msg.reactions.length > 0 && (
            <div className={`absolute -bottom-4 ${isMe ? 'right-1' : 'right-1'} flex items-center gap-0.5 z-10 clay-panel-sm px-2 py-1`}>
              {msg.reactions.map((r: any) => (
                <span 
                  key={r.id} 
                  className="text-[15px] leading-none" 
                  title={r.user_id === currentUserId ? 'You' : otherUsername}
                >
                  {r.emoji}
                </span>
              ))}
            </div>
          )}
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<any>(null);

  const otherUser = useMemo(
    () => friends.find((f: any) => f.id === otherUserId) || null,
    [friends, otherUserId]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    wsClient.sendTyping(otherUserId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => wsClient.sendTyping(otherUserId, false), 2000);
  };

  const sendMessage = (e: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
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
    if (sent) {
      inputRef.current?.focus();
      setInput('');
      setShowEmojiPicker(false);
    }
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
      const msg = messages[otherUserId]?.find((m: any) => m.id === msgId);
      const existingReaction = msg?.reactions?.find((r: any) => r.user_id === currentUser.id);
      
      const isTogglingOff = existingReaction && existingReaction.emoji === emoji;
      const optimisticEmoji = isTogglingOff ? "" : emoji;

      addReaction(otherUserId, msgId, {
        id: existingReaction?.id || ('temp-' + Date.now()),
        message_id: msgId,
        user_id: currentUser.id,
        emoji: optimisticEmoji,
        timestamp: new Date().toISOString()
      });
      const data = await api.post(`/chat/message/${msgId}/react`, { emoji });
      addReaction(otherUserId, msgId, data);
    } catch (e) {
      console.error('Failed to react', e);
    }
  }, [otherUserId, currentUser.id, addReaction, messages]);

  const handleUnfriend = useCallback(() => {
    if (!otherUser) return;
    setConfirmModalConfig({
      title: 'Unfriend',
      message: `Are you sure you want to unfriend ${otherUser.username}? This will permanently delete all chat history between you.`,
      confirmText: 'Unfriend',
      icon: 'unfriend',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModalConfig(null);
        try {
          await api.delete(`/users/friends/${otherUserId}`);
          removeFriendData(otherUserId);
          router.push('/dashboard');
        } catch (e) {
          console.error('Failed to unfriend', e);
        }
      },
      onCancel: () => setConfirmModalConfig(null)
    });
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
    <div className="flex flex-col h-full w-full overflow-hidden bg-transparent text-text relative">
      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center px-2 sm:px-4 py-2 sm:py-3 border-b border-black/5 dark:border-white/5 z-10 bg-surface">
        <div className="flex items-center flex-1 min-w-0 gap-2 cursor-pointer">
          <button
            onClick={() => router.push('/dashboard')}
            className="md:hidden p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex-shrink-0 text-text-muted"
          >
            <ArrowLeft size={22} />
          </button>
          
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-white shadow-[var(--clay-shadow-sm)]">
              {otherUser.username.charAt(0).toUpperCase()}
            </div>
            {onlineUsers[otherUserId] && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-[3px] border-surface" />
            )}
          </div>

          <div className="flex flex-col flex-1 min-w-0 ml-1">
            <div className="font-bold text-base text-text truncate">
              {otherUser.username}
            </div>
            <div className="text-xs text-text-muted">
              {onlineUsers[otherUserId] ? (
                <span className="text-primary font-bold">Online</span>
              ) : (
                <span>Offline</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 text-gray-300">
          <button
            onClick={handleUnfriend}
            className="p-2 rounded-full hover:bg-red-500/20 text-gray-300 hover:text-red-400 transition-all"
            title="Unfriend User"
          >
            <UserMinus size={22} />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar relative z-0 touch-pan-y"
      >
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <div className="clay-panel-sm px-4 py-1 text-xs font-bold text-text-muted">
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
            <div className="w-16 h-16 rounded-full clay-panel-sm flex items-center justify-center mb-4 text-primary">
              <Smile size={28} />
            </div>
            <h3 className="text-lg font-bold text-text mb-1">Say Hello!</h3>
            <p className="text-sm font-medium text-text-muted">Send the first message to start the conversation.</p>
          </motion.div>
        )}
        
        <AnimatePresence>
          {typingUsers[otherUserId] && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex justify-start mb-4"
            >
              <div className="clay-panel-sm rounded-tl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* ── Input Area ── */}
      <div className="flex-shrink-0 px-2 py-2 sm:px-4 sm:py-4 bg-gradient-to-t from-background to-transparent z-10 relative">
        {/* Emoji Picker Popup */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-2 sm:left-4 mb-2 z-50 shadow-2xl"
            >
              <EmojiPicker 
                onEmojiClick={(emojiData: any) => setInput(prev => prev + emojiData.emoji)}
                // @ts-ignore
                theme="dark"
                previewConfig={{ showPreview: false }}
                skinTonesDisabled
                height={320}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <form
          onSubmit={sendMessage}
          className="flex items-end gap-2"
        >
          {/* Input Pill */}
          <div className="flex-1 flex items-center gap-1 sm:gap-2 clay-panel-sm rounded-[1.25rem] px-2 sm:px-3 py-1 min-h-[48px]">
            <button 
              type="button" 
              onClick={() => setShowEmojiPicker(prev => !prev)}
              className={`p-1.5 transition-colors flex-shrink-0 ${showEmojiPicker ? 'text-primary' : 'text-text-muted hover:text-primary'}`}
            >
              <Smile size={24} />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onFocus={() => setShowEmojiPicker(false)}
              placeholder="Message"
              className="flex-1 bg-transparent text-text px-1 py-2 text-[15px] sm:text-base outline-none placeholder-text-muted w-full font-medium"
              autoComplete="off"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim()}
            onMouseDown={(e) => {
              e.preventDefault(); // Prevents focus loss on desktop
            }}
            className={`w-12 h-12 rounded-[1rem] flex items-center justify-center flex-shrink-0 transition-all ${
              input.trim() 
                ? 'clay-button-primary' 
                : 'clay-button !p-0 opacity-60'
            }`}
            aria-label="Send message"
          >
            <Send size={20} className={input.trim() ? "translate-x-0.5" : ""} />
          </button>
        </form>
      </div>
      
      {confirmModalConfig && (
        <ConfirmModal {...confirmModalConfig} />
      )}
    </div>
  );
}
