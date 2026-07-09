import React from 'react';
import { 
  FileText, Edit, FolderOpen, FolderClosed, MessageSquare, CheckCircle, 
  UserPlus, ShieldAlert, Globe, RotateCcw, History
} from 'lucide-react';

const ActivityItem = ({ activity }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'DOCUMENT_CREATED':
        return <FileText className="w-3.5 h-3.5 text-green-500" />;
      case 'DOCUMENT_RENAMED':
        return <Edit className="w-3.5 h-3.5 text-blue-500" />;
      case 'FOLDER_MOVED':
        return <FolderOpen className="w-3.5 h-3.5 text-orange-500" />;
      case 'FOLDER_RENAMED':
        return <FolderClosed className="w-3.5 h-3.5 text-orange-600" />;
      case 'COMMENT_CREATED':
        return <MessageSquare className="w-3.5 h-3.5 text-purple-500" />;
      case 'COMMENT_RESOLVED':
        return <CheckCircle className="w-3.5 h-3.5 text-green-600" />;
      case 'USER_INVITED':
        return <UserPlus className="w-3.5 h-3.5 text-blue-600" />;
      case 'ROLE_CHANGED':
        return <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />;
      case 'PUBLIC_LINK_ENABLED':
      case 'PUBLIC_LINK_DISABLED':
        return <Globe className="w-3.5 h-3.5 text-pink-500" />;
      case 'VERSION_RESTORED':
        return <RotateCcw className="w-3.5 h-3.5 text-yellow-500" />;
      case 'VERSION_CREATED':
        return <History className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-notion-text-mutedLight" />;
    }
  };

  const getMessage = (activity) => {
    const { type, details, user } = activity;
    const authorName = user?.fullName || 'Collaborator';

    switch (type) {
      case 'DOCUMENT_CREATED':
        return (
          <span>
            <strong className="font-bold">{authorName}</strong> created document <strong className="font-bold">"{details?.title || 'Untitled Document'}"</strong>
          </span>
        );
      case 'DOCUMENT_RENAMED':
        return (
          <span>
            <strong className="font-bold">{authorName}</strong> renamed document from <strong className="font-bold">"{details?.oldTitle}"</strong> to <strong className="font-bold">"{details?.newTitle}"</strong>
          </span>
        );
      case 'FOLDER_MOVED':
        return (
          <span>
            <strong className="font-bold">{authorName}</strong> moved folder <strong className="font-bold">"{details?.folderName}"</strong>
          </span>
        );
      case 'FOLDER_RENAMED':
        return (
          <span>
            <strong className="font-bold">{authorName}</strong> renamed folder from <strong className="font-bold">"{details?.oldName}"</strong> to <strong className="font-bold">"{details?.newName}"</strong>
          </span>
        );
      case 'COMMENT_CREATED':
        return (
          <span>
            <strong className="font-bold">{authorName}</strong> {details?.isReply ? 'replied' : 'added a comment'}: <span className="italic text-notion-text-mutedLight">"{details?.content}..."</span>
          </span>
        );
      case 'COMMENT_RESOLVED':
        return (
          <span>
            <strong className="font-bold">{authorName}</strong> {details?.resolved ? 'resolved' : 'reopened'} a comment thread
          </span>
        );
      case 'USER_INVITED':
        return (
          <span>
            <strong className="font-bold">{authorName}</strong> invited <strong className="font-bold">{details?.email}</strong> with role <strong className="font-bold">"{details?.role}"</strong>
          </span>
        );
      case 'ROLE_CHANGED':
        return (
          <span>
            <strong className="font-bold">{authorName}</strong> changed role of <strong className="font-bold">{details?.targetUserName || 'User'}</strong> to <strong className="font-bold">"{details?.role}"</strong>
          </span>
        );
      case 'PUBLIC_LINK_ENABLED':
        return (
          <span>
            <strong className="font-bold">{authorName}</strong> enabled public sharing link
          </span>
        );
      case 'PUBLIC_LINK_DISABLED':
        return (
          <span>
            <strong className="font-bold">{authorName}</strong> disabled public sharing link
          </span>
        );
      case 'VERSION_RESTORED':
        return (
          <span>
            <strong className="font-bold">{authorName}</strong> restored Version <strong className="font-bold">v{details?.versionNumber}</strong>
          </span>
        );
      case 'VERSION_CREATED':
        return (
          <span>
            <strong className="font-bold">{authorName}</strong> saved Version snapshot <strong className="font-bold">v{details?.versionNumber}</strong> {details?.autoSaved && '(Auto-saved)'}
          </span>
        );
      default:
        return <span>Performed {type.toLowerCase().replace(/_/g, ' ')}</span>;
    }
  };

  return (
    <div className="flex gap-2.5 items-start text-xs select-none">
      {/* Icon frame */}
      <div className="p-1.5 rounded-lg bg-notion-hover-light dark:bg-notion-hover-dark shrink-0 mt-0.5">
        {getIcon(activity.type)}
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-notion-text-light dark:text-notion-text-dark leading-relaxed leading-snug break-words">
          {getMessage(activity)}
        </div>
        <div className="text-[7.5px] text-notion-text-mutedLight/75 mt-0.5">
          {new Date(activity.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default ActivityItem;
