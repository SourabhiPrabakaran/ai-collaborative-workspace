import express from 'express';
import {
  getDocumentVersions,
  createDocumentVersion,
  getVersionDetails,
  restoreDocumentVersion,
  getWorkspaceActivity
} from '../controllers/versionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireDocumentAccess } from '../middleware/workspaceMiddleware.js';
import { PERMISSIONS } from '../constants/index.js';

const router = express.Router();

router.use(protect); // Require auth for all version/activity routes

// Version history routes
router.get('/:id/versions', requireDocumentAccess(PERMISSIONS.READ), getDocumentVersions);
router.post('/:id/versions', requireDocumentAccess(PERMISSIONS.READ), createDocumentVersion);
router.get('/:id/versions/:versionId', requireDocumentAccess(PERMISSIONS.READ), getVersionDetails);
router.post('/:id/versions/:versionId/restore', requireDocumentAccess(PERMISSIONS.READ), restoreDocumentVersion);

// Activity Timeline route
router.get('/:id/activity', requireDocumentAccess(PERMISSIONS.READ), getWorkspaceActivity);

export default router;
