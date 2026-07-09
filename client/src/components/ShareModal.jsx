import React, { useEffect, useState } from 'react';
import DialogModal from './DialogModal.jsx';
import InviteUserForm from './InviteUserForm.jsx';
import MemberList from './MemberList.jsx';
import PublicLinkCard from './PublicLinkCard.jsx';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Users, FileText, Loader } from 'lucide-react';

const ShareModal = ({ isOpen, onClose, workspaceId, documentId = null }) => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('workspace'); // 'workspace' | 'document'
  const [loading, setLoading] = useState(false);

  // Workspace Share states
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState('');
  const [workspaceRole, setWorkspaceRole] = useState('viewer');

  // Document Share states
  const [docCollaborators, setDocCollaborators] = useState([]);
  const [docIsPublic, setDocIsPublic] = useState(false);
  const [docPublicToken, setDocPublicToken] = useState(null);
  const [docRole, setDocRole] = useState('viewer');

  // Fetch Workspace Sharing Details
  const fetchWorkspaceSharing = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      // 1. Fetch workspace details (to get owner and roles)
      const wsDetails = await api.get(`/workspaces/${workspaceId}`);
      if (wsDetails.success && wsDetails.data) {
        const ownerId = wsDetails.data.owner._id || wsDetails.data.owner;
        setWorkspaceOwnerId(ownerId);

        // Find current user role in workspace
        if (currentUser._id.toString() === ownerId.toString()) {
          setWorkspaceRole('owner');
        } else {
          const member = wsDetails.data.members.find(
            m => m.user._id?.toString() === currentUser._id.toString() || m.user?.toString() === currentUser._id.toString()
          );
          setWorkspaceRole(member ? member.role : 'viewer');
        }
        
        // Use members populated from details
        setWorkspaceMembers(wsDetails.data.members);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch workspace members', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Document Sharing Details
  const fetchDocumentSharing = async () => {
    if (!documentId) return;
    try {
      setLoading(true);
      // 1. Fetch document details to get isPublic and publicToken
      const docDetails = await api.get(`/documents/${documentId}`);
      if (docDetails.success && docDetails.data) {
        setDocIsPublic(docDetails.data.isPublic);
        setDocPublicToken(docDetails.data.publicToken);
        setDocRole(docDetails.permission === 'write' ? 'editor' : 'viewer');
      }

      // 2. Fetch document collaborators list
      const collabsRes = await api.get(`/documents/${documentId}/members`);
      if (collabsRes.success && collabsRes.data) {
        setDocCollaborators(collabsRes.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch document sharing details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWorkspaceSharing();
      if (documentId) {
        fetchDocumentSharing();
        setActiveTab('document'); // Default to document tab if opened inside a document
      } else {
        setActiveTab('workspace');
      }
    }
  }, [isOpen, workspaceId, documentId]);

  // Invite Workspace Member
  const handleInviteWorkspace = async (email, role) => {
    try {
      setLoading(true);
      const res = await api.post(`/workspaces/${workspaceId}/share`, { email, role });
      if (res.success) {
        showToast('Member invited successfully', 'success');
        // Refresh workspace members
        await fetchWorkspaceSharing();
      }
    } catch (err) {
      showToast(err.message || 'Failed to invite user', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update Workspace Member Role
  const handleRoleChangeWorkspace = async (targetUserId, newRole) => {
    try {
      setLoading(true);
      const res = await api.patch(`/workspaces/${workspaceId}/member/${targetUserId}`, { role: newRole });
      if (res.success) {
        showToast('Role updated successfully', 'success');
        await fetchWorkspaceSharing();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update role', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Remove Workspace Member
  const handleRemoveWorkspace = async (targetUserId) => {
    try {
      setLoading(true);
      const res = await api.delete(`/workspaces/${workspaceId}/member/${targetUserId}`);
      if (res.success) {
        const isSelf = targetUserId === currentUser._id.toString();
        showToast(isSelf ? 'You left the workspace' : 'Member removed successfully', 'success');
        if (isSelf) {
          onClose();
          window.location.href = '/dashboard';
        } else {
          await fetchWorkspaceSharing();
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to remove member', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Transfer Ownership
  const handleTransferOwnership = async (newOwnerId) => {
    const confirmTransfer = window.confirm(
      'Are you absolutely sure you want to transfer workspace ownership? You will be demoted to an Admin and cannot undo this action.'
    );
    if (!confirmTransfer) return;

    try {
      setLoading(true);
      const res = await api.post(`/workspaces/${workspaceId}/transfer-owner`, { newOwnerId });
      if (res.success) {
        showToast('Ownership transferred successfully', 'success');
        onClose();
        window.location.reload();
      }
    } catch (err) {
      showToast(err.message || 'Failed to transfer ownership', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Invite Document Collaborator
  const handleInviteDocument = async (email, role) => {
    try {
      setLoading(true);
      const res = await api.post(`/documents/${documentId}/share`, { email, role });
      if (res.success) {
        showToast('Collaborator added to document', 'success');
        await fetchDocumentSharing();
      }
    } catch (err) {
      showToast(err.message || 'Failed to add collaborator', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update Document Collaborator Role
  const handleRoleChangeDocument = async (targetUserId, newRole) => {
    try {
      setLoading(true);
      const res = await api.patch(`/documents/${documentId}/member/${targetUserId}`, { role: newRole });
      if (res.success) {
        showToast('Collaborator role updated', 'success');
        await fetchDocumentSharing();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update role', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Remove Document Collaborator
  const handleRemoveDocument = async (targetUserId) => {
    try {
      setLoading(true);
      const res = await api.delete(`/documents/${documentId}/member/${targetUserId}`);
      if (res.success) {
        showToast('Collaborator removed from document', 'success');
        await fetchDocumentSharing();
      }
    } catch (err) {
      showToast(err.message || 'Failed to remove collaborator', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Public Document Link
  const handleTogglePublic = async (newVal) => {
    try {
      setLoading(true);
      const res = await api.patch(`/documents/${documentId}/public`, { isPublic: newVal });
      if (res.success && res.data) {
        setDocIsPublic(res.data.isPublic);
        setDocPublicToken(res.data.publicToken);
        showToast(newVal ? 'Public access link enabled' : 'Public access link disabled', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to update public status', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Share & Permissions Settings"
    >
      <div className="space-y-4">
        {/* Tab Selection (only visible if documentId is provided) */}
        {documentId && (
          <div className="flex border-b border-notion-border-light dark:border-notion-border-dark select-none">
            <button
              onClick={() => setActiveTab('document')}
              className={`flex-1 pb-2 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                activeTab === 'document' 
                  ? 'border-purple-500 text-purple-500' 
                  : 'border-transparent text-notion-text-mutedLight dark:text-notion-text-mutedDark'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Document Access
            </button>
            <button
              onClick={() => setActiveTab('workspace')}
              className={`flex-1 pb-2 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                activeTab === 'workspace' 
                  ? 'border-purple-500 text-purple-500' 
                  : 'border-transparent text-notion-text-mutedLight dark:text-notion-text-mutedDark'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Workspace Members
            </button>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-2 select-none">
            <Loader className="w-5 h-5 text-purple-500 animate-spin" />
          </div>
        )}

        {/* 1. DOCUMENT SHARE TAB PANEL */}
        {activeTab === 'document' && documentId && (
          <div className="space-y-4">
            {/* Invite Form */}
            {['owner', 'admin', 'editor'].includes(workspaceRole) && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-notion-text-mutedLight dark:text-notion-text-mutedDark uppercase tracking-wider">
                  Invite collaborators to document
                </label>
                <InviteUserForm onInvite={handleInviteDocument} loading={loading} />
              </div>
            )}

            {/* Public Link Generator */}
            {['owner', 'admin', 'editor'].includes(workspaceRole) && (
              <PublicLinkCard
                isPublic={docIsPublic}
                publicToken={docPublicToken}
                onTogglePublic={handleTogglePublic}
              />
            )}

            {/* Collaborators List */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-notion-text-mutedLight dark:text-notion-text-mutedDark uppercase tracking-wider block text-left">
                Document Collaborators ({docCollaborators.length})
              </label>
              <MemberList
                members={docCollaborators}
                ownerId={workspaceOwnerId}
                currentUserId={currentUser._id}
                currentUserRole={workspaceRole}
                onRoleChange={handleRoleChangeDocument}
                onRemove={handleRemoveDocument}
              />
            </div>
          </div>
        )}

        {/* 2. WORKSPACE MEMBERS TAB PANEL */}
        {activeTab === 'workspace' && (
          <div className="space-y-4">
            {/* Invite Form */}
            {['owner', 'admin'].includes(workspaceRole) && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-notion-text-mutedLight dark:text-notion-text-mutedDark uppercase tracking-wider">
                  Invite members to workspace
                </label>
                <InviteUserForm onInvite={handleInviteWorkspace} loading={loading} />
              </div>
            )}

            {/* Members List */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-notion-text-mutedLight dark:text-notion-text-mutedDark uppercase tracking-wider block text-left">
                Workspace Members ({workspaceMembers.length})
              </label>
              <MemberList
                members={workspaceMembers}
                ownerId={workspaceOwnerId}
                currentUserId={currentUser._id}
                currentUserRole={workspaceRole}
                onRoleChange={handleRoleChangeWorkspace}
                onRemove={handleRemoveWorkspace}
                onTransferOwnership={workspaceRole === 'owner' ? handleTransferOwnership : null}
              />
            </div>
          </div>
        )}
      </div>
    </DialogModal>
  );
};

export default ShareModal;
