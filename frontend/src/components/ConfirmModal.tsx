'use client'
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, LogOut, UserMinus, Trash2 } from 'lucide-react';

export default function ConfirmModal({ 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel", 
  onConfirm, 
  onCancel, 
  isDanger = false,
  icon = "alert"
}: { 
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
  icon?: "alert" | "logout" | "unfriend" | "trash";
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const getIcon = () => {
    switch (icon) {
      case "logout": return <LogOut size={32} />;
      case "unfriend": return <UserMinus size={32} />;
      case "trash": return <Trash2 size={32} />;
      default: return <AlertTriangle size={32} />;
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-8"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="flex flex-col bg-[#0B0F19]/90 backdrop-blur-2xl w-full max-w-[400px] rounded-3xl border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden"
      >
        <div className="p-6 flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full mb-5 flex items-center justify-center shadow-lg ${isDanger ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-red-500/10' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-indigo-500/10'}`}>
            {getIcon()}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{title}</h2>
          <p className="text-sm text-gray-400 mb-8 leading-relaxed px-2">
            {message}
          </p>
          <div className="flex w-full gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all hover:border-white/20"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all shadow-lg ${
                isDanger 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modal, document.body);
}
