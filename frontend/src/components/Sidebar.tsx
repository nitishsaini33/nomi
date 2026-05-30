'use client'
import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { UserPlus, Search, LogOut, Trash2 } from 'lucide-react';
import RequestModal from './RequestModal';
import { useRouter, usePathname } from 'next/navigation';
import { useChatStore } from '@/store/chatStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/store/chatStore';

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
    localStorage.removeItem('token');
    useChatStore.getState().clearStore();
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    const confirm1 = confirm("Are you sure you want to delete your account? This action cannot be undone.");
    if (!confirm1) return;
    const confirm2 = confirm("WARNING: This will permanently delete ALL your messages, friends, and data. Type OK to proceed.");
    if (!confirm2) return;
    try {
      await api.delete('/users/me');
      alert('Account deleted successfully.');
      handleLogout();
    } catch (e: any) {
      alert(e.message || 'Failed to delete account');
    }
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
    <div className="h-full flex flex-col bg-transparent text-white w-full">
      {/* ── Header ── */}
      <div className="flex-shrink-0 flex justify-between items-center px-4 sm:px-6 py-4 border-b border-white/5 bg-white/5 backdrop-blur-sm">
        <button
          onClick={() => router.push('/dashboard')}
          className="font-bold text-lg md:text-xl truncate max-w-[55%] hover:text-indigo-400 transition-colors cursor-pointer"
          title="Go to Dashboard"
        >
          {user.username}
        </button>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsModalOpen(true);
              setPendingRequestCount(0);
            }}
            title="Friend Requests"
            className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/50 hover:text-indigo-400 transition-colors"
          >
            <UserPlus size={18} />
            {pendingRequestCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-indigo-500 rounded-full font-bold text-[10px] flex items-center justify-center border border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
              >
                {pendingRequestCount > 9 ? '9+' : pendingRequestCount}
              </motion.span>
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDeleteAccount}
            title="Delete Account"
            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 hover:text-red-400 transition-colors"
          >
            <Trash2 size={18} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            title="Logout"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-colors"
          >
            <LogOut size={18} />
          </motion.button>
        </div>
      </div>

      <div className="flex-shrink-0 px-4 sm:px-6 py-4">
        <form onSubmit={handleSearch} className="relative">
          <motion.div 
            animate={{ 
              boxShadow: isSearchFocused ? '0 0 0 2px rgba(99,102,241,0.4)' : '0 0 0 0px rgba(99,102,241,0)'
            }}
            className="relative rounded-full"
          >
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className={`transition-colors ${isSearchFocused ? 'text-indigo-400' : 'text-gray-400'}`} />
            </div>
            <input
              type="text"
              value={search}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="glass-input !pl-10 text-sm py-2.5 rounded-full transition-all"
            />
          </motion.div>
        </form>
      </div>

      {/* ── Search Results ── */}
      {searchResults.length > 0 && (
        <div className="flex-shrink-0 mx-4 sm:mx-6 mb-4 rounded-xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur-md">
          <div className="flex justify-between items-center px-4 py-2 border-b border-white/5 bg-white/5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Results</span>
            <button
              onClick={() => setSearchResults([])}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
            >
              Clear
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto no-scrollbar">
            {searchResults.map((r: any) => (
              <div key={r.id} className="flex justify-between items-center px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <span className="font-medium text-sm truncate flex-1 mr-2">{r.username}</span>
                <button
                  onClick={() => sendRequest(r.id)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500 hover:text-white border border-indigo-500/30 transition-all text-xs font-medium"
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
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Messages</h3>
        </div>

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05 } }
          }}
          className="space-y-1"
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
                whileHover={{ scale: 1.015, x: 4 }}
                whileTap={{ scale: 0.98 }}
                key={f.id}
                onClick={() => router.push(`/dashboard/chat/${f.id}`)}
                className={`w-full text-left p-3 mx-2 rounded-xl transition-all group relative flex items-center gap-3 border ${
                  isActive 
                    ? 'bg-white/10 border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.2)]' 
                    : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
                }`}
                style={{ width: 'calc(100% - 16px)' }}
              >
                {/* Avatar with online indicator */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg">
                    {f.username.charAt(0).toUpperCase()}
                  </div>
                  {onlineUsers[f.id] && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className="absolute bottom-0 right-0 w-3 h-3 bg-cyan-400 rounded-full border-2 border-[#0B0F19] shadow-[0_0_8px_rgba(6,182,212,0.6)]" 
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className={`font-semibold text-sm truncate transition-colors ${isActive ? 'text-indigo-300' : 'text-white group-hover:text-indigo-200'}`}>
                      {f.username}
                    </span>
                    {lastTime > 0 && (
                      <span className={`text-[10px] font-medium tabular-nums whitespace-nowrap ml-2 ${isActive ? 'text-indigo-300' : 'text-gray-500'}`}>
                        {timeAgo(lastTime)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center h-4">
                    <p className={`text-xs truncate pr-2 transition-colors ${isActive ? 'text-indigo-100/70' : 'text-gray-400'}`}>
                      {unread > 0 ? (
                        <span className="text-indigo-400 font-medium">New messages</span>
                      ) : (
                        'Tap to chat'
                      )}
                    </p>
                    {unread > 0 && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-500 text-white font-bold text-[10px] flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.5)] flex-shrink-0"
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
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 text-gray-500">
                <Search size={20} />
              </div>
              <p className="text-sm font-medium text-gray-300">No friends yet</p>
              <p className="text-xs text-gray-500 mt-1">Search above to connect</p>
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
    </div>
  );
}
