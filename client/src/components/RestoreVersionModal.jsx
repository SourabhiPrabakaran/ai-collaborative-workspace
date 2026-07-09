import React, { useState } from 'react';
import { RotateCcw, X, Loader } from 'lucide-react';

const RestoreVersionModal = ({ isOpen, onClose, onConfirm, version, loading = false }) => {
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(description.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-white dark:bg-notion-bg-sidebarDark border border-notion-border-light dark:border-notion-border-dark p-5 rounded-2xl w-full max-w-sm shadow-xl space-y-4 text-left">
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-notion-border-light dark:border-notion-border-dark">
          <div className="flex items-center gap-1.5 text-purple-500 font-bold text-xs uppercase tracking-wider">
            <RotateCcw className="w-4 h-4" />
            Restore Version
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-notion-text-mutedLight rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-2 text-xs">
          <p className="text-notion-text-light dark:text-notion-text-dark font-medium">
            Are you sure you want to restore **Version v{version?.version}**?
          </p>
          <p className="text-[10px] text-notion-text-mutedLight dark:text-notion-text-mutedDark leading-relaxed">
            Restoring this version will overwrite the current content. A backup snapshot of the current state will be created automatically before restoring.
          </p>
        </div>

        {/* Optional Description Input */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-notion-text-mutedLight uppercase tracking-wider">
              Backup Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Save prior to restoring v..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-notion-hover-light dark:bg-notion-hover-dark border border-notion-border-light dark:border-notion-border-dark text-[11px] rounded-lg px-2.5 py-1.5 outline-none text-notion-text-light dark:text-notion-text-dark"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 bg-notion-hover-light dark:bg-notion-hover-dark text-notion-text-light dark:text-notion-text-dark text-xs font-semibold rounded-lg hover:opacity-85"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              Restore
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RestoreVersionModal;
