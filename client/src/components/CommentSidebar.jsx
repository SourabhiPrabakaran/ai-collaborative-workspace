import React, { useEffect, useState } from 'react';
import { 
  MessageSquare, X, Send, CheckCircle2, RotateCcw, Trash2, Edit2, CornerDownRight, Navigation
} from 'lucide-react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const CommentSidebar = ({ 
  documentId, 
  isOpen, 
  onClose, 
  activeHighlightId = null, 
  readOnly = false,
  allowViewerComments = false,
  commentsVersion = 0
}) => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [replyTexts, setReplyTexts] = useState({}); // parentCommentId -> text
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchComments = async (pageNum = 1, append = false) => {
    if (!documentId) return;
    try {
      setLoading(true);
      const res = await api.get(`/comments/${documentId}?page=${pageNum}&limit=50`);
      if (res.success && res.data) {
        if (append) {
          setComments(prev => [...prev, ...res.data]);
        } else {
          setComments(res.data);
        }
        setHasMore(res.data.length === 50);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Error fetching comments:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchComments(1, false);
    }
  }, [documentId, isOpen, commentsVersion]);

  // Reply submit handler
  const handlePostReply = async (e, parentId) => {
    e.preventDefault();
    const text = replyTexts[parentId];
    if (!text || !text.trim()) return;

    // Viewers commenting permission check
    if (readOnly && !allowViewerComments) {
      showToast('Viewers are not permitted to comment on this document', 'error');
      return;
    }

    try {
      const res = await api.post(`/comments/${documentId}`, {
        content: text.trim(),
        parentComment: parentId
      });
      if (res.success && res.data) {
        setComments(prev => [...prev, res.data]);
        setReplyTexts(prev => ({ ...prev, [parentId]: '' }));
        showToast('Reply posted!', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Error posting reply', 'error');
    }
  };

  // Edit comment handler
  const handleEditSubmit = async (e, commentId) => {
    e.preventDefault();
    if (!editText.trim()) return;

    try {
      const res = await api.patch(`/comments/${commentId}`, { content: editText.trim() });
      if (res.success && res.data) {
        setComments(prev => prev.map(c => c._id === commentId ? { ...c, content: res.data.content } : c));
        setEditingId(null);
        setEditText('');
        showToast('Comment updated', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Error updating comment', 'error');
    }
  };

  // Resolve comment thread
  const handleResolveToggle = async (commentId, currentResolved) => {
    try {
      const res = await api.patch(`/comments/${commentId}/resolve`, { resolved: !currentResolved });
      if (res.success) {
        setComments(prev => prev.map(c => c._id === commentId ? { ...c, resolved: !currentResolved } : c));
        showToast(!currentResolved ? 'Thread resolved' : 'Thread reopened', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Error resolving thread', 'error');
    }
  };

  // Soft delete comment
  const handleDeleteComment = async (commentId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this comment? Replies will remain intact.');
    if (!confirmDelete) return;

    try {
      const res = await api.delete(`/comments/${commentId}`);
      if (res.success && res.data) {
        setComments(prev => prev.map(c => c._id === commentId ? { ...c, isDeleted: true, content: 'This comment was deleted.' } : c));
        showToast('Comment deleted', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Error deleting comment', 'error');
    }
  };

  // Jump to highlight in TipTap
  const handleJumpToText = (commentId) => {
    const element = document.querySelector(`span[data-comment-id*="${commentId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-yellow-300', 'animate-pulse');
      setTimeout(() => {
        element.classList.remove('bg-yellow-300', 'animate-pulse');
      }, 2000);
    } else {
      showToast('Comment anchor text not found (may have been deleted)', 'warning');
    }
  };

  if (!isOpen) return null;

  // Build comment trees: separate parent comments and replies
  const parentComments = comments.filter(c => !c.parentComment);
  const replies = comments.filter(c => c.parentComment);

  // Filter resolved threads
  const filteredParents = parentComments.filter(c => showResolved ? c.resolved : !c.resolved);

  return (
    <div className="w-80 border-l border-notion-border-light dark:border-notion-border-dark bg-white dark:bg-notion-bg-sidebarDark flex flex-col h-full shrink-0 select-none text-left z-30">
      {/* Header */}
      <div className="p-3.5 border-b border-notion-border-light dark:border-notion-border-dark flex justify-between items-center shrink-0">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-purple-500" />
          <h2 className="text-xs font-bold text-notion-text-light dark:text-notion-text-dark uppercase tracking-wider">
            Comments
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className={`text-[9px] font-bold px-2 py-0.5 rounded transition-colors ${
              showResolved 
                ? 'bg-purple-500/10 text-purple-500' 
                : 'bg-notion-hover-light dark:bg-notion-hover-dark text-notion-text-mutedLight dark:text-notion-text-mutedDark'
            }`}
          >
            {showResolved ? 'Showing Resolved' : 'Active Threads'}
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-notion-text-mutedLight">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Threads list */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {filteredParents.length === 0 ? (
          <div className="text-center text-xs text-notion-text-mutedLight dark:text-notion-text-mutedDark py-12">
            No comments found. Select text to highlight and add a comment.
          </div>
        ) : (
          filteredParents.map((parent) => {
            const threadReplies = replies.filter(r => r.parentComment === parent._id);
            const isHighlighted = activeHighlightId && activeHighlightId.split(',').includes(parent._id);

            return (
              <div 
                key={parent._id}
                className={`p-3 rounded-xl border transition-all space-y-2.5 ${
                  isHighlighted 
                    ? 'border-purple-500 bg-purple-500/5 dark:bg-purple-950/10 shadow-sm' 
                    : 'border-notion-border-light dark:border-notion-border-dark bg-notion-hover-light/20 dark:bg-notion-hover-dark/10'
                }`}
              >
                {/* Parent Comment Card */}
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5.5 h-5.5 rounded-full bg-purple-500/10 text-purple-500 font-bold flex items-center justify-center text-[9px] border border-purple-500/20 shrink-0">
                        {parent.author?.fullName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-notion-text-light dark:text-notion-text-dark">
                          {parent.author?.fullName}
                        </div>
                        <div className="text-[7px] text-notion-text-mutedLight/60">
                          {new Date(parent.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Jump to Anchor text link */}
                      <button
                        onClick={() => handleJumpToText(parent._id)}
                        className="p-1 text-notion-text-mutedLight hover:text-purple-500 hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark rounded transition-colors"
                        title="Jump to highlighted text"
                      >
                        <Navigation className="w-3 h-3" />
                      </button>

                      {/* Resolve toggle */}
                      <button
                        onClick={() => handleResolveToggle(parent._id, parent.resolved)}
                        className={`p-1 rounded transition-colors ${
                          parent.resolved 
                            ? 'text-green-500 hover:bg-green-500/10' 
                            : 'text-notion-text-mutedLight hover:text-green-500 hover:bg-green-500/10'
                        }`}
                        title={parent.resolved ? 'Reopen thread' : 'Resolve thread'}
                      >
                        {parent.resolved ? <RotateCcw className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                      </button>

                      {/* Delete comment */}
                      {!parent.isDeleted && (parent.author?._id === currentUser._id || !readOnly) && (
                        <button
                          onClick={() => handleDeleteComment(parent._id)}
                          className="p-1 text-notion-text-mutedLight hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                          title="Delete Comment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Content block / Edit Mode */}
                  {editingId === parent._id ? (
                    <form onSubmit={(e) => handleEditSubmit(e, parent._id)} className="flex gap-1 items-center pt-1.5">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 bg-white dark:bg-notion-bg-dark border border-notion-border-light dark:border-notion-border-dark text-[10px] rounded px-2 py-0.5 outline-none"
                      />
                      <button type="submit" className="px-2 py-0.5 bg-purple-500 text-white rounded text-[9px] font-bold">
                        Save
                      </button>
                    </form>
                  ) : (
                    <div className="text-[10px] text-notion-text-light dark:text-notion-text-dark leading-relaxed pl-7">
                      {parent.isDeleted ? (
                        <span className="italic text-notion-text-mutedLight">{parent.content}</span>
                      ) : (
                        parent.content
                      )}
                      {!parent.isDeleted && parent.author?._id === currentUser._id && (
                        <button
                          onClick={() => { setEditingId(parent._id); setEditText(parent.content); }}
                          className="ml-2 text-[8px] text-purple-500 hover:underline inline-flex items-center gap-0.5 font-semibold"
                        >
                          <Edit2 className="w-2 h-2" /> Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Nested Replies List */}
                {threadReplies.length > 0 && (
                  <div className="pl-6 border-l-2 border-purple-500/20 space-y-2 mt-2">
                    {threadReplies.map((reply) => (
                      <div key={reply._id} className="space-y-0.5 text-[9px] relative">
                        <div className="flex justify-between items-start gap-1">
                          <div className="flex items-center gap-1">
                            <CornerDownRight className="w-2.5 h-2.5 text-purple-500 shrink-0" />
                            <div className="w-4.5 h-4.5 rounded-full bg-purple-500/10 text-purple-500 font-bold flex items-center justify-center text-[7px] border border-purple-500/20 shrink-0">
                              {reply.author?.fullName?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="font-bold text-notion-text-light dark:text-notion-text-dark shrink-0">
                              {reply.author?.fullName}
                            </span>
                            <span className="text-[6px] text-notion-text-mutedLight/60">
                              {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {!reply.isDeleted && (reply.author?._id === currentUser._id || !readOnly) && (
                            <button
                              onClick={() => handleDeleteComment(reply._id)}
                              className="text-notion-text-mutedLight hover:text-red-500 rounded p-0.5"
                              title="Delete Reply"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>

                        {editingId === reply._id ? (
                          <form onSubmit={(e) => handleEditSubmit(e, reply._id)} className="flex gap-1 items-center pl-6 pt-1">
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="flex-1 bg-white dark:bg-notion-bg-dark border border-notion-border-light dark:border-notion-border-dark text-[9px] rounded px-1.5 py-0.5 outline-none"
                            />
                            <button type="submit" className="px-1.5 py-0.5 bg-purple-500 text-white rounded text-[8px] font-bold">
                              Save
                            </button>
                          </form>
                        ) : (
                          <div className="pl-6 text-notion-text-light dark:text-notion-text-dark break-words">
                            {reply.isDeleted ? (
                              <span className="italic text-notion-text-mutedLight">{reply.content}</span>
                            ) : (
                              reply.content
                            )}
                            {!reply.isDeleted && reply.author?._id === currentUser._id && (
                              <button
                                onClick={() => { setEditingId(reply._id); setEditText(reply.content); }}
                                className="ml-2 text-[7px] text-purple-500 hover:underline inline-flex items-center gap-0.5 font-semibold"
                              >
                                <Edit2 className="w-2 h-2" /> Edit
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                {!parent.resolved && (!readOnly || allowViewerComments) && (
                  <form 
                    onSubmit={(e) => handlePostReply(e, parent._id)}
                    className="flex gap-1.5 items-center mt-2 pt-2 border-t border-notion-border-light/45 dark:border-notion-border-dark/45"
                  >
                    <input
                      type="text"
                      placeholder="Reply..."
                      value={replyTexts[parent._id] || ''}
                      onChange={(e) => setReplyTexts(prev => ({ ...prev, [parent._id]: e.target.value }))}
                      className="flex-1 bg-white dark:bg-notion-bg-dark border border-notion-border-light dark:border-notion-border-dark text-[9px] rounded-lg px-2.5 py-1 outline-none text-notion-text-light dark:text-notion-text-dark"
                    />
                    <button
                      type="submit"
                      disabled={!replyTexts[parent._id]?.trim()}
                      className="p-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                    >
                      <Send className="w-2.5 h-2.5" />
                    </button>
                  </form>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CommentSidebar;
