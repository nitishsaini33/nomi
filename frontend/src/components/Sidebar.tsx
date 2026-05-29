'use client'
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { UserPlus, Search, LogOut } from 'lucide-react';
import RequestModal from './RequestModal';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/store/chatStore';

/** Returns a compact relative time string, e.g. "2m", "3h", "Yesterday", "May 25" */
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
  const router = useRouter();

  const { 
    setCurrentUser, 
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

    // Poll for new friend requests every 30 seconds
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

  /** Seed lastMessageTimes from the server so sort order is correct on first load */
  const fetchPreviews = async () => {
    try {
      const previews: { friend_id: string; last_timestamp: string }[] =
        await api.get('/chat/previews');
      previews.forEach((p) => setLastMessageTime(p.friend_id, p.last_timestamp));
    } catch (e) {
      // Non-critical — sidebar just shows unsorted friends
    }
  };

  const fetchRequestCount = async () => {
    try {
      const data = await api.get('/users/requests');
      setPendingRequestCount(data.length);
    } catch (e) {
      // silently ignore
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
    setCurrentUser(null);
    router.push('/login');
  };

  /**
   * Sort friends list:
   * 1. Friends with unread messages come first (most unread → top)
   * 2. Then sorted by last message time, most recent first
   * 3. Friends with no messages ever go to the bottom
   */
  const sortedFriends = [...friends].sort((a, b) => {
    const unreadA = unreadCounts[a.id] || 0;
    const unreadB = unreadCounts[b.id] || 0;
    const timeA   = lastMessageTimes[a.id] || 0;
    const timeB   = lastMessageTimes[b.id] || 0;

    // Unread first
    if (unreadA > 0 && unreadB === 0) return -1;
    if (unreadA === 0 && unreadB > 0) return 1;

    // Same unread tier → most recent message first
    return timeB - timeA;
  });

  return (
    <div className="h-full bg-white border-2 border-text shadow-brutal flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex justify-between items-center px-3 sm:px-4 py-3 border-b-4 border-text bg-background">
        <div className="font-black text-sm sm:text-base md:text-lg uppercase bg-primary text-text px-2 py-1 transform -rotate-1 truncate max-w-[55%]">
          {user.username}
        </div>
        <div className="flex gap-1 sm:gap-2">
          <button
            onClick={() => {
              setIsModalOpen(true);
              setPendingRequestCount(0); // clear badge immediately on open
            }}
            title={`Friend Requests${pendingRequestCount > 0 ? ` (${pendingRequestCount})` : ''}`}
            className="relative p-2 bg-text text-white border-2 border-text hover:bg-primary hover:text-text transition-colors"
          >
            <UserPlus size={16} />

            {/* Pending request badge */}
            {pendingRequestCount > 0 && (
              <span
                className="
                  absolute -top-2 -right-2
                  min-w-[18px] h-[18px] px-0.5
                  bg-primary border-2 border-text
                  font-black text-[9px] leading-none
                  flex items-center justify-center
                  animate-pulse
                "
              >
                {pendingRequestCount > 9 ? '9+' : pendingRequestCount}
              </span>
            )}
          </button>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2 bg-background border-2 border-text hover:bg-red-500 hover:text-white transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-3 border-b-2 border-text/20">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SEARCH USERS"
            className="brutal-input flex-1 text-xs sm:text-sm py-2"
          />
          <button type="submit" className="brutal-btn px-3 py-2 bg-primary flex-shrink-0">
            <Search size={16} />
          </button>
        </form>
      </div>

      {/* ── Search Results ── */}
      {searchResults.length > 0 && (
        <div className="flex-shrink-0 border-b-2 border-text bg-background max-h-40 overflow-y-auto">
          <div className="flex justify-between items-center px-3 sm:px-4 pt-2 pb-1">
            <span className="font-black text-xs uppercase">Results</span>
            <button
              onClick={() => setSearchResults([])}
              className="text-xs font-bold underline hover:text-primary"
            >
              Clear
            </button>
          </div>
          {searchResults.map((r: any) => (
            <div key={r.id} className="flex justify-between items-center px-3 sm:px-4 py-2 border-t border-text/20">
              <span className="font-bold text-sm truncate flex-1 mr-2">{r.username}</span>
              <button
                onClick={() => sendRequest(r.id)}
                className="px-2 py-1 bg-primary border-2 border-text text-xs font-bold uppercase hover:bg-text hover:text-white transition-colors flex-shrink-0"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Friends List ── */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3">
        <div className="font-black text-sm sm:text-base uppercase bg-text text-white inline-block px-3 py-1 transform rotate-1 mb-3">
          Friends
        </div>

        <div className="space-y-2 mt-1">
          {sortedFriends.map((f: any) => {
            const unread   = unreadCounts[f.id] || 0;
            const lastTime = lastMessageTimes[f.id] || 0;

            return (
              <button
                key={f.id}
                onClick={() => router.push(`/dashboard/chat/${f.id}`)}
                className="w-full brutal-box p-3 text-left cursor-pointer bg-background hover:bg-primary transition-colors group"
              >
                {/* Row 1: name + badge + time */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate flex-1">
                    <div className="font-black uppercase text-xs sm:text-sm group-hover:translate-x-1 transition-transform truncate">
                      {f.username}
                    </div>
                    {onlineUsers[f.id] && (
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-text flex-shrink-0" title="Online" />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Unread count badge */}
                    {unread > 0 && (
                      <span
                        className="
                          min-w-[20px] h-5 px-1
                          bg-primary border-2 border-text
                          group-hover:bg-white
                          font-black text-[10px] leading-none
                          flex items-center justify-center
                          animate-pulse group-hover:animate-none
                        "
                      >
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}

                    {/* Last message timestamp */}
                    {lastTime > 0 && (
                      <span className="text-[10px] font-bold text-text/40 group-hover:text-text/70 tabular-nums">
                        {timeAgo(lastTime)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: unread sub-label */}
                {unread > 0 && (
                  <div className="text-[10px] font-bold text-text/60 group-hover:text-text mt-0.5">
                    {unread === 1 ? '1 new message' : `${unread} new messages`}
                  </div>
                )}
              </button>
            );
          })}

          {friends.length === 0 && (
            <div className="font-bold text-gray-500 border-4 border-dashed border-text/40 p-4 text-center text-xs sm:text-sm mt-2">
              NO FRIENDS YET
              <br />
              <span className="font-medium text-xs opacity-70">
                Search &amp; add someone above
              </span>
            </div>
          )}
        </div>
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
