'use client'
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { X, UserCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RequestModal({ onClose }: { onClose: () => void }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/users/requests');
      setRequests(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (id: string) => {
    try {
      await api.put(`/users/request/${id}/accept`);
      fetchRequests();
    } catch (e: any) {
      alert(e.message || 'Failed to accept request');
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="flex flex-col bg-[#0B0F19]/80 backdrop-blur-2xl w-full max-h-[85dvh] sm:w-[480px] sm:max-h-[72vh] rounded-3xl border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 flex-shrink-0">
              <UserCheck size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                Friend Requests
              </h2>
              {!loading && !error && (
                <p className="text-xs font-medium text-gray-400 mt-0.5">
                  {requests.length === 0
                    ? 'No pending requests'
                    : `${requests.length} pending`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={fetchRequests}
              title="Refresh"
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">

          {/* Loading */}
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-sm font-medium text-gray-400">Loading requests...</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="py-10 flex flex-col items-center gap-4 text-center"
            >
              <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20">
                <AlertCircle size={32} className="text-red-400" />
              </div>
              <p className="font-semibold text-sm text-red-300">{error}</p>
              <button
                onClick={fetchRequests}
                className="glass-button-secondary text-sm mt-2"
              >
                Try Again
              </button>
            </motion.div>
          )}

          {/* Empty state */}
          {!loading && !error && requests.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="py-12 flex flex-col items-center gap-5 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-2xl border border-white/10 shadow-lg shadow-black/20">
                🎉
              </div>
              <div>
                <p className="font-semibold text-white">No pending requests</p>
                <p className="text-sm text-gray-400 mt-1">When someone adds you, they'll appear here.</p>
              </div>
            </motion.div>
          )}

          {/* Request list */}
          <AnimatePresence>
            {!loading && !error && requests.map((req: any) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-lg text-white shadow-lg flex-shrink-0">
                    {req.requester.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-white truncate">
                      {req.requester.username}
                    </span>
                    <span className="text-xs text-gray-400 truncate">Wants to connect</span>
                  </div>
                </div>

                {/* Accept button */}
                <button
                  onClick={() => acceptRequest(req.id)}
                  className="flex-shrink-0 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-sm font-semibold transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                >
                  Accept
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modal, document.body);
}
