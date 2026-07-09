import express from 'express';
import {
  createDocument,
  getDocumentById,
  updateDocument,
  archiveDocument,
  restoreDocument,
  deleteDocument,
  searchDocuments,
  getArchivedDocuments,
  shareDocument,
  getDocumentCollaborators,
  updateDocumentCollaboratorRole,
  removeDocumentCollaborator,
  toggleDocumentPublicLink
} from '../controllers/documentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireDocumentAccess } from '../middleware/workspaceMiddleware.js';
import { PERMISSIONS } from '../constants/index.js';

const router = express.Router();

router.use(protect); // Require auth for all document operations

// Search - MUST go before /:id so that 'search' isn't matched as an ID parameter
router.get('/search', searchDocuments);
router.get('/archived/workspace/:workspaceId', getArchivedDocuments);

// CRUD
router.post('/', requireDocumentAccess(PERMISSIONS.WRITE), createDocument);
router.get('/:id', requireDocumentAccess(PERMISSIONS.READ), getDocumentById);
router.put('/:id', requireDocumentAccess(PERMISSIONS.WRITE), updateDocument);
router.delete('/:id', requireDocumentAccess(PERMISSIONS.WRITE), deleteDocument);

// Soft Archiving & Restoring
router.post('/:id/archive', requireDocumentAccess(PERMISSIONS.WRITE), archiveDocument);
router.post('/:id/restore', requireDocumentAccess(PERMISSIONS.WRITE), restoreDocument);

// Collaborator Sharing & Public Toggles
router.post('/:id/share', requireDocumentAccess(PERMISSIONS.WRITE), shareDocument);
router.get('/:id/members', requireDocumentAccess(PERMISSIONS.READ), getDocumentCollaborators);
router.patch('/:id/member/:userId', requireDocumentAccess(PERMISSIONS.WRITE), updateDocumentCollaboratorRole);
router.delete('/:id/member/:userId', requireDocumentAccess(PERMISSIONS.WRITE), removeDocumentCollaborator);
router.patch('/:id/public', requireDocumentAccess(PERMISSIONS.WRITE), toggleDocumentPublicLink);

export default router;
