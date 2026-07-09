import React, { useState } from 'react';
import { Share, Trash, Inbox, History, Activity as ActivityIcon } from 'lucide-react';
import ShareModal from './ShareModal.jsx';
import NotificationBell from './NotificationBell.jsx';

const Navbar = ({ 
  doc, 
  onArchive, 
  onDelete, 
  onRestore, 
  connected, 
  onlineUsers = [],
  onVersionToggle,
  onActivityToggle
}) => {
  const [sharingOpen, setSharingOpen] = useState(false);

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

        {/* Notification Bell */}
        <NotificationBell />

        {/* Activity Timeline Toggle */}
        <button
          onClick={onActivityToggle}
          className="p-1.5 rounded-lg hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-notion-text-mutedLight dark:text-notion-text-mutedDark transition-all outline-none"
          title="Activity Timeline"
        >
          <ActivityIcon className="w-4 h-4" />
        </button>

        {/* Version History Toggle */}
        <button
          onClick={onVersionToggle}
          className="p-1.5 rounded-lg hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-notion-text-mutedLight dark:text-notion-text-mutedDark transition-all outline-none"
          title="Version History"
        >
          <History className="w-4 h-4" />
        </button>

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

        {/* Share Button */}
        <button
          onClick={() => setSharingOpen(true)}
          className="flex items-center gap-1 text-[11px] font-semibold text-notion-text-mutedLight hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark px-2.5 py-1 rounded-md transition-colors"
        >
          <Share className="w-3.5 h-3.5" />
          Share
        </button>

        {sharingOpen && (
          <ShareModal
            isOpen={sharingOpen}
            onClose={() => setSharingOpen(false)}
            workspaceId={doc?.workspace?._id || doc?.workspace}
            documentId={doc?._id}
          />
        )}

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
