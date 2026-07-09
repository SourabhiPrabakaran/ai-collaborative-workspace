import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Inbox, Plus, X } from 'lucide-react';
import api from '../services/api.js';
import Sidebar from '../components/Sidebar.jsx';
import Navbar from '../components/Navbar.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import DialogModal from '../components/DialogModal.jsx';
import CollabEditor from '../components/Editor/CollabEditor.jsx';
import { useDebounce } from '../hooks/useDebounce.js';
import { useToast } from '../context/ToastContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import CommentSidebar from '../components/CommentSidebar.jsx';

const WorkspacePage = () => {
  const { workspaceId, documentId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { joinDocument, leaveDocument, connected, onlineUsers } = useSocket();

  const [workspace, setWorkspace] = useState(null);
  const [tree, setTree] = useState({ folders: [], documents: [] });
  const [documentDetails, setDocumentDetails] = useState(null);

  // Comments & Highlights states
  const [commentSidebarOpen, setCommentSidebarOpen] = useState(false);
  const [activeCommentHighlightId, setActiveCommentHighlightId] = useState(null);
  const [commentsVersion, setCommentsVersion] = useState(0);

  const [loading, setLoading] = useState(true);
  const [docLoading, setDocLoading] = useState(false);

  // Editor states
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('📄');

  // Search overlay states
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Archive modal states
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archivedDocs, setArchivedDocs] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [docPermission, setDocPermission] = useState('write');

  // Interactive Modals
  const [activeModal, setActiveModal] = useState(null); // 'create-folder' | 'delete-doc'
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [docToDeleteId, setDocToDeleteId] = useState(null);

  // Auto-save debouncing
  const debouncedTitle = useDebounce(title, 1200);
  const debouncedSearch = useDebounce(searchQuery, 400);
  const initialFetchRef = useRef(true);

  // 1. Initial Workspace Fetching
  const fetchWorkspaceAndTree = async () => {
    try {
      const [wsResponse, treeResponse] = await Promise.all([
        api.get(`/workspaces/${workspaceId}`),
        api.get(`/folders/workspace/${workspaceId}`)
      ]);

      if (wsResponse.success) setWorkspace(wsResponse.data);
      if (treeResponse.success) setTree(treeResponse.data);
    } catch (err) {
      showToast(err.message || 'Error loading workspace assets', 'error');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceAndTree();
    }
  }, [workspaceId]);

  // 2. Fetch Active Document
  const fetchDocument = async () => {
    if (!documentId) {
      setDocumentDetails(null);
      return;
    }

    setDocLoading(true);
    try {
      const response = await api.get(`/documents/${documentId}`);
      if (response.success && response.data) {
        const doc = response.data;
        setDocumentDetails(doc);
        setDocPermission(response.permission || 'write');
        initialFetchRef.current = true; // prevent save triggers on load
        setTitle(doc.title);
        setEmoji(doc.emoji || '📄');
      }
    } catch (err) {
      showToast(err.message || 'Error loading document content', 'error');
      setDocumentDetails(null);
    } finally {
      setDocLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  // 3. Document Auto-Save Logic (Title & Emoji only)
  const handleAutoSave = async () => {
    if (docPermission === 'read') return;
    if (initialFetchRef.current) {
      initialFetchRef.current = false;
      return;
    }

    if (!documentId || !documentDetails) return;

    try {
      await api.put(`/documents/${documentId}`, {
        title: title.trim() || 'Untitled Document',
        emoji
      });

      // Optimistically update document title/emoji inside tree state
      if (title.trim() !== documentDetails.title || emoji !== documentDetails.emoji) {
        const treeResponse = await api.get(`/folders/workspace/${workspaceId}`);
        if (treeResponse.success) setTree(treeResponse.data);
        setDocumentDetails(prev => ({ ...prev, title, emoji }));
      }
    } catch (err) {
      console.error('Auto-save error:', err.message);
    }
  };

  useEffect(() => {
    handleAutoSave();
  }, [debouncedTitle, emoji]);

  // 4. Folder & Document Creation
  const handleCreateFolder = (parentFolderId = null) => {
    setSelectedFolderId(parentFolderId);
    setActiveModal('create-folder');
  };

  const handleCreateFolderSubmit = async (folderName) => {
    setActiveModal(null);
    if (!folderName || !folderName.trim()) return;

    try {
      const response = await api.post('/folders', {
        name: folderName.trim(),
        workspace: workspaceId,
        parentFolder: selectedFolderId
      });

      if (response.success) {
        showToast(`Folder "${folderName}" created!`, 'success');
        fetchWorkspaceAndTree();
      }
    } catch (err) {
      showToast(err.message || 'Error creating folder', 'error');
    }
  };

  const handleCreateDocument = async (folderId = null) => {
    try {
      const response = await api.post('/documents', {
        title: 'Untitled Document',
        workspace: workspaceId,
        folder: folderId
      });

      if (response.success && response.data) {
        showToast('Document created successfully', 'success');
        const treeResponse = await api.get(`/folders/workspace/${workspaceId}`);
        if (treeResponse.success) setTree(treeResponse.data);
        navigate(`/workspace/${workspaceId}/document/${response.data._id}`);
      }
    } catch (err) {
      showToast(err.message || 'Error creating document', 'error');
    }
  };

  // 5. Document Archiving, Restoring, and Permanent Deletion
  const handleArchiveDocument = async () => {
    if (!documentId) return;
    try {
      const response = await api.post(`/documents/${documentId}/archive`);
      if (response.success) {
        showToast('Document archived successfully', 'info');
        const treeResponse = await api.get(`/folders/workspace/${workspaceId}`);
        if (treeResponse.success) setTree(treeResponse.data);
        navigate(`/workspace/${workspaceId}`);
      }
    } catch (err) {
      showToast(err.message || 'Error archiving document', 'error');
    }
  };

  const handleRestoreDocument = async (docToRestoreId) => {
    try {
      const response = await api.post(`/documents/${docToRestoreId}/restore`);
      if (response.success) {
        showToast('Document restored successfully', 'success');
        setArchivedDocs(prev => prev.filter(d => d._id !== docToRestoreId));
        const treeResponse = await api.get(`/folders/workspace/${workspaceId}`);
        if (treeResponse.success) setTree(treeResponse.data);
        navigate(`/workspace/${workspaceId}/document/${docToRestoreId}`);
        setArchiveOpen(false);
      }
    } catch (err) {
      showToast(err.message || 'Error restoring document', 'error');
    }
  };

  const handlePermanentDeleteTrigger = (docId) => {
    setDocToDeleteId(docId);
    setActiveModal('delete-doc');
  };

  const handlePermanentDeleteSubmit = async () => {
    setActiveModal(null);
    if (!docToDeleteId) return;

    try {
      const response = await api.delete(`/documents/${docToDeleteId}`);
      if (response.success) {
        showToast('Document permanently deleted', 'success');
        setArchivedDocs(prev => prev.filter(d => d._id !== docToDeleteId));
        const treeResponse = await api.get(`/folders/workspace/${workspaceId}`);
        if (treeResponse.success) setTree(treeResponse.data);
        
        if (documentId === docToDeleteId) {
          navigate(`/workspace/${workspaceId}`);
        }
      }
    } catch (err) {
      showToast(err.message || 'Error deleting document', 'error');
    }
  };

  // 6. Debounced Search API Trigger
  useEffect(() => {
    const triggerSearch = async () => {
      if (!debouncedSearch.trim()) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      try {
        const response = await api.get(`/documents/search?workspaceId=${workspaceId}&q=${debouncedSearch}`);
        if (response.success) {
          setSearchResults(response.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    };

    triggerSearch();
  }, [debouncedSearch]);

  // 7. Load Real Archived Documents list
  const loadArchiveList = async () => {
    setArchiveLoading(true);
    try {
      const response = await api.get(`/documents/archived/workspace/${workspaceId}`);
      if (response.success && response.data) {
        setArchivedDocs(response.data);
      }
    } catch (err) {
      showToast(err.message || 'Could not load archive list', 'error');
    } finally {
      setArchiveLoading(false);
    }
  };

  useEffect(() => {
    if (archiveOpen) {
      loadArchiveList();
    }
  }, [archiveOpen]);

  if (loading) {
    return <LoadingScreen message="Opening workspace..." />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-notion-bg-light dark:bg-notion-bg-dark text-notion-text-light dark:text-notion-text-dark transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar
        workspace={workspace}
        tree={tree}
        activeDocId={documentId}
        onCreateFolder={handleCreateFolder}
        onCreateDocument={handleCreateDocument}
        onSearchOpen={() => setSearchOpen(true)}
        onArchiveListOpen={() => setArchiveOpen(true)}
        onRefresh={fetchWorkspaceAndTree}
      />

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {documentDetails ? (
          <>
            {/* Top Toolbar */}
            <Navbar
              doc={documentDetails}
              onArchive={handleArchiveDocument}
              onRestore={() => handleRestoreDocument(documentId)}
              onDelete={() => handlePermanentDeleteTrigger(documentId)}
              connected={connected}
              onlineUsers={onlineUsers}
            />

            {/* Editor Area with Sidebar wrapper */}
            <div className="flex-1 flex overflow-hidden min-h-0 w-full">
              <div className="flex-1 overflow-y-auto px-16 py-10 max-w-4xl w-full mx-auto space-y-6">
                {docLoading ? (
                  <div className="space-y-4 animate-pulse pt-10">
                    <div className="w-16 h-16 bg-notion-border-light dark:bg-notion-border-dark rounded-xl"></div>
                    <div className="w-3/4 h-10 bg-notion-border-light dark:bg-notion-border-dark rounded-lg"></div>
                    <div className="w-full h-40 bg-notion-border-light dark:bg-notion-border-dark rounded-lg"></div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    {/* Emoji & Title Selectors */}
                    <div className="flex items-center gap-4">
                      <select
                        value={emoji}
                        aria-label="Select Document Emoji"
                        onChange={(e) => setEmoji(e.target.value)}
                        disabled={docPermission === 'read'}
                        className="text-4xl p-1 bg-transparent hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark rounded-xl cursor-pointer focus:outline-none select-none disabled:cursor-not-allowed"
                      >
                        {['📄', '📝', '💡', '🎨', '💼', '🚀', '📅', '🔐', '💻', '💡', '⚠️'].map(em => (
                          <option key={em} value={em}>{em}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={docPermission === 'read'}
                        className="flex-1 bg-transparent text-3xl font-bold tracking-tight focus:outline-none border-b border-transparent focus:border-notion-border-light dark:focus:border-notion-border-dark pb-1 disabled:cursor-not-allowed"
                        placeholder="Untitled Document"
                        aria-label="Document Title"
                      />
                    </div>

                    {/* TipTap Rich Text Editor */}
                    <div className="mt-6">
                      <CollabEditor 
                        documentId={documentId} 
                        readOnly={docPermission === 'read'} 
                        onHighlightClick={(commentIds) => {
                          setActiveCommentHighlightId(commentIds);
                          setCommentSidebarOpen(true);
                        }}
                        onCommentCreated={(id) => {
                          setCommentsVersion(prev => prev + 1);
                          setActiveCommentHighlightId(id);
                          setCommentSidebarOpen(true);
                        }}
                        allowViewerComments={documentDetails?.allowViewerComments}
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Comment Sidebar */}
              <CommentSidebar
                documentId={documentId}
                isOpen={commentSidebarOpen}
                onClose={() => setCommentSidebarOpen(false)}
                activeHighlightId={activeCommentHighlightId}
                readOnly={docPermission === 'read'}
                allowViewerComments={documentDetails?.allowViewerComments}
                commentsVersion={commentsVersion}
              />
            </div>
          </>
        ) : (
          /* Empty/No Active Doc Splash Screen */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-notion-bg-light dark:bg-notion-bg-dark transition-colors duration-200 select-none">
            <span className="text-5xl mb-4">📄</span>
            <h2 className="text-base font-semibold mb-1">No Document Selected</h2>
            <p className="text-xs text-notion-text-mutedLight dark:text-notion-text-mutedDark max-w-xs mb-4">
              Select an existing document from the sidebar navigation hierarchy or create a new document to start drafting.
            </p>
            <button
              onClick={() => handleCreateDocument(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-notion-text-light dark:bg-notion-text-dark text-white dark:text-notion-bg-dark rounded-md text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Document
            </button>
          </div>
        )}
      </div>

      {/* Quick Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
              className="absolute inset-0 bg-black/35 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="relative max-w-lg w-full bg-white dark:bg-notion-bg-sidebarDark border border-notion-border-light dark:border-notion-border-dark rounded-xl shadow-lg z-10 overflow-hidden text-xs"
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b border-notion-border-light dark:border-notion-border-dark">
                <Search className="w-4 h-4 text-notion-text-mutedLight" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search document titles or contents..."
                  className="flex-1 bg-transparent text-sm text-notion-text-light dark:text-notion-text-dark focus:outline-none"
                  autoFocus
                  aria-label="Search documents"
                />
                <button onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}>
                  <X className="w-4 h-4 text-notion-text-mutedLight" />
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto p-2">
                {searchLoading ? (
                  <div className="text-center py-6 text-notion-text-mutedLight animate-pulse">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-6 text-notion-text-mutedLight">
                    {searchQuery ? 'No documents found' : 'Type to search documents...'}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {searchResults.map(result => (
                      <div
                        key={result._id}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery('');
                          setSearchResults([]);
                          navigate(`/workspace/${workspaceId}/document/${result._id}`);
                        }}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{result.emoji || '📄'}</span>
                          <span className="font-medium">{result.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Archived Documents List Modal */}
      <AnimatePresence>
        {archiveOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setArchiveOpen(false)}
              className="absolute inset-0 bg-black/35 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-md w-full bg-white dark:bg-notion-bg-sidebarDark border border-notion-border-light dark:border-notion-border-dark p-6 rounded-xl shadow-lg z-10 text-xs"
            >
              <button
                onClick={() => setArchiveOpen(false)}
                className="absolute top-4 right-4 text-notion-text-mutedLight hover:opacity-80"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-sm font-bold mb-4 flex items-center gap-1.5 select-none">
                <Inbox className="w-4 h-4 text-notion-text-mutedLight" />
                Archived Documents
              </h2>

              <div className="max-h-[280px] overflow-y-auto space-y-2 mt-2 pr-1">
                {archiveLoading ? (
                  <div className="text-center py-6 text-notion-text-mutedLight animate-pulse">Loading archives...</div>
                ) : archivedDocs.length === 0 ? (
                  <div className="text-center py-6 text-notion-text-mutedLight italic select-none">
                    No archived documents found in this workspace.
                  </div>
                ) : (
                  archivedDocs.map(doc => (
                    <div
                      key={doc._id}
                      className="flex items-center justify-between p-2 border border-notion-border-light dark:border-notion-border-dark rounded-lg bg-notion-bg-sidebarLight/20 dark:bg-notion-bg-sidebarDark/20"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-sm shrink-0">{doc.emoji || '📄'}</span>
                        <span className="font-medium truncate">{doc.title}</span>
                      </div>
                      <div className="flex gap-2 shrink-0 ml-4">
                        <button
                          onClick={() => handleRestoreDocument(doc._id)}
                          className="px-2 py-1 bg-blue-500/10 text-blue-500 hover:bg-blue-500/25 rounded font-medium transition-colors"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDeleteTrigger(doc._id)}
                          className="px-2 py-1 bg-red-500/10 text-red-500 hover:bg-red-500/25 rounded font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Modals */}
      <DialogModal
        isOpen={activeModal === 'create-folder'}
        type="prompt"
        title="Create Folder"
        message="Enter a name for the new folder:"
        placeholder="Folder name..."
        onSubmit={handleCreateFolderSubmit}
        onClose={() => setActiveModal(null)}
      />

      <DialogModal
        isOpen={activeModal === 'delete-doc'}
        type="confirm"
        title="Permanently Delete Document"
        message="Are you sure you want to permanently delete this document? This action cannot be undone."
        onSubmit={handlePermanentDeleteSubmit}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
};

export default WorkspacePage;
