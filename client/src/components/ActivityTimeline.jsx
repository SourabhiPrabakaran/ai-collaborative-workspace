import React, { useEffect, useState } from 'react';
import { Timeline } from 'lucide-react'; // Wait, let's use ListCollapse or History
import { Activity as ActivityIcon, X, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import ActivityItem from './ActivityItem.jsx';
import api from '../services/api.js';

const ActivityTimeline = ({ documentId, isOpen, onClose }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchActivity = async (pageNum = 1) => {
    if (!documentId) return;
    try {
      setLoading(true);
      const res = await api.get(`/documents/${documentId}/activity?page=${pageNum}&limit=10`);
      if (res.success && res.data) {
        setActivities(res.data);
        setPage(res.pagination.page);
        setTotalPages(res.pagination.pages);
      }
    } catch (err) {
      console.error('Error fetching activity timeline:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchActivity(1);
    }
  }, [documentId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-notion-border-light dark:border-notion-border-dark bg-white dark:bg-notion-bg-sidebarDark flex flex-col h-full shrink-0 select-none text-left z-30">
      {/* Header */}
      <div className="p-3.5 border-b border-notion-border-light dark:border-notion-border-dark flex justify-between items-center shrink-0">
        <div className="flex items-center gap-1.5">
          <ActivityIcon className="w-4 h-4 text-purple-500" />
          <h2 className="text-xs font-bold text-notion-text-light dark:text-notion-text-dark uppercase tracking-wider">
            Workspace Activity
          </h2>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-notion-text-mutedLight">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && activities.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="w-6 h-6 animate-spin text-purple-500" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center text-xs text-notion-text-mutedLight dark:text-notion-text-mutedDark py-12">
            No activity logged yet in this workspace.
          </div>
        ) : (
          <div className="relative border-l-2 border-notion-border-light dark:border-notion-border-dark/60 ml-3 pl-4 space-y-5">
            {activities.map((activity) => (
              <div key={activity._id} className="relative">
                {/* Visual Connector Dot */}
                <span className="absolute -left-[23px] top-1.5 w-2 h-2 rounded-full bg-purple-500 ring-4 ring-white dark:ring-notion-bg-sidebarDark" />
                <ActivityItem activity={activity} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-notion-border-light dark:border-notion-border-dark flex justify-between items-center shrink-0 text-[10px]">
          <button
            disabled={page === 1 || loading}
            onClick={() => fetchActivity(page - 1)}
            className="p-1 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-notion-text-mutedLight disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-notion-text-mutedLight font-semibold">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages || loading}
            onClick={() => fetchActivity(page + 1)}
            className="p-1 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-notion-text-mutedLight disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityTimeline;
