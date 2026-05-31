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
        className="flex flex-col clay-panel w-full max-w-[400px] overflow-hidden"
      >
        <div className="p-6 flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full mb-5 flex items-center justify-center shadow-[var(--clay-shadow-sm)] ${isDanger ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
            {getIcon()}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-text mb-2">{title}</h2>
          <p className="text-sm text-text-muted mb-8 leading-relaxed px-2 font-medium">
            {message}
          </p>
          <div className="flex w-full gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 clay-button !text-base"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              style={isDanger ? { '--primary-color': '#ef4444', '--primary-color-dark': '#dc2626' } as any : undefined}
              className="flex-1 px-4 py-3 clay-button-primary !text-base"
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
