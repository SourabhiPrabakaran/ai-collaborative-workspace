import Workspace from '../models/Workspace.js';
import Folder from '../models/Folder.js';
import Document from '../models/Document.js';
import { ROLES, PERMISSIONS } from '../constants/index.js';

/**
 * Reusable helper to check workspace membership and return role
 * @param {string} workspaceId
 * @param {string} userId
 * @returns {string|null} role of member, 'owner', or null if no access
 */
const getWorkspaceUserRole = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return null;

  // Check if owner
  if (workspace.owner.toString() === userId.toString()) {
    return 'owner';
  }

  // Check in members list (must have accepted invitation to gain access!)
  const member = workspace.members.find(
    (m) => m.user.toString() === userId.toString()
  );

  if (member && member.status === 'accepted') {
    return member.role;
  }

  return null;
};

/**
 * Middleware: Verify user has access to specified Workspace
 * Expects workspaceId in req.params.workspaceId, req.params.id, or req.body.workspace
 */
export const requireWorkspaceAccess = (requiredRole = ROLES.VIEWER) => {
  return async (req, res, next) => {
    try {
      const workspaceId = req.params.workspaceId || req.params.id || req.body.workspace;
      const userId = req.user._id;

      if (!workspaceId) {
        res.status(400);
        return next(new Error('Workspace ID is required for validation'));
      }

      const role = await getWorkspaceUserRole(workspaceId, userId);
      if (!role) {
        res.status(403);
        return next(new Error('Access Denied: You are not a member of this workspace'));
      }

      // Role authorization levels: owner > admin > editor > viewer
      const roleWeights = { owner: 4, [ROLES.ADMIN]: 3, [ROLES.EDITOR]: 2, [ROLES.VIEWER]: 1 };
      const userWeight = roleWeights[role] || 0;
      const requiredWeight = roleWeights[requiredRole] || 1;

      if (userWeight < requiredWeight) {
        res.status(403);
        return next(new Error(`Access Denied: Requires role of ${requiredRole} or higher`));
      }

      req.workspaceRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Verify user has access to folder based on parent Workspace membership
 * Expects folder id in req.params.id or req.body.parentFolder
 */
export const requireFolderAccess = (requiredRole = ROLES.VIEWER) => {
  return async (req, res, next) => {
    try {
      const folderId = req.params.id || req.body.parentFolder;
      const userId = req.user._id;

      if (!folderId) {
        // Root folder level
        if (req.body.workspace) {
          const role = await getWorkspaceUserRole(req.body.workspace, userId);
          if (!role) {
            res.status(403);
            return next(new Error('Access Denied: You are not a member of this workspace'));
          }
          return next();
        }
        res.status(400);
        return next(new Error('Folder ID is required for validation'));
      }

      const folder = await Folder.findById(folderId);
      if (!folder) {
        res.status(404);
        return next(new Error('Folder not found'));
      }

      const role = await getWorkspaceUserRole(folder.workspace, userId);
      if (!role) {
        res.status(403);
        return next(new Error('Access Denied: You are not a member of the workspace housing this folder'));
      }

      const roleWeights = { owner: 4, [ROLES.ADMIN]: 3, [ROLES.EDITOR]: 2, [ROLES.VIEWER]: 1 };
      const userWeight = roleWeights[role] || 0;
      const requiredWeight = roleWeights[requiredRole] || 1;

      if (userWeight < requiredWeight) {
        res.status(403);
        return next(new Error(`Access Denied: Folder access requires role of ${requiredRole} or higher`));
      }

      req.folder = folder;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Verify access to Document
 * Checks Workspace membership OR individual document collaborators OR public status
 */
export const requireDocumentAccess = (requiredPermission = PERMISSIONS.READ) => {
  return async (req, res, next) => {
    try {
      const documentId = req.params.id;
      const userId = req.user._id;

      if (!documentId) {
        // Creating document: requires workspace check
        if (req.body.workspace) {
          const role = await getWorkspaceUserRole(req.body.workspace, userId);
          if (!role) {
            res.status(403);
            return next(new Error('Access Denied: You are not a member of this workspace'));
          }
          if (requiredPermission === PERMISSIONS.WRITE && role === ROLES.VIEWER) {
            res.status(403);
            return next(new Error('Access Denied: Viewers cannot create documents'));
          }
          return next();
        }
        res.status(400);
        return next(new Error('Document ID is required for validation'));
      }

      const document = await Document.findById(documentId);
      if (!document) {
        res.status(404);
        return next(new Error('Document not found'));
      }

      // If document is public and only reading access is required, allow access
      if (document.isPublic && requiredPermission === PERMISSIONS.READ) {
        req.document = document;
        req.docPermission = PERMISSIONS.READ;
        return next();
      }

      // Check general workspace role weight
      const role = await getWorkspaceUserRole(document.workspace, userId);
      if (role) {
        const canWrite = ['owner', ROLES.ADMIN, ROLES.EDITOR].includes(role);
        if (requiredPermission === PERMISSIONS.WRITE && !canWrite) {
          res.status(403);
          return next(new Error('Access Denied: Editors and administrators only'));
        }
        req.document = document;
        req.docPermission = canWrite ? PERMISSIONS.WRITE : PERMISSIONS.READ;
        return next();
      }

      // Check individual document-level collaborators
      const collaborator = document.collaborators.find(
        (c) => c.user.toString() === userId.toString()
      );

      if (!collaborator) {
        res.status(403);
        return next(new Error('Access Denied: You do not have permissions on this document'));
      }

      const hasWriteAccess = ['owner', 'admin', 'editor'].includes(collaborator.role);

      if (requiredPermission === PERMISSIONS.WRITE && !hasWriteAccess) {
        res.status(403);
        return next(new Error('Access Denied: Document requires editor role or higher'));
      }

      req.document = document;
      req.docPermission = hasWriteAccess ? PERMISSIONS.WRITE : PERMISSIONS.READ;
      next();
    } catch (error) {
      next(error);
    }
  };
};
