import Workspace from '../models/Workspace.js';
import Folder from '../models/Folder.js';
import Document from '../models/Document.js';
import User from '../models/User.js';
import VersionHistory from '../models/VersionHistory.js';
import { logAudit } from '../utils/auditLogger.js';
import { logActivity } from '../utils/activityLogger.js';
import { createNotification, NOTIFICATION_TYPES } from '../services/notificationService.js';
import { validateCreateWorkspaceInput, validateUpdateWorkspaceInput } from '../validators/workspaceValidator.js';

/**
 * @desc    Create a new workspace
 * @route   POST /api/workspaces
 * @access  Private
 */
export const createWorkspace = async (req, res, next) => {
  try {
    const { errors, isValid } = validateCreateWorkspaceInput(req.body);
    if (!isValid) {
      res.status(400);
      return next(new Error(Object.values(errors)[0]));
    }

    const { name, icon, coverImage } = req.body;
    const userId = req.user._id;

    // Owner is added as an accepted 'owner' member
    const workspace = await Workspace.create({
      name,
      owner: userId,
      icon: icon || undefined,
      coverImage: coverImage || undefined,
      members: [{ 
        user: userId, 
        role: 'owner', 
        status: 'accepted', 
        acceptedAt: new Date() 
      }]
    });

    res.status(201).json({
      success: true,
      data: workspace
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user workspaces (owned or joined)
 * @route   GET /api/workspaces
 * @access  Private
 */
export const getUserWorkspaces = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Retrieve workspaces where user is owner or listed as an accepted member
    const workspaces = await Workspace.find({
      $or: [
        { owner: userId },
        { 
          members: { 
            $elemMatch: { user: userId, status: 'accepted' } 
          } 
        }
      ]
    }).populate('owner', 'fullName email avatarUrl');

    res.status(200).json({
      success: true,
      data: workspaces
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get details and member list of workspace
 * @route   GET /api/workspaces/:id
 * @access  Private
 */
export const getWorkspaceById = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'fullName email avatarUrl')
      .populate('members.user', 'fullName email avatarUrl')
      .populate('members.invitedBy', 'fullName email');

    if (!workspace) {
      res.status(404);
      return next(new Error('Workspace not found'));
    }

    res.status(200).json({
      success: true,
      data: workspace
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a workspace
 * @route   PUT /api/workspaces/:id
 * @access  Private
 */
export const updateWorkspace = async (req, res, next) => {
  try {
    const { errors, isValid } = validateUpdateWorkspaceInput(req.body);
    if (!isValid) {
      res.status(400);
      return next(new Error(Object.values(errors)[0]));
    }

    const { name, icon, coverImage, favorite } = req.body;

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      res.status(404);
      return next(new Error('Workspace not found'));
    }

    if (name !== undefined) workspace.name = name;
    if (icon !== undefined) workspace.icon = icon;
    if (coverImage !== undefined) workspace.coverImage = coverImage;
    if (favorite !== undefined) workspace.favorite = favorite;

    await workspace.save();

    res.status(200).json({
      success: true,
      data: workspace
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete workspace
 * @route   DELETE /api/workspaces/:id
 * @access  Private
 */
export const deleteWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      res.status(404);
      return next(new Error('Workspace not found'));
    }

    if (workspace.owner.toString() !== req.user._id.toString()) {
      res.status(403);
      return next(new Error('Access Denied: Only the workspace owner can delete it'));
    }

    const workspaceId = workspace._id;

    const documents = await Document.find({ workspace: workspaceId });
    const documentIds = documents.map(doc => doc._id);
    await VersionHistory.deleteMany({ document: { $in: documentIds } });
    await Document.deleteMany({ workspace: workspaceId });
    await Folder.deleteMany({ workspace: workspaceId });
    await Workspace.findByIdAndDelete(workspaceId);

    res.status(200).json({
      success: true,
      message: 'Workspace and all associated contents deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Share workspace / Invite a member
 * @route   POST /api/workspaces/:id/share
 * @access  Private (Owner/Admin only)
 */
export const shareWorkspace = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const workspaceId = req.params.id;

    if (!email || !role) {
      res.status(400);
      return next(new Error('Email and role are required'));
    }

    const allowedRoles = ['admin', 'editor', 'viewer'];
    if (!allowedRoles.includes(role)) {
      res.status(400);
      return next(new Error('Invalid role specified'));
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      res.status(404);
      return next(new Error('Workspace not found'));
    }

    const targetUser = await User.findOne({ email });
    if (!targetUser) {
      res.status(404);
      return next(new Error('User not found'));
    }

    // Check if user is already in members array
    const existingMemberIndex = workspace.members.findIndex(
      (m) => m.user.toString() === targetUser._id.toString()
    );

    if (existingMemberIndex !== -1) {
      res.status(409); // Conflict status code
      return next(new Error('User already has access or a pending invitation'));
    }

    // Create pending invitation
    workspace.members.push({
      user: targetUser._id,
      role,
      status: 'pending',
      invitedBy: req.user._id,
      invitedAt: new Date()
    });

    await workspace.save();

    // Log to Audit Log
    await logAudit({
      user: req.user._id,
      action: 'invited member',
      workspace: workspaceId,
      targetUser: targetUser._id
    });

    // Notify user of invitation
    if (targetUser.notificationPreferences?.invitations !== false) {
      await createNotification({
        user: targetUser._id,
        type: NOTIFICATION_TYPES.INVITE,
        title: 'Workspace Invitation',
        message: `${req.user.fullName} invited you to join the workspace "${workspace.name}"`,
        link: '/dashboard'
      });
    }

    // Log Activity Timeline
    await logActivity({
      workspace: workspaceId,
      user: req.user._id,
      type: 'USER_INVITED',
      details: { email, role, targetUserId: targetUser._id, workspaceName: workspace.name }
    });

    res.status(200).json({
      success: true,
      message: 'Invitation sent successfully',
      data: workspace.members
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get members of a workspace
 * @route   GET /api/workspaces/:id/members
 * @access  Private (Workspace members only)
 */
export const getWorkspaceMembers = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'fullName email avatarUrl')
      .populate('members.user', 'fullName email avatarUrl')
      .populate('members.invitedBy', 'fullName email');

    if (!workspace) {
      res.status(404);
      return next(new Error('Workspace not found'));
    }

    res.status(200).json({
      success: true,
      data: workspace.members
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Accept workspace invitation
 * @route   POST /api/workspaces/:id/accept
 * @access  Private
 */
export const acceptWorkspaceInvitation = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const userId = req.user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      res.status(404);
      return next(new Error('Workspace not found'));
    }

    const member = workspace.members.find(
      (m) => m.user.toString() === userId.toString() && m.status === 'pending'
    );

    if (!member) {
      res.status(404);
      return next(new Error('No pending invitation found for this user'));
    }

    member.status = 'accepted';
    member.acceptedAt = new Date();
    await workspace.save();

    // Log to Audit Log
    await logAudit({
      user: userId,
      action: 'accepted invitation',
      workspace: workspaceId
    });

    res.status(200).json({
      success: true,
      message: 'Invitation accepted successfully',
      data: workspace
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update workspace member role
 * @route   PATCH /api/workspaces/:id/member/:userId
 * @access  Private (Owner/Admin only)
 */
export const updateWorkspaceMemberRole = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const targetUserId = req.params.userId;
    const { role } = req.body;

    if (!role) {
      res.status(400);
      return next(new Error('Role is required'));
    }

    const allowedRoles = ['admin', 'editor', 'viewer'];
    if (!allowedRoles.includes(role)) {
      res.status(400);
      return next(new Error('Invalid role specified'));
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      res.status(404);
      return next(new Error('Workspace not found'));
    }

    // Check if target is owner
    if (workspace.owner.toString() === targetUserId.toString()) {
      res.status(400);
      return next(new Error('Cannot change role of workspace owner'));
    }

    const currentUserId = req.user._id;
    const currentUserRole = workspace.owner.toString() === currentUserId.toString() 
      ? 'owner' 
      : workspace.members.find(m => m.user.toString() === currentUserId.toString())?.role;

    if (!currentUserRole || !['owner', 'admin'].includes(currentUserRole)) {
      res.status(403);
      return next(new Error('Access Denied: Owner or Admin permissions required'));
    }

    const member = workspace.members.find(
      (m) => m.user.toString() === targetUserId.toString()
    );

    if (!member) {
      res.status(404);
      return next(new Error('Member not found in workspace'));
    }

    // Admin limits: cannot promote someone to Admin, or demote Admins
    if (currentUserRole === 'admin') {
      if (member.role === 'admin' || role === 'admin') {
        res.status(403);
        return next(new Error('Access Denied: Admins cannot promote/demote other Admins'));
      }
    }

    member.role = role;
    await workspace.save();

    // Log to Audit Log
    await logAudit({
      user: currentUserId,
      action: 'changed role',
      workspace: workspaceId,
      targetUser: targetUserId
    });

    // Notify user of role change
    const targetUserRecord = await User.findById(targetUserId);
    if (targetUserRecord && targetUserRecord.notificationPreferences?.roleChanges !== false) {
      await createNotification({
        user: targetUserId,
        type: NOTIFICATION_TYPES.ROLE_CHANGED,
        title: 'Workspace Role Updated',
        message: `Your role in workspace "${workspace.name}" was updated to "${role}"`,
        link: `/workspace/${workspaceId}`
      });
    }

    // Log Activity Timeline
    await logActivity({
      workspace: workspaceId,
      user: currentUserId,
      type: 'ROLE_CHANGED',
      details: { targetUserId, targetUserName: targetUserRecord?.fullName, role, scope: 'workspace' }
    });

    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: workspace.members
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove member from workspace
 * @route   DELETE /api/workspaces/:id/member/:userId
 * @access  Private (Owner/Admin, or self leaving)
 */
export const removeWorkspaceMember = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      res.status(404);
      return next(new Error('Workspace not found'));
    }

    // Prevent Owner from removing themselves
    if (workspace.owner.toString() === targetUserId.toString()) {
      res.status(400);
      return next(new Error('Owner cannot be removed from the workspace. Transfer ownership first.'));
    }

    const currentUserRole = workspace.owner.toString() === currentUserId.toString()
      ? 'owner'
      : workspace.members.find(m => m.user.toString() === currentUserId.toString())?.role;

    const isSelfLeaving = currentUserId.toString() === targetUserId.toString();

    if (!isSelfLeaving && (!currentUserRole || !['owner', 'admin'].includes(currentUserRole))) {
      res.status(403);
      return next(new Error('Access Denied: Owner or Admin permissions required to remove members'));
    }

    const memberIndex = workspace.members.findIndex(
      (m) => m.user.toString() === targetUserId.toString()
    );

    if (memberIndex === -1) {
      res.status(404);
      return next(new Error('Member not found in workspace'));
    }

    const memberRole = workspace.members[memberIndex].role;

    // Admin limits: cannot delete Admins
    if (!isSelfLeaving && currentUserRole === 'admin' && memberRole === 'admin') {
      res.status(403);
      return next(new Error('Access Denied: Admins cannot remove other Admins'));
    }

    workspace.members.splice(memberIndex, 1);
    await workspace.save();

    // Log to Audit Log
    await logAudit({
      user: currentUserId,
      action: 'removed member',
      workspace: workspaceId,
      targetUser: targetUserId
    });

    res.status(200).json({
      success: true,
      message: isSelfLeaving ? 'Left workspace successfully' : 'Member removed successfully',
      data: workspace.members
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Transfer ownership of a workspace
 * @route   POST /api/workspaces/:id/transfer-owner
 * @access  Private (Owner only)
 */
export const transferWorkspaceOwnership = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const { newOwnerId } = req.body;
    const currentUserId = req.user._id;

    if (!newOwnerId) {
      res.status(400);
      return next(new Error('newOwnerId is required'));
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      res.status(404);
      return next(new Error('Workspace not found'));
    }

    // Verify current user is owner
    if (workspace.owner.toString() !== currentUserId.toString()) {
      res.status(403);
      return next(new Error('Access Denied: Only the workspace owner can transfer ownership'));
    }

    // Verify new owner is an accepted member
    const newOwnerMember = workspace.members.find(
      (m) => m.user.toString() === newOwnerId.toString() && m.status === 'accepted'
    );

    if (!newOwnerMember) {
      res.status(400);
      return next(new Error('New owner must be an active, accepted member of the workspace'));
    }

    // Transfer owner field
    workspace.owner = newOwnerId;

    // Change old owner role to admin
    const oldOwnerMember = workspace.members.find(
      (m) => m.user.toString() === currentUserId.toString()
    );
    if (oldOwnerMember) {
      oldOwnerMember.role = 'admin';
    } else {
      workspace.members.push({
        user: currentUserId,
        role: 'admin',
        status: 'accepted',
        acceptedAt: new Date()
      });
    }

    // Change new owner role in member list to owner
    newOwnerMember.role = 'owner';

    await workspace.save();

    // Log to Audit Log
    await logAudit({
      user: currentUserId,
      action: 'ownership transfer',
      workspace: workspaceId,
      targetUser: newOwnerId
    });

    // Notify user of ownership transfer
    const targetUserRecord = await User.findById(newOwnerId);
    if (targetUserRecord && targetUserRecord.notificationPreferences?.roleChanges !== false) {
      await createNotification({
        user: newOwnerId,
        type: NOTIFICATION_TYPES.OWNER_TRANSFER,
        title: 'Workspace Ownership Transferred',
        message: `You are now the Owner of workspace "${workspace.name}"`,
        link: `/workspace/${workspaceId}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Workspace ownership transferred successfully',
      data: workspace
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get pending workspace invitations for the current user
 * @route   GET /api/workspaces/invitations
 * @access  Private
 */
export const getPendingInvitations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const invitations = await Workspace.find({
      members: {
        $elemMatch: { user: userId, status: 'pending' }
      }
    }).populate('owner', 'fullName email avatarUrl');

    res.status(200).json({
      success: true,
      data: invitations
    });
  } catch (error) {
    next(error);
  }
};
