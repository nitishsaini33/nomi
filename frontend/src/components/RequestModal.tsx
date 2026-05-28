'use client'
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { X, UserCheck, RefreshCw, AlertCircle } from 'lucide-react';

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
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex flex-col bg-white w-full max-h-[82dvh] sm:w-[480px] sm:max-h-[72vh] brutal-box">

        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b-4 border-text bg-background">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 bg-primary border-2 border-text flex-shrink-0">
              <UserCheck size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-black uppercase leading-tight">
                Friend Requests
              </h2>
              {!loading && !error && (
                <p className="text-xs font-bold text-gray-500 mt-0.5">
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
              className="p-2 bg-background border-2 border-text hover:bg-primary transition-colors"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 flex items-center justify-center bg-text text-white border-2 border-text hover:bg-primary hover:text-text transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">

          {/* Loading */}
          {loading && (
            <div className="py-14 text-center font-black text-base animate-pulse text-gray-400 uppercase tracking-widest">
              Loading...
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="py-8 flex flex-col items-center gap-4 text-center">
              <div className="p-3 bg-red-100 border-4 border-red-500">
                <AlertCircle size={36} className="text-red-500" />
              </div>
              <p className="font-black text-sm text-red-600 uppercase">{error}</p>
              <button
                onClick={fetchRequests}
                className="brutal-btn bg-primary px-5 py-2 text-sm"
              >
                TRY AGAIN
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && requests.length === 0 && (
            <div className="py-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 bg-background border-4 border-text flex items-center justify-center text-3xl shadow-brutal">
                🎉
              </div>
              <div className="w-full border-4 border-dashed border-text/30 px-6 py-5">
                <p className="font-black uppercase text-sm text-gray-500">
                  No pending friend requests
                </p>
                <p className="font-medium text-xs text-gray-400 mt-1">
                  When someone adds you, they'll appear here.
                </p>
              </div>
            </div>
          )}

          {/* Request list */}
          {!loading && !error && requests.map((req: any) => (
            <div
              key={req.id}
              className="brutal-box bg-background flex items-center justify-between gap-3 p-3 sm:p-4"
            >
              {/* Avatar + name */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 flex-shrink-0 bg-primary border-2 border-text flex items-center justify-center font-black text-base uppercase shadow-brutal">
                  {req.requester.username.charAt(0)}
                </div>
                <span className="font-black text-base truncate">
                  {req.requester.username}
                </span>
              </div>

              {/* Accept button */}
              <button
                onClick={() => acceptRequest(req.id)}
                className="brutal-btn bg-primary flex-shrink-0 px-4 py-2 text-xs sm:text-sm font-black uppercase"
              >
                ACCEPT
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render into document.body to escape any parent stacking contexts
  return createPortal(modal, document.body);
}
