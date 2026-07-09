import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LogOut, Star, User, FolderClosed, PlusCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../services/api.js';
import LoadingScreen from '../components/LoadingScreen.jsx';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [workspaces, setWorkspaces] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceIcon, setNewWorkspaceIcon] = useState('💼');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const fetchWorkspaces = async () => {
    try {
      const [wsResponse, inviteResponse] = await Promise.all([
        api.get('/workspaces'),
        api.get('/workspaces/invitations')
      ]);
      if (wsResponse.success && wsResponse.data) {
        setWorkspaces(wsResponse.data);
      }
      if (inviteResponse.success && inviteResponse.data) {
        setInvitations(inviteResponse.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load workspaces', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (workspaceId) => {
    try {
      setLoading(true);
      const res = await api.post(`/workspaces/${workspaceId}/accept`);
      if (res.success) {
        showToast('Joined workspace successfully!', 'success');
        await fetchWorkspaces();
      }
    } catch (err) {
      showToast(err.message || 'Failed to accept invitation', 'error');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();

    if (!newWorkspaceName.trim()) {
      showToast('Workspace name is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/workspaces', {
        name: newWorkspaceName.trim(),
        icon: newWorkspaceIcon
      });

      if (response.success && response.data) {
        setWorkspaces((prev) => [...prev, response.data]);
        setNewWorkspaceName('');
        setModalOpen(false);
        showToast(`Workspace "${response.data.name}" created!`, 'success');
        navigate(`/workspace/${response.data._id}`);
      }
    } catch (err) {
      showToast(err.message || 'Could not create workspace', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFavorite = async (workspaceId, e) => {
    e.stopPropagation(); // Avoid page navigation
    const target = workspaces.find(w => w._id === workspaceId);
    if (!target) return;

    // Optimistic UI update
    const previousState = workspaces;
    setWorkspaces(prev => prev.map(w => w._id === workspaceId ? { ...w, favorite: !w.favorite } : w));

    try {
      const response = await api.put(`/workspaces/${workspaceId}`, {
        favorite: !target.favorite
      });
      if (response.success && response.data) {
        showToast(response.data.favorite ? 'Workspace favorited!' : 'Workspace unfavorited', 'info');
      } else {
        setWorkspaces(previousState);
      }
    } catch (err) {
      setWorkspaces(previousState);
      showToast('Error updating favorite status', 'error');
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading workspaces..." />;
  }

  return (
    <div className="min-h-screen bg-notion-bg-light dark:bg-notion-bg-dark text-notion-text-light dark:text-notion-text-dark transition-colors duration-200">
      {/* Navbar Header */}
      <header className="border-b border-notion-border-light dark:border-notion-border-dark px-6 py-4 bg-white dark:bg-notion-bg-sidebarDark flex justify-between items-center select-none">
        <div className="flex items-center gap-2">
          <span className="text-xl">💼</span>
          <span className="font-bold text-base tracking-tight">Collaborative Hub</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-notion-hover-light dark:bg-notion-hover-dark px-3 py-1.5 rounded-lg text-sm font-medium">
            <User className="w-4 h-4 text-notion-text-mutedLight dark:text-notion-text-mutedDark" />
            <span>{user?.fullName}</span>
          </div>
          <button
            onClick={() => {
              logout();
              showToast('Logged out successfully', 'success');
            }}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Content Container */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome, {user?.fullName.split(' ')[0]}</h1>
            <p className="text-sm text-notion-text-mutedLight dark:text-notion-text-mutedDark mt-1">
              Select an active workspace below to start creating documents and collaborating.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-notion-text-light dark:bg-notion-text-dark text-white dark:text-notion-bg-dark rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Workspace
          </button>
        </div>

        {/* Workspace Invitations Section */}
        {invitations.length > 0 && (
          <div className="mb-10 bg-purple-500/5 dark:bg-purple-950/10 border border-purple-500/15 rounded-xl p-5 text-left select-none">
            <h2 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-3">
              Workspace Invitations ({invitations.length})
            </h2>
            <div className="space-y-2">
              {invitations.map((invite) => (
                <div 
                  key={invite._id} 
                  className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-notion-bg-sidebarDark border border-notion-border-light dark:border-notion-border-dark rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{invite.icon || '💼'}</span>
                    <div>
                      <h4 className="text-xs font-bold text-notion-text-light dark:text-notion-text-dark">{invite.name}</h4>
                      <p className="text-[10px] text-notion-text-mutedLight dark:text-notion-text-mutedDark mt-0.5">
                        Invited by {invite.owner?.fullName || 'Workspace Owner'} ({invite.owner?.email})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAcceptInvitation(invite._id)}
                    className="px-4 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Accept
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workspaces List Grid */}
        {workspaces.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-2 border-dashed border-notion-border-light dark:border-notion-border-dark rounded-xl p-12 text-center flex flex-col items-center justify-center mt-6 select-none"
          >
            <FolderClosed className="w-12 h-12 text-notion-text-mutedLight dark:text-notion-text-mutedDark mb-4" />
            <h3 className="text-base font-semibold mb-1">No workspaces found</h3>
            <p className="text-sm text-notion-text-mutedLight dark:text-notion-text-mutedDark max-w-sm mb-6">
              A workspace houses folders, notebooks, and shared real-time collaborate files.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Create First Workspace
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {workspaces.map((ws) => (
              <motion.div
                key={ws._id}
                whileHover={{ y: -3 }}
                onClick={() => navigate(`/workspace/${ws._id}`)}
                className="group relative cursor-pointer border border-notion-border-light dark:border-notion-border-dark rounded-xl bg-white dark:bg-notion-bg-sidebarDark p-5 hover:shadow-sm transition-all flex flex-col justify-between min-h-[140px]"
              >
                <button
                  onClick={(e) => toggleFavorite(ws._id, e)}
                  className="absolute top-4 right-4 text-notion-text-mutedLight dark:text-notion-text-mutedDark hover:text-yellow-500 transition-colors"
                >
                  <Star
                    className={`w-5 h-5 ${ws.favorite ? 'fill-yellow-500 text-yellow-500' : 'text-notion-text-mutedLight/40'}`}
                  />
                </button>

                <div>
                  <div className="text-3xl mb-3">{ws.icon || '💼'}</div>
                  <h3 className="font-semibold text-base group-hover:text-blue-500 transition-colors">
                    {ws.name}
                  </h3>
                  <p className="text-xs text-notion-text-mutedLight dark:text-notion-text-mutedDark mt-1">
                    Created by {ws.owner?.fullName === user?.fullName ? 'You' : ws.owner?.fullName}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Create Workspace Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-sm w-full bg-white dark:bg-notion-bg-sidebarDark border border-notion-border-light dark:border-notion-border-dark p-6 rounded-xl shadow-lg z-10"
            >
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 text-notion-text-mutedLight dark:text-notion-text-mutedDark hover:opacity-85"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-bold mb-4">Create Workspace</h2>

              <form onSubmit={handleCreateWorkspace} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-notion-text-mutedLight dark:text-notion-text-mutedDark uppercase tracking-wider mb-2">
                    Icon Emoji
                  </label>
                  <div className="flex gap-2">
                    {['💼', '🚀', '🎨', '📝', '💡', '🔥'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewWorkspaceIcon(emoji)}
                        className={`text-2xl p-2 rounded-lg hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors ${newWorkspaceIcon === emoji ? 'bg-notion-hover-light dark:bg-notion-hover-dark border-2 border-blue-500' : 'border-2 border-transparent'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-notion-text-mutedLight dark:text-notion-text-mutedDark uppercase tracking-wider mb-2">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    className="w-full px-3 py-2 border border-notion-border-light dark:border-notion-border-dark bg-transparent dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="E.g., Engineering Team, Personal Notes"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 bg-notion-text-light dark:bg-notion-text-dark text-white dark:text-notion-bg-dark font-medium rounded-lg hover:opacity-90 transition-opacity text-sm mt-6 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
