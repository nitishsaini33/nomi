'use client'
import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { UserPlus, Search, LogOut, Trash2 } from 'lucide-react';
import RequestModal from './RequestModal';
import { useRouter, usePathname } from 'next/navigation';
import { useChatStore } from '@/store/chatStore';
import { motion, AnimatePresence } from 'framer-motion';

import { ThemeToggle } from './ThemeToggle';
import ConfirmModal from './ConfirmModal';

/** Returns a compact relative time string */
function timeAgo(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'now';
  if (mins  < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days  === 1) return 'Yesterday';
  return new Date(epochMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Sidebar({ user }: { user: any }) {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<any>(null);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const activeChatId = pathname?.split('/').pop();

  const { 
    unreadCounts, 
    lastMessageTimes, 
    setLastMessageTime, 
    onlineUsers, 
    sidebarRefreshKey,
    friends,
    setFriends 
  } = useChatStore();

  useEffect(() => {
    fetchFriends();
    fetchRequestCount();
    fetchPreviews();
    const interval = setInterval(fetchRequestCount, 30_000);
    return () => clearInterval(interval);
  }, [sidebarRefreshKey]);

  const fetchFriends = async () => {
    try {
      const data = await api.get('/users/friends');
      setFriends(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPreviews = async () => {
    try {
      const previews: { friend_id: string; last_timestamp: string }[] = await api.get('/chat/previews');
      previews.forEach((p) => setLastMessageTime(p.friend_id, p.last_timestamp));
    } catch (e) {
      // ignore
    }
  };

  const fetchRequestCount = async () => {
    try {
      const data = await api.get('/users/requests');
      setPendingRequestCount(data.length);
    } catch (e) {
      // ignore
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    try {
      const data = await api.get(`/users/search?query=${encodeURIComponent(search)}`);
      setSearchResults(data);
    } catch (e) {
      console.error(e);
    }
  };

  const sendRequest = async (id: string) => {
    try {
      await api.post(`/users/request/${id}`, {});
      setSearchResults([]);
      setSearch('');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleLogout = () => {
    setConfirmModalConfig({
      title: 'Log Out',
      message: 'Are you sure you want to log out of your account?',
      confirmText: 'Log Out',
      icon: 'logout',
      onConfirm: () => {
        localStorage.removeItem('token');
        useChatStore.getState().clearStore();
        router.push('/login');
      },
      onCancel: () => setConfirmModalConfig(null)
    });
  };

  const handleDeleteAccount = () => {
    setConfirmModalConfig({
      title: 'Delete Account',
      message: 'Are you sure you want to delete your account? This action cannot be undone and will permanently delete ALL your messages, friends, and data.',
      confirmText: 'Delete Permanently',
      isDanger: true,
      icon: 'trash',
      onConfirm: async () => {
        setConfirmModalConfig(null);
        try {
          await api.delete('/users/me');
          alert('Account deleted successfully.');
          localStorage.removeItem('token');
          useChatStore.getState().clearStore();
          router.push('/login');
        } catch (e: any) {
          alert(e.message || 'Failed to delete account');
        }
      },
      onCancel: () => setConfirmModalConfig(null)
    });
  };

  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const unreadA = unreadCounts[a.id] || 0;
      const unreadB = unreadCounts[b.id] || 0;
      const timeA   = lastMessageTimes[a.id] || 0;
      const timeB   = lastMessageTimes[b.id] || 0;
      if (unreadA > 0 && unreadB === 0) return -1;
      if (unreadA === 0 && unreadB > 0) return 1;
      return timeB - timeA;
    });
  }, [friends, unreadCounts, lastMessageTimes]);

  return (
    <div className="h-full flex flex-col bg-transparent text-text w-full">
      {/* ── Brand & Actions Header ── */}
      <div className="flex-shrink-0 flex justify-between items-center px-4 sm:px-6 pt-5 pb-3 bg-transparent">
        <button 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-3 cursor-pointer group text-left"
          title="Go to Dashboard"
        >
          <img src="/logo.png" alt="Nomihub Logo" className="w-8 h-8 object-cover rounded-xl shadow-sm border border-black/5 dark:border-white/5 group-hover:opacity-90 transition-all duration-300 invert dark:invert-0" />
          <h1 className="font-bold text-xl tracking-tight text-primary group-hover:brightness-110 transition-all">
            Nomihub
          </h1>
        </button>
        
        <div className="flex gap-2 items-center">
          <ThemeToggle />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsModalOpen(true);
              setPendingRequestCount(0);
            }}
            title="Friend Requests"
            className="relative !p-2.5 clay-button text-text-muted hover:text-primary transition-colors"
          >
            <UserPlus size={18} />
            {pendingRequestCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary rounded-full font-bold text-[10px] flex items-center justify-center text-white"
              >
                {pendingRequestCount > 9 ? '9+' : pendingRequestCount}
              </motion.span>
            )}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDeleteAccount}
            title="Delete Account"
            className="!p-2.5 clay-button text-text-muted hover:text-red-500 transition-colors"
          >
            <Trash2 size={18} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            title="Logout"
            className="!p-2.5 clay-button text-text-muted hover:text-primary transition-colors"
          >
            <LogOut size={18} />
          </motion.button>
        </div>
      </div>

      {/* ── User Header ── */}
      <div className="flex-shrink-0 px-4 sm:px-6 pb-4 border-b border-black/5 dark:border-white/5">
        <div className="font-bold text-lg md:text-xl truncate text-text uppercase tracking-wider">
          {user.username}
        </div>
      </div>

      <div className="flex-shrink-0 px-4 sm:px-6 py-4">
        <form onSubmit={handleSearch} className="relative">
          <div className="relative rounded-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <Search size={16} className={`transition-colors ${isSearchFocused ? 'text-primary' : 'text-text-muted'}`} />
            </div>
            <input
              type="text"
              value={search}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="clay-input !pl-10 text-sm py-3 transition-all"
            />
          </div>
        </form>
      </div>

      {/* ── Search Results ── */}
      {searchResults.length > 0 && (
        <div className="flex-shrink-0 mx-4 sm:mx-6 mb-4 clay-panel-sm overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b border-black/5 dark:border-white/5">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Results</span>
            <button
              onClick={() => setSearchResults([])}
              className="text-xs font-bold text-primary hover:brightness-110"
            >
              Clear
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto no-scrollbar">
            {searchResults.map((r: any) => (
              <div key={r.id} className="flex justify-between items-center px-4 py-3 border-b border-black/5 dark:border-white/5 last:border-0">
                <span className="font-bold text-sm truncate flex-1 mr-2 text-text uppercase">{r.username}</span>
                <button
                  onClick={() => sendRequest(r.id)}
                  className="clay-button-primary !py-1.5 !px-4 !text-xs !rounded-lg"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Friends List ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-4">
        <div className="px-4 py-2 mb-2">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Messages</h3>
        </div>

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05 } }
          }}
          className="space-y-2"
        >
          {sortedFriends.map((f: any) => {
            const unread   = unreadCounts[f.id] || 0;
            const lastTime = lastMessageTimes[f.id] || 0;
            const isActive = activeChatId === f.id;

            return (
              <motion.button
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 1, x: 0 }
                }}
                whileTap={{ scale: 0.98 }}
                key={f.id}
                onClick={() => router.push(`/dashboard/chat/${f.id}`)}
                className={`w-full text-left p-3 mx-2 rounded-[1.25rem] transition-all group relative flex items-center gap-3 ${
                  isActive 
                    ? 'clay-panel-sm' 
                    : 'bg-transparent border-transparent hover:shadow-[var(--clay-shadow-sm)] hover:bg-surface'
                }`}
                style={{ width: 'calc(100% - 16px)' }}
              >
                {/* Avatar with online indicator */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center font-bold text-white shadow-[var(--clay-shadow-sm)]">
                    {f.username.charAt(0).toUpperCase()}
                  </div>
                  {onlineUsers[f.id] && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-[3px] border-surface" 
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className={`font-bold text-sm truncate transition-colors uppercase ${isActive ? 'text-primary' : 'text-text'}`}>
                      {f.username}
                    </span>
                    {lastTime > 0 && (
                      <span className={`text-[10px] font-medium tabular-nums whitespace-nowrap ml-2 ${isActive ? 'text-primary' : 'text-text-muted'}`}>
                        {timeAgo(lastTime)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center h-4 mt-1">
                    <p className={`text-xs font-medium truncate pr-2 transition-colors ${isActive ? 'text-primary opacity-80' : 'text-text-muted'}`}>
                      {unread > 0 ? (
                        <span className="text-primary font-bold">New messages</span>
                      ) : (
                        'Tap to chat'
                      )}
                    </p>
                    {unread > 0 && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-primary text-white font-bold text-[10px] flex items-center justify-center shadow-[var(--clay-shadow-sm)] flex-shrink-0"
                      >
                        {unread > 9 ? '9+' : unread}
                      </motion.span>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}

          {friends.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-10 px-4 text-center"
            >
              <div className="w-12 h-12 rounded-full clay-panel-sm flex items-center justify-center mb-3 text-text-muted">
                <Search size={20} />
              </div>
              <p className="text-sm font-bold text-text">No friends yet</p>
              <p className="text-xs text-text-muted mt-1">Search above to connect</p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {isModalOpen && (
        <RequestModal
          onClose={() => {
            setIsModalOpen(false);
            fetchFriends();
            fetchRequestCount();
          }}
        />
      )}

      {confirmModalConfig && (
        <ConfirmModal {...confirmModalConfig} />
      )}
    </div>
  );
}
