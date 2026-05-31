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
        className="flex flex-col clay-panel w-full max-h-[85dvh] sm:w-[480px] sm:max-h-[72vh] overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-5 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-primary/20 text-primary rounded-xl flex-shrink-0 shadow-[var(--clay-shadow-sm)]">
              <UserCheck size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-text leading-tight">
                Friend Requests
              </h2>
              {!loading && !error && (
                <p className="text-xs font-bold text-text-muted mt-0.5">
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
              className="clay-button !p-2 text-text-muted hover:text-primary transition-all"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="clay-button !p-2 text-text-muted hover:text-red-500 transition-all"
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
              <div className="p-4 bg-red-500/10 rounded-full shadow-[var(--clay-shadow-sm)] text-red-500">
                <AlertCircle size={32} />
              </div>
              <p className="font-bold text-sm text-red-500">{error}</p>
              <button
                onClick={fetchRequests}
                className="clay-button text-sm mt-2"
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
              <div className="w-16 h-16 rounded-2xl clay-panel-sm flex items-center justify-center text-2xl">
                🎉
              </div>
              <div>
                <p className="font-bold text-text">No pending requests</p>
                <p className="text-sm font-medium text-text-muted mt-1">When someone adds you, they'll appear here.</p>
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
                className="flex items-center justify-between gap-4 p-4 clay-panel-sm transition-all"
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center font-bold text-lg text-white shadow-[var(--clay-shadow-sm)] flex-shrink-0">
                    {req.requester.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-text truncate">
                      {req.requester.username}
                    </span>
                    <span className="text-xs font-bold text-text-muted truncate">Wants to connect</span>
                  </div>
                </div>

                {/* Accept button */}
                <button
                  onClick={() => acceptRequest(req.id)}
                  className="clay-button-primary !py-2 !px-4 !text-sm flex-shrink-0"
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
