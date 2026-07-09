import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, FolderPlus, FilePlus, Home, 
  LogOut, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import FolderTree from './FolderTree.jsx';

const Sidebar = ({ 
  workspace, 
  tree, 
  activeDocId, 
  onCreateFolder, 
  onCreateDocument, 
  onSearchOpen, 
  onArchiveListOpen,
  onRefresh
}) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const toggleTheme = () => {
    if (theme === 'dark') {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setTheme('light');
    } else {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    }
  };

  return (
    <div className="w-60 h-screen flex flex-col bg-notion-bg-sidebarLight dark:bg-notion-bg-sidebarDark border-r border-notion-border-light dark:border-notion-border-dark shrink-0 text-notion-text-light dark:text-notion-text-dark select-none">
      {/* Workspace Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-notion-border-light dark:border-notion-border-dark">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-xl shrink-0">{workspace?.icon || '💼'}</span>
          <span className="font-semibold text-sm truncate">{workspace?.name}</span>
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          className="text-notion-text-mutedLight hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark p-1 rounded-md transition-colors"
          title="Return to Dashboard"
        >
          <Home className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Search & Utilities */}
      <div className="px-2 pt-3 space-y-0.5">
        <button
          onClick={onSearchOpen}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-notion-text-mutedLight dark:text-notion-text-mutedDark hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark rounded-md text-left transition-colors font-medium"
        >
          <Search className="w-4 h-4" />
          <span>Quick Find / Search</span>
        </button>

        <button
          onClick={onArchiveListOpen}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-notion-text-mutedLight dark:text-notion-text-mutedDark hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark rounded-md text-left transition-colors font-medium"
        >
          <Inbox className="w-4 h-4" />
          <span>Archived Documents</span>
        </button>
      </div>

      {/* Documents Section Header */}
      <div className="px-4 pt-6 pb-2 flex items-center justify-between text-[11px] font-semibold text-notion-text-mutedLight dark:text-notion-text-mutedDark uppercase tracking-wider">
        <span>Workspace Hierarchy</span>
        <div className="flex gap-1">
          <button
            onClick={() => onCreateFolder(null)}
            className="hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark p-0.5 rounded"
            title="Add Root Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onCreateDocument(null)}
            className="hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark p-0.5 rounded"
            title="Add Root Document"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Navigation Tree */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {tree?.folders?.length === 0 && tree?.documents?.length === 0 ? (
          <div className="text-[11px] text-notion-text-mutedLight dark:text-notion-text-mutedDark italic text-center py-4">
            Empty Workspace
          </div>
        ) : (
          <FolderTree
            folders={tree?.folders || []}
            documents={tree?.documents || []}
            activeDocId={activeDocId}
            onCreateFolder={onCreateFolder}
            onCreateDocument={onCreateDocument}
            onRefresh={onRefresh}
          />
        )}
      </div>

      {/* Footer Options */}
      <div className="p-2 border-t border-notion-border-light dark:border-notion-border-dark space-y-0.5 bg-notion-bg-sidebarLight/40 dark:bg-notion-bg-sidebarDark/40">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark rounded-md transition-colors font-medium text-left"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-yellow-500" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500" />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors font-medium text-left"
        >
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
