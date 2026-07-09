import express from 'express';
import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace
} from '../controllers/workspaceController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireWorkspaceAccess } from '../middleware/workspaceMiddleware.js';
import { ROLES } from '../constants/index.js';

const router = express.Router();

router.use(protect); // All workspace routes require authentication

router.post('/', createWorkspace);
router.get('/', getUserWorkspaces);

router.get('/:id', requireWorkspaceAccess(ROLES.VIEWER), getWorkspaceById);
router.put('/:id', requireWorkspaceAccess(ROLES.ADMIN), updateWorkspace);
router.delete('/:id', deleteWorkspace); // Owner verification logic runs inside controller method

export default router;
