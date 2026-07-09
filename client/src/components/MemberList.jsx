import React from 'react';
import RoleSelector from './RoleSelector.jsx';
import { UserMinus, ShieldAlert, Award } from 'lucide-react';

const MemberList = ({ 
  members = [], 
  ownerId, 
  currentUserId, 
  currentUserRole, 
  onRoleChange, 
  onRemove, 
  onTransferOwnership 
}) => {
  const isOwner = currentUserId.toString() === ownerId.toString();
  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="space-y-3 max-h-60 overflow-y-auto pr-1 select-none">
      {members.length === 0 ? (
        <div className="text-center text-xs text-notion-text-mutedLight dark:text-notion-text-mutedDark py-4">
          No members found.
        </div>
      ) : (
        members.map((member) => {
          const user = member.user;
          if (!user) return null;

          const userIdStr = user._id.toString();
          const isTargetOwner = userIdStr === ownerId.toString();
          const isSelf = userIdStr === currentUserId.toString();

          // Can this user change roles or remove members?
          // Owner can change anyone except themselves.
          // Admins can change editors/viewers (not owner, not other admins).
          // Viewers/editors cannot change anyone.
          const canManageRole = (isOwner && !isSelf) || (isAdmin && member.role !== 'admin' && !isTargetOwner);
          const canRemove = (isOwner && !isSelf) || (isAdmin && member.role !== 'admin' && !isTargetOwner) || isSelf;

          return (
            <div 
              key={userIdStr} 
              className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark/40 transition-colors border border-transparent hover:border-notion-border-light dark:hover:border-notion-border-dark"
            >
              {/* User Identity */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-purple-500/10 text-purple-500 font-bold flex items-center justify-center text-xs border border-purple-500/20 shrink-0">
                  {user.fullName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-xs font-semibold text-notion-text-light dark:text-notion-text-dark flex items-center gap-1.5">
                    <span className="truncate">{user.fullName}</span>
                    {isSelf && (
                      <span className="bg-blue-500/10 text-blue-500 text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                    {isTargetOwner && (
                      <span className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Award className="w-2.5 h-2.5" />
                        Owner
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-notion-text-mutedLight dark:text-notion-text-mutedDark truncate">
                    {user.email}
                  </div>
                  {/* Status Badge (for Workspace invites) */}
                  {member.status && (
                    <span className={`inline-block mt-0.5 text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${
                      member.status === 'accepted' 
                        ? 'bg-green-500/10 text-green-500' 
                        : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 animate-pulse'
                    }`}>
                      {member.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Operations Panel */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Role Selector */}
                {isTargetOwner ? (
                  <span className="text-[10px] font-bold text-notion-text-mutedLight select-none mr-2">
                    Owner
                  </span>
                ) : (
                  <RoleSelector
                    value={member.role}
                    onChange={(newRole) => onRoleChange(userIdStr, newRole)}
                    disabled={!canManageRole}
                  />
                )}

                {/* Transfer Ownership Button (only shown to Owner, for active accepted members) */}
                {isOwner && !isSelf && member.status === 'accepted' && onTransferOwnership && (
                  <button
                    onClick={() => onTransferOwnership(userIdStr)}
                    className="p-1 rounded text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/10 transition-colors"
                    title="Transfer Workspace Ownership"
                  >
                    <Award className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Remove / Leave Button */}
                {canRemove && !isTargetOwner && (
                  <button
                    onClick={() => onRemove(userIdStr)}
                    className={`p-1 rounded transition-colors ${
                      isSelf 
                        ? 'text-red-500 hover:bg-red-500/10' 
                        : 'text-notion-text-mutedLight hover:text-red-500 hover:bg-red-500/10'
                    }`}
                    title={isSelf ? 'Leave workspace' : 'Remove member'}
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default MemberList;
