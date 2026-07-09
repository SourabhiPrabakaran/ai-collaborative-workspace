import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, MessageSquare, ShieldAlert, Award, FileText, Globe, Check, Eye
} from 'lucide-react';

const NotificationPanel = ({
  notifications = [],
  loading = false,
  hasMore = false,
  onMarkAllRead,
  onMarkOneRead,
  onLoadMore,
  onClose
}) => {
  
  const getIcon = (type) => {
    switch (type) {
      case 'INVITE':
        return <Users className="w-3.5 h-3.5 text-blue-500" />;
      case 'MENTION':
      case 'COMMENT_REPLY':
        return <MessageSquare className="w-3.5 h-3.5 text-purple-500" />;
      case 'ROLE_CHANGED':
        return <ShieldAlert className="w-3.5 h-3.5 text-orange-500" />;
      case 'OWNER_TRANSFER':
        return <Award className="w-3.5 h-3.5 text-yellow-500" />;
      case 'DOCUMENT_SHARED':
        return <FileText className="w-3.5 h-3.5 text-green-500" />;
      case 'PUBLIC_LINK_ENABLED':
      case 'PUBLIC_LINK_DISABLED':
        return <Globe className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-notion-text-mutedLight" />;
    }
  };

  return (
    <div className="absolute right-0 top-8 bg-white dark:bg-notion-bg-sidebarDark border border-notion-border-light dark:border-notion-border-dark p-3.5 rounded-xl shadow-lg z-50 w-72 sm:w-80 select-none text-left space-y-3">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-notion-border-light dark:border-notion-border-dark">
        <h3 className="text-xs font-bold text-notion-text-light dark:text-notion-text-dark uppercase tracking-wider">
          Notifications
        </h3>
        <button
          onClick={onMarkAllRead}
          className="text-[10px] text-purple-500 hover:text-purple-600 font-bold transition-colors flex items-center gap-1"
        >
          <Check className="w-3 h-3" />
          Mark all as read
        </button>
      </div>

      {/* Notifications List */}
      <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
        {notifications.length === 0 ? (
          <div className="text-center text-xs text-notion-text-mutedLight dark:text-notion-text-mutedDark py-6">
            All caught up! No notifications.
          </div>
        ) : (
          notifications.map((notification) => {
            const isUnread = !notification.read;

            return (
              <div
                key={notification._id}
                onClick={() => onMarkOneRead(notification._id)}
                className={`p-2.5 rounded-lg border transition-all flex gap-2.5 items-start relative cursor-pointer ${
                  isUnread 
                    ? 'bg-purple-500/5 dark:bg-purple-950/10 border-purple-500/20 hover:bg-purple-500/10' 
                    : 'bg-transparent border-transparent hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark/40'
                }`}
              >
                {/* Indicator dot */}
                {isUnread && (
                  <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-purple-500 rounded-full" />
                )}

                {/* Type Icon */}
                <div className="p-1.5 rounded-lg bg-notion-hover-light dark:bg-notion-hover-dark shrink-0">
                  {getIcon(notification.type)}
                </div>

                {/* Message Content */}
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-notion-text-light dark:text-notion-text-dark">
                    {notification.title}
                  </div>
                  <div className="text-[10px] text-notion-text-mutedLight dark:text-notion-text-mutedDark mt-0.5 leading-relaxed break-words">
                    {notification.message}
                  </div>
                  
                  {/* Link action if present */}
                  {notification.link && (
                    <Link
                      to={notification.link}
                      onClick={onClose}
                      className="inline-flex items-center gap-1 mt-1 text-[9px] text-purple-500 font-bold hover:underline"
                    >
                      <Eye className="w-3 h-3" />
                      View details
                    </Link>
                  )}
                  
                  <div className="text-[8px] text-notion-text-mutedLight/60 mt-1 select-none">
                    {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notification.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load More Control */}
      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="w-full text-center py-1 bg-notion-hover-light dark:bg-notion-hover-dark hover:opacity-85 text-[10px] font-semibold rounded-lg transition-all text-notion-text-mutedLight dark:text-notion-text-mutedDark"
        >
          {loading ? 'Loading...' : 'Load more notifications'}
        </button>
      )}
    </div>
  );
};

export default NotificationPanel;
