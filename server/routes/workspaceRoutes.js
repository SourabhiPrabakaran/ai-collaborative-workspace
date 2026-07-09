import express from 'express';
import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  shareWorkspace,
  getWorkspaceMembers,
  acceptWorkspaceInvitation,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  transferWorkspaceOwnership,
  getPendingInvitations
} from '../controllers/workspaceController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireWorkspaceAccess } from '../middleware/workspaceMiddleware.js';
import { ROLES } from '../constants/index.js';

const router = express.Router();

router.use(protect); // All workspace routes require authentication

router.post('/', createWorkspace);
router.get('/', getUserWorkspaces);
router.get('/invitations', getPendingInvitations);

router.get('/:id', requireWorkspaceAccess(ROLES.VIEWER), getWorkspaceById);
router.put('/:id', requireWorkspaceAccess(ROLES.ADMIN), updateWorkspace);
router.delete('/:id', deleteWorkspace); // Owner verification logic runs inside controller method

// Sharing & Member Management Endpoints
router.post('/:id/share', requireWorkspaceAccess(ROLES.ADMIN), shareWorkspace);
router.get('/:id/members', requireWorkspaceAccess(ROLES.VIEWER), getWorkspaceMembers);
router.post('/:id/accept', acceptWorkspaceInvitation); // Accepts invitation, access middleware not required on init
router.patch('/:id/member/:userId', requireWorkspaceAccess(ROLES.ADMIN), updateWorkspaceMemberRole);
router.delete('/:id/member/:userId', removeWorkspaceMember); // Controller handles permission logic dynamically
router.post('/:id/transfer-owner', transferWorkspaceOwnership); // Owner verification logic runs inside controller method

export default router;
