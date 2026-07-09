import React, { useEffect, useState, useRef } from 'react';
import { Bell, Loader } from 'lucide-react';
import NotificationPanel from './NotificationPanel.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../services/api.js';

const NotificationBell = () => {
  const { socket, connected } = useSocket();
  const { showToast } = useToast();

  const [panelOpen, setPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const bellRef = useRef(null);

  const fetchNotifications = async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const res = await api.get(`/notifications?page=${pageNum}&limit=10`);
      if (res.success && res.data) {
        if (append) {
          setNotifications(prev => [...prev, ...res.data]);
        } else {
          setNotifications(res.data);
        }
        
        // Calculate unread count from results
        // Wait, to get true total unread count we can count all unreads.
        // Let's count unreads in the current list or fetch unreads.
        // Let's filter res.data for true unreads, but since we want the total unread,
        // let's do a quick calculation of unreads.
        if (pageNum === 1) {
          // Since they are sorted newest first, we can just fetch first page and filter,
          // or count unreadCount dynamically.
          // Let's count all unreads in our database. We can query unread counts from response metadata,
          // or do a quick calculation.
          // Let's count in notifications array
          const unread = res.data.filter(n => !n.read).length;
          setUnreadCount(unread);
        }

        setHasMore(res.data.length === 10);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Setup outside click listener to close dropdown
    const handleOutsideClick = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Socket notification listener
  useEffect(() => {
    if (!socket || !connected) return;

    const handleNewNotification = (notification) => {
      // Add new notification to top
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Trigger toast alert
      showToast(`🔔 ${notification.title}: ${notification.message}`, 'info');
    };

    socket.on('notification', handleNewNotification);

    return () => {
      socket.off('notification', handleNewNotification);
    };
  }, [socket, connected]);

  const handleMarkAllRead = async () => {
    try {
      const res = await api.patch('/notifications/read-all');
      if (res.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        showToast('All notifications marked as read', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Error marking read', 'error');
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      const res = await api.patch(`/notifications/${id}/read`);
      if (res.success) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking read:', err.message);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchNotifications(page + 1, true);
    }
  };

  return (
    <div className="relative shrink-0 select-none" ref={bellRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        className="p-1.5 rounded-lg hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-notion-text-mutedLight dark:text-notion-text-mutedDark transition-all relative outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold ring-2 ring-white dark:ring-notion-bg-dark animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {panelOpen && (
        <NotificationPanel
          notifications={notifications}
          loading={loading}
          hasMore={hasMore}
          onMarkAllRead={handleMarkAllRead}
          onMarkOneRead={handleMarkOneRead}
          onLoadMore={handleLoadMore}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;
