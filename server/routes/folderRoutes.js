import express from 'express';
import {
  createFolder,
  updateFolder,
  deleteFolder,
  getWorkspaceTree
} from '../controllers/folderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireWorkspaceAccess, requireFolderAccess } from '../middleware/workspaceMiddleware.js';
import { ROLES } from '../constants/index.js';

const router = express.Router();

router.use(protect); // Require auth for all folder actions

// Workspace Tree Rendering
router.get('/workspace/:workspaceId', requireWorkspaceAccess(ROLES.VIEWER), getWorkspaceTree);

// CRUD
router.post('/', requireFolderAccess(ROLES.EDITOR), createFolder);
router.put('/:id', requireFolderAccess(ROLES.EDITOR), updateFolder);
router.delete('/:id', requireFolderAccess(ROLES.EDITOR), deleteFolder);

export default router;
