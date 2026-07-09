import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, ChevronDown, Folder, 
  Plus, MoreHorizontal, Edit3, Trash2, FolderSync
} from 'lucide-react';
import api from '../services/api.js';
import DialogModal from './DialogModal.jsx';
import { useToast } from '../context/ToastContext.jsx';

const FolderTree = ({ 
  folders, 
  documents, 
  activeDocId, 
  onCreateFolder, 
  onCreateDocument,
  onRefresh,
  depth = 0 
}) => {
  return (
    <div className="space-y-0.5 select-none">
      {folders.map((folder) => (
        <FolderItem
          key={folder._id}
          folder={folder}
          activeDocId={activeDocId}
          onCreateFolder={onCreateFolder}
          onCreateDocument={onCreateDocument}
          onRefresh={onRefresh}
          depth={depth}
        />
      ))}
      {documents.map((doc) => (
        <DocumentItem
          key={doc._id}
          doc={doc}
          activeDocId={activeDocId}
          depth={depth}
        />
      ))}
    </div>
  );
};

const FolderItem = ({ 
  folder, 
  activeDocId, 
  onCreateFolder, 
  onCreateDocument, 
  onRefresh, 
  depth 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'rename' | 'move' | 'delete'
  const { showToast } = useToast();

  const handleRenameSubmit = async (newName) => {
    setActiveModal(null);
    if (!newName || !newName.trim() || newName === folder.name) return;

    try {
      const response = await api.put(`/folders/${folder._id}`, { name: newName.trim() });
      if (response.success) {
        showToast('Folder renamed successfully', 'success');
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      showToast(err.message || 'Error renaming folder', 'error');
    }
  };

  const handleMoveSubmit = async (parentId) => {
    setActiveModal(null);
    const cleanParentId = !parentId || parentId.trim() === '' ? null : parentId.trim();

    try {
      const response = await api.put(`/folders/${folder._id}`, { parentFolder: cleanParentId });
      if (response.success) {
        showToast('Folder moved successfully', 'success');
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      showToast(err.message || 'Circular reference or invalid target ID', 'error');
    }
  };

  const handleDeleteSubmit = async () => {
    setActiveModal(null);
    try {
      const response = await api.delete(`/folders/${folder._id}`);
      if (response.success) {
        showToast('Folder and nested contents deleted', 'success');
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      showToast(err.message || 'Error deleting folder', 'error');
    }
  };

  return (
    <div className="space-y-0.5">
      {/* Folder Row */}
      <div 
        className="group flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-xs font-medium cursor-pointer transition-colors"
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-notion-text-mutedLight dark:text-notion-text-mutedDark">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
          <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate">{folder.name}</span>
        </div>

        {/* Hover Actions */}
        <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onCreateDocument(folder._id)}
            className="p-0.5 hover:bg-notion-border-light dark:hover:bg-notion-border-dark rounded text-notion-text-mutedLight"
            title="Create Document"
          >
            <Plus className="w-3 h-3" />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-0.5 hover:bg-notion-border-light dark:hover:bg-notion-border-dark rounded text-notion-text-mutedLight"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-5 bg-white dark:bg-notion-bg-sidebarDark border border-notion-border-light dark:border-notion-border-dark rounded shadow-md z-20 py-1 min-w-[120px]">
                  <button
                    onClick={() => { setMenuOpen(false); onCreateFolder(folder._id); }}
                    className="w-full text-left px-3 py-1 hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark flex items-center gap-1.5"
                  >
                    <Plus className="w-3 h-3" /> Add Subfolder
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); setActiveModal('rename'); }}
                    className="w-full text-left px-3 py-1 hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3 h-3" /> Rename
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); setActiveModal('move'); }}
                    className="w-full text-left px-3 py-1 hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark flex items-center gap-1.5"
                  >
                    <FolderSync className="w-3 h-3" /> Move Folder
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); setActiveModal('delete'); }}
                    className="w-full text-left px-3 py-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Children elements */}
      {isOpen && (
        <FolderTree
          folders={folder.folders || []}
          documents={folder.documents || []}
          activeDocId={activeDocId}
          onCreateFolder={onCreateFolder}
          onCreateDocument={onCreateDocument}
          onRefresh={onRefresh}
          depth={depth + 1}
        />
      )}

      {/* Modal Dialogs */}
      <DialogModal
        isOpen={activeModal === 'rename'}
        type="prompt"
        title="Rename Folder"
        message="Enter a new name for this folder:"
        defaultValue={folder.name}
        onSubmit={handleRenameSubmit}
        onClose={() => setActiveModal(null)}
      />

      <DialogModal
        isOpen={activeModal === 'move'}
        type="prompt"
        title="Move Folder"
        message="Enter parent folder ID (leave blank to move to root):"
        placeholder="Parent folder ObjectId..."
        onSubmit={handleMoveSubmit}
        onClose={() => setActiveModal(null)}
      />

      <DialogModal
        isOpen={activeModal === 'delete'}
        type="confirm"
        title="Delete Folder"
        message={`Are you sure you want to delete "${folder.name}"? This deletes all subfolders and documents recursively!`}
        onSubmit={handleDeleteSubmit}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
};

const DocumentItem = ({ doc, activeDocId, depth }) => {
  const navigate = useNavigate();
  const isActive = activeDocId === doc._id;

  const handleDocumentClick = () => {
    navigate(`/workspace/${doc.workspace}/document/${doc._id}`);
  };

  return (
    <div
      onClick={handleDocumentClick}
      className={`group flex items-center justify-between py-1 px-1.5 rounded-md text-xs cursor-pointer transition-colors ${isActive ? 'bg-notion-hover-light dark:bg-notion-hover-dark text-blue-500 font-semibold' : 'hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-notion-text-mutedLight dark:text-notion-text-mutedDark'}`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <div className="flex items-center gap-1.5 overflow-hidden">
        <span className="shrink-0 text-sm">{doc.emoji || '📄'}</span>
        <span className="truncate">{doc.title}</span>
      </div>
    </div>
  );
};

export default FolderTree;
