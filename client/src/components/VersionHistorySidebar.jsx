import React, { useEffect, useState } from 'react';
import { History, X, Plus, Loader, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import VersionCard from './VersionCard.jsx';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

const VersionHistorySidebar = ({ 
  documentId, 
  isOpen, 
  onClose, 
  onPreviewVersion, 
  onRestoreTrigger, 
  activePreviewId = null,
  readOnly = false
}) => {
  const { showToast } = useToast();

  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [description, setDescription] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchVersions = async (pageNum = 1) => {
    if (!documentId) return;
    try {
      setLoading(true);
      const res = await api.get(`/documents/${documentId}/versions?page=${pageNum}&limit=5`);
      if (res.success && res.data) {
        setVersions(res.data);
        setPage(res.pagination.page);
        setTotalPages(res.pagination.pages);
      }
    } catch (err) {
      console.error('Error fetching version history:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVersions(1);
    }
  }, [documentId, isOpen]);

  const handleCreateSnapshot = async (e) => {
    e.preventDefault();
    if (readOnly) {
      showToast('Viewers cannot create version snapshots', 'error');
      return;
    }

    try {
      setCreating(true);
      const res = await api.post(`/documents/${documentId}/versions`, {
        description: description.trim() || undefined
      });
      if (res.success && res.data) {
        showToast('Snapshot created successfully', 'success');
        setDescription('');
        fetchVersions(1); // reload first page
      }
    } catch (err) {
      showToast(err.message || 'Error creating snapshot', 'error');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-notion-border-light dark:border-notion-border-dark bg-white dark:bg-notion-bg-sidebarDark flex flex-col h-full shrink-0 select-none text-left z-30">
      {/* Header */}
      <div className="p-3.5 border-b border-notion-border-light dark:border-notion-border-dark flex justify-between items-center shrink-0">
        <div className="flex items-center gap-1.5">
          <History className="w-4 h-4 text-purple-500 animate-spin-slow" />
          <h2 className="text-xs font-bold text-notion-text-light dark:text-notion-text-dark uppercase tracking-wider">
            Version History
          </h2>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-notion-text-mutedLight">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Manual Snapshot Form */}
      {!readOnly && (
        <form onSubmit={handleCreateSnapshot} className="p-3 border-b border-notion-border-light dark:border-notion-border-dark space-y-2 shrink-0 bg-purple-500/5 dark:bg-purple-950/5">
          <input
            type="text"
            placeholder="Version description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white dark:bg-notion-bg-dark border border-notion-border-light dark:border-notion-border-dark text-[10px] rounded-lg px-2 py-1 outline-none text-notion-text-light dark:text-notion-text-dark"
          />
          <button
            type="submit"
            disabled={creating}
            className="w-full flex items-center justify-center gap-1 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 text-[10px] font-bold"
          >
            {creating ? (
              <Loader className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Save Snapshot
          </button>
        </form>
      )}

      {/* List content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {loading && versions.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center text-xs text-notion-text-mutedLight dark:text-notion-text-mutedDark py-12">
            No snapshots found. Automatic versions will be saved as you collaborate.
          </div>
        ) : (
          versions.map((v, index) => (
            <VersionCard
              key={v._id}
              version={v}
              onPreview={onPreviewVersion}
              onRestore={onRestoreTrigger}
              isCurrent={index === 0 && page === 1 && !activePreviewId}
              isPreviewing={activePreviewId === v._id}
            />
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-notion-border-light dark:border-notion-border-dark flex justify-between items-center shrink-0 text-[10px]">
          <button
            disabled={page === 1 || loading}
            onClick={() => fetchVersions(page - 1)}
            className="p-1 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-notion-text-mutedLight disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-notion-text-mutedLight font-semibold">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages || loading}
            onClick={() => fetchVersions(page + 1)}
            className="p-1 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-notion-text-mutedLight disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default VersionHistorySidebar;
