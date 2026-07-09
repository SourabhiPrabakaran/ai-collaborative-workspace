import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Render Overlay */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={`p-3.5 rounded-lg border shadow-lg flex items-center justify-between gap-3 pointer-events-auto bg-white dark:bg-notion-bg-sidebarDark ${
                toast.type === 'success'
                  ? 'border-green-150 text-green-700 dark:text-green-400 dark:border-green-950/30'
                  : toast.type === 'error'
                  ? 'border-red-150 text-red-700 dark:text-red-400 dark:border-red-950/30'
                  : 'border-blue-150 text-blue-700 dark:text-blue-400 dark:border-blue-950/30'
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {toast.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0 text-green-500" />}
                {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />}
                {toast.type === 'info' && <Info className="w-4 h-4 shrink-0 text-blue-500" />}
                <p className="text-xs font-semibold leading-relaxed truncate">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-notion-text-mutedLight dark:text-notion-text-mutedDark hover:opacity-85 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
