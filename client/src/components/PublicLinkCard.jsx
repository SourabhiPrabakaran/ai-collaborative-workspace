import React, { useState } from 'react';
import { Link2, Copy, Check, ShieldAlert } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

const PublicLinkCard = ({ isPublic, publicToken, onTogglePublic }) => {
  const { showToast } = useState(null); // Wait, we can get showToast from useToast
  // Let's use the toast context hook correctly:
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const getPublicUrl = () => {
    const origin = window.location.origin;
    return `${origin}/public/document/${publicToken}`;
  };

  const handleCopyLink = () => {
    if (!publicToken) return;
    navigator.clipboard.writeText(getPublicUrl());
    setCopied(true);
    toast.showToast('Copied public link to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-notion-hover-light/40 dark:bg-notion-hover-dark/10 border border-notion-border-light dark:border-notion-border-dark p-3.5 rounded-xl space-y-3 select-none text-left">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-notion-text-light dark:text-notion-text-dark flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-purple-500" />
            Share to Web
          </h4>
          <p className="text-[10px] text-notion-text-mutedLight dark:text-notion-text-mutedDark mt-0.5">
            Publish this document online to share with anyone.
          </p>
        </div>

        {/* Public Toggle Switch */}
        <button
          onClick={() => onTogglePublic(!isPublic)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
            isPublic ? 'bg-purple-500' : 'bg-notion-border-light dark:bg-notion-border-dark'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isPublic ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {isPublic && publicToken && (
        <div className="space-y-2">
          {/* Copy URL input bar */}
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={getPublicUrl()}
              onClick={(e) => e.target.select()}
              className="flex-1 bg-white dark:bg-notion-bg-dark border border-notion-border-light dark:border-notion-border-dark text-[10px] rounded-lg px-2.5 py-1 outline-none text-notion-text-light dark:text-notion-text-dark truncate select-all"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-1 bg-purple-500/10 text-purple-500 hover:bg-purple-500/25 border border-purple-500/20 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="bg-yellow-500/5 text-yellow-600 dark:text-yellow-500 border border-yellow-500/10 p-2 rounded-lg flex gap-1.5 items-start">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="text-[9px] leading-relaxed">
              Anyone with this link can view the document. Real-time collaboration cursor labels will be displayed as "Guest Collaborator".
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicLinkCard;
