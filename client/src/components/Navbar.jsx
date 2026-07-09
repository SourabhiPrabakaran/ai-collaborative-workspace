import React, { useState } from 'react';
import { Share, Trash, Inbox, Copy, Check, Users } from 'lucide-react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

const Navbar = ({ 
  doc, 
  onArchive, 
  onDelete, 
  onRestore, 
  connected, 
  onlineUsers = [] 
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [sharingOpen, setSharingOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(doc?.isPublic || false);

  const togglePublicSharing = async () => {
    try {
      const response = await api.put(`/documents/${doc._id}`, {
        isPublic: !isPublic
      });
      if (response.success && response.data) {
        setIsPublic(response.data.isPublic);
        showToast('Document public sharing updated', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Error updating document share settings', 'error');
    }
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/workspace/${doc.workspace}/document/${doc._id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    showToast('Link copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-11 border-b border-notion-border-light dark:border-notion-border-dark px-4 flex justify-between items-center bg-white/70 dark:bg-notion-bg-dark/70 backdrop-blur-md select-none">
      {/* Breadcrumb Info */}
      <div className="flex items-center gap-1.5 overflow-hidden text-xs">
        <span className="text-sm shrink-0">{doc?.emoji || '📄'}</span>
        <span className="font-semibold truncate text-notion-text-light dark:text-notion-text-dark">
          {doc?.title || 'Untitled'}
        </span>
        {doc?.isArchived && (
          <span className="bg-red-50 dark:bg-red-950/20 text-red-500 text-[10px] px-1.5 py-0.5 rounded font-medium border border-red-200 dark:border-red-900/30 ml-2">
            Archived
          </span>
        )}
      </div>

      {/* Nav Actions */}
      <div className="flex items-center gap-2">
        {/* Real-time Connection status indicator & online users list */}
        <div className="flex items-center mr-3">
          <span 
            className={`w-2 h-2 rounded-full mr-2 shrink-0 ${connected ? 'bg-green-500' : 'bg-gray-400'}`}
            title={connected ? 'Connected to collaboration server' : 'Disconnected from collaboration server'}
          />
          
          {onlineUsers.length > 0 && (
            <div className="flex -space-x-1.5 overflow-hidden items-center">
              {onlineUsers.map((u) => (
                <div
                  key={u.userId}
                  title={`${u.fullName} is currently viewing`}
                  className="inline-block h-5 w-5 rounded-full ring-1 ring-white dark:ring-notion-bg-dark bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold uppercase transition-colors"
                >
                  {u.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              ))}
              <span className="text-[10px] text-notion-text-mutedLight dark:text-notion-text-mutedDark ml-1.5 font-medium">
                {onlineUsers.length} viewing
              </span>
            </div>
          )}
        </div>

        {doc?.isArchived ? (
          <button
            onClick={onRestore}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-500 hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark px-2.5 py-1 rounded-md transition-colors"
          >
            <Inbox className="w-3.5 h-3.5" />
            Restore
          </button>
        ) : (
          <button
            onClick={onArchive}
            className="flex items-center gap-1 text-[11px] font-semibold text-notion-text-mutedLight hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark px-2.5 py-1 rounded-md transition-colors"
            title="Soft Delete (Archive)"
          >
            <Inbox className="w-3.5 h-3.5" />
            Archive
          </button>
        )}

        {/* Share Button & Popover */}
        <div className="relative">
          <button
            onClick={() => setSharingOpen(!sharingOpen)}
            className="flex items-center gap-1 text-[11px] font-semibold text-notion-text-mutedLight hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark px-2.5 py-1 rounded-md transition-colors"
          >
            <Share className="w-3.5 h-3.5" />
            Share
          </button>

          {sharingOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSharingOpen(false)} />
              <div className="absolute right-0 top-7 bg-white dark:bg-notion-bg-sidebarDark border border-notion-border-light dark:border-notion-border-dark p-4 rounded-lg shadow-lg z-20 min-w-[240px] text-xs space-y-3">
                <h4 className="font-semibold text-notion-text-light dark:text-notion-text-dark">Publish document</h4>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-notion-text-mutedLight dark:text-notion-text-mutedDark">Share to public web</span>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={togglePublicSharing}
                    className="w-4 h-4 accent-blue-500 cursor-pointer"
                  />
                </div>
                {isPublic && (
                  <div className="pt-2 border-t border-notion-border-light dark:border-notion-border-dark flex items-center gap-1.5">
                    <button
                      onClick={copyShareLink}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-notion-text-light dark:bg-notion-text-dark text-white dark:text-notion-bg-dark rounded font-medium hover:opacity-90 transition-opacity"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy link'}</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Delete Permanently */}
        <button
          onClick={onDelete}
          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
          title="Delete Permanently"
        >
          <Trash className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
