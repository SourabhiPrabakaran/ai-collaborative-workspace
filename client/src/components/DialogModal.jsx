import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, AlertTriangle, AlertCircle, X } from 'lucide-react';

const DialogModal = ({
  isOpen,
  type = 'confirm', // 'prompt' | 'confirm' | 'alert'
  title = 'Are you sure?',
  message = '',
  placeholder = 'Enter value...',
  defaultValue = '',
  onSubmit,
  onClose
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (type === 'prompt') {
      onSubmit(inputValue);
    } else {
      onSubmit(true);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative max-w-sm w-full bg-white dark:bg-notion-bg-sidebarDark border border-notion-border-light dark:border-notion-border-dark p-6 rounded-xl shadow-lg z-10 text-xs"
          >
            {/* Header Icon */}
            <div className="flex gap-3 mb-4 items-start">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                type === 'prompt' 
                  ? 'bg-blue-50 text-blue-500 dark:bg-blue-950/20' 
                  : type === 'confirm' 
                  ? 'bg-yellow-50 text-yellow-500 dark:bg-yellow-950/20' 
                  : 'bg-red-50 text-red-500 dark:bg-red-950/20'
              }`}>
                {type === 'prompt' && <HelpCircle className="w-4 h-4" />}
                {type === 'confirm' && <AlertTriangle className="w-4 h-4" />}
                {type === 'alert' && <AlertCircle className="w-4 h-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-notion-text-light dark:text-notion-text-dark">{title}</h3>
                {message && <p className="text-notion-text-mutedLight dark:text-notion-text-mutedDark mt-1 leading-relaxed">{message}</p>}
              </div>
            </div>

            {/* Input Form for Prompt */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {type === 'prompt' && (
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 border border-notion-border-light dark:border-notion-border-dark bg-transparent dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  required
                  autoFocus
                />
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                {type !== 'alert' && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-1.5 border border-notion-border-light dark:border-notion-border-dark rounded-lg font-medium hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-notion-text-light dark:text-notion-text-dark"
                  >
                    Cancel
                  </button>
                )}
                
                <button
                  type="submit"
                  className={`px-3.5 py-1.5 text-white rounded-lg font-medium hover:opacity-90 ${
                    type === 'alert' 
                      ? 'bg-red-500' 
                      : type === 'confirm' && title.toLowerCase().includes('delete') 
                      ? 'bg-red-500' 
                      : 'bg-blue-500'
                  }`}
                >
                  {type === 'alert' ? 'OK' : 'Confirm'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DialogModal;
