import express from 'express';
import {
  createComment,
  getDocumentComments,
  updateComment,
  deleteComment,
  resolveComment
} from '../controllers/commentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireDocumentAccess } from '../middleware/workspaceMiddleware.js';
import { PERMISSIONS } from '../constants/index.js';

const router = express.Router();

router.use(protect); // Require auth for all comment actions

// CRUD
router.post('/:documentId', requireDocumentAccess(PERMISSIONS.READ), createComment);
router.get('/:documentId', requireDocumentAccess(PERMISSIONS.READ), getDocumentComments);
router.patch('/:commentId', updateComment);
router.delete('/:commentId', deleteComment); // Controller checks author / manager levels dynamically
router.patch('/:commentId/resolve', resolveComment);

export default router;
