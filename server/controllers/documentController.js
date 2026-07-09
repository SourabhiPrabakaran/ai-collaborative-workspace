import mongoose from 'mongoose';
import crypto from 'crypto';
import Document from '../models/Document.js';
import Folder from '../models/Folder.js';
import User from '../models/User.js';
import VersionHistory from '../models/VersionHistory.js';
import { logAudit } from '../utils/auditLogger.js';
import { createNotification, NOTIFICATION_TYPES } from '../services/notificationService.js';
import { validateCreateDocumentInput, validateUpdateDocumentInput } from '../validators/documentValidator.js';

/**
 * @desc    Create a new document
 * @route   POST /api/documents
 * @access  Private
 */
export const createDocument = async (req, res, next) => {
  try {
    const { errors, isValid } = validateCreateDocumentInput(req.body);
    if (!isValid) {
      res.status(400);
      return next(new Error(Object.values(errors)[0]));
    }

    const { title, workspace, folder } = req.body;
    const userId = req.user._id;

    if (folder) {
      const folderRecord = await Folder.findById(folder);
      if (!folderRecord) {
        res.status(404);
        return next(new Error('Specified target folder does not exist'));
      }
      if (folderRecord.workspace.toString() !== workspace.toString()) {
        res.status(400);
        return next(new Error('Target folder resides in a different workspace'));
      }
    }

    const document = await Document.create({
      title: title || 'Untitled Document',
      workspace,
      folder: folder || null,
      lastEditedBy: userId,
      lastOpened: Date.now()
    });

    res.status(201).json({
      success: true,
      data: document
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document details by ID
 * @route   GET /api/documents/:id
 * @access  Private (or Public if isPublic: true)
 */
export const getDocumentById = async (req, res, next) => {
  try {
    const document = req.document;

    document.lastOpened = Date.now();
    await document.save();

    res.status(200).json({
      success: true,
      data: document,
      permission: req.docPermission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update document metadata or auto-save content
 * @route   PUT /api/documents/:id
 * @access  Private
 */
export const updateDocument = async (req, res, next) => {
  try {
    const { errors, isValid } = validateUpdateDocumentInput(req.body);
    if (!isValid) {
      res.status(400);
      return next(new Error(Object.values(errors)[0]));
    }

    const { title, emoji, isPublic, isArchived, folder, content } = req.body;
    const document = req.document;
    const userId = req.user._id;

    if (folder !== undefined) {
      if (folder !== null) {
        const folderRecord = await Folder.findById(folder);
        if (!folderRecord) {
          res.status(404);
          return next(new Error('Target folder does not exist'));
        }
        if (folderRecord.workspace.toString() !== document.workspace.toString()) {
          res.status(400);
          return next(new Error('Target folder belongs to a different workspace'));
        }
      }
      document.folder = folder;
    }

    if (title !== undefined) document.title = title;
    if (emoji !== undefined) document.emoji = emoji;
    if (isPublic !== undefined) document.isPublic = isPublic;
    if (isArchived !== undefined) document.isArchived = isArchived;
    
    if (content !== undefined) {
      const contentChanged = JSON.stringify(content) !== JSON.stringify(document.content);
      if (contentChanged) {
        document.content = content;
        document.markModified('content');
        
        await VersionHistory.create({
          document: document._id,
          content,
          createdBy: userId
        });
      }
    }

    document.lastEditedBy = userId;
    await document.save();

    res.status(200).json({
      success: true,
      data: document
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Archive document (soft delete)
 * @route   POST /api/documents/:id/archive
 * @access  Private
 */
export const archiveDocument = async (req, res, next) => {
  try {
    const document = req.document;
    document.isArchived = true;
    document.lastEditedBy = req.user._id;
    await document.save();

    res.status(200).json({
      success: true,
      message: 'Document soft-deleted (archived) successfully',
      data: document
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Restore archived document
 * @route   POST /api/documents/:id/restore
 * @access  Private
 */
export const restoreDocument = async (req, res, next) => {
  try {
    const document = req.document;
    document.isArchived = false;
    document.lastEditedBy = req.user._id;
    await document.save();

    res.status(200).json({
      success: true,
      message: 'Document restored successfully',
      data: document
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete document permanently
 * @route   DELETE /api/documents/:id
 * @access  Private
 */
export const deleteDocument = async (req, res, next) => {
  try {
    const documentId = req.params.id;

    await VersionHistory.deleteMany({ document: documentId });
    await Document.findByIdAndDelete(documentId);

    res.status(200).json({
      success: true,
      message: 'Document permanently deleted'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search document titles & contents in a workspace
 * @route   GET /api/documents/search
 * @access  Private
 */
export const searchDocuments = async (req, res, next) => {
  try {
    const { workspaceId, q } = req.query;

    if (!workspaceId) {
      res.status(400);
      return next(new Error('workspaceId query parameter is required'));
    }

    if (!q || typeof q !== 'string') {
      res.status(400);
      return next(new Error('Search query "q" is required'));
    }

    const queryRegex = new RegExp(q, 'i');

    const results = await Document.find({
      workspace: workspaceId,
      isArchived: false,
      $or: [
        { title: { $regex: queryRegex } },
        { content: { $regex: queryRegex } }
      ]
    }).select('title emoji folder workspace updatedAt');

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all archived documents in a workspace
 * @route   GET /api/documents/archived/workspace/:workspaceId
 * @access  Private
 */
export const getArchivedDocuments = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const archived = await Document.find({
      workspace: workspaceId,
      isArchived: true
    }).select('title emoji folder workspace updatedAt');

    res.status(200).json({
      success: true,
      data: archived
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Share document / add collaborator
 * @route   POST /api/documents/:id/share
 * @access  Private (Write access required)
 */
export const shareDocument = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const documentId = req.params.id;

    if (!email || !role) {
      res.status(400);
      return next(new Error('Email and role are required'));
    }

    const allowedRoles = ['admin', 'editor', 'viewer'];
    if (!allowedRoles.includes(role)) {
      res.status(400);
      return next(new Error('Invalid role specified'));
    }

    const document = await Document.findById(documentId);
    if (!document) {
      res.status(404);
      return next(new Error('Document not found'));
    }

    const targetUser = await User.findOne({ email });
    if (!targetUser) {
      res.status(404);
      return next(new Error('User not found'));
    }

    // Check if user is already a collaborator
    const isCollab = document.collaborators.some(
      (c) => c.user.toString() === targetUser._id.toString()
    );

    if (isCollab) {
      res.status(409); // Conflict
      return next(new Error('User is already a collaborator on this document'));
    }

    document.collaborators.push({
      user: targetUser._id,
      role
    });

    await document.save();

    // Notify user of document sharing
    if (targetUser.notificationPreferences?.documentSharing !== false) {
      await createNotification({
        user: targetUser._id,
        type: NOTIFICATION_TYPES.DOCUMENT_SHARED,
        title: 'Document Shared',
        message: `${req.user.fullName} shared the document "${document.title || 'Untitled Document'}" with you`,
        link: `/workspace/${document.workspace}/document/${document._id}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Collaborator added successfully',
      data: document.collaborators
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get collaborators of a document
 * @route   GET /api/documents/:id/members
 * @access  Private (Read access required)
 */
export const getDocumentCollaborators = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('collaborators.user', 'fullName email avatarUrl');

    if (!document) {
      res.status(404);
      return next(new Error('Document not found'));
    }

    res.status(200).json({
      success: true,
      data: document.collaborators
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update collaborator role on document
 * @route   PATCH /api/documents/:id/member/:userId
 * @access  Private (Write access required)
 */
export const updateDocumentCollaboratorRole = async (req, res, next) => {
  try {
    const documentId = req.params.id;
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

    const document = await Document.findById(documentId);
    if (!document) {
      res.status(404);
      return next(new Error('Document not found'));
    }

    const collaborator = document.collaborators.find(
      (c) => c.user.toString() === targetUserId.toString()
    );

    if (!collaborator) {
      res.status(404);
      return next(new Error('Collaborator not found'));
    }

    collaborator.role = role;
    await document.save();

    // Notify collaborator of role change
    const targetUserRecord = await User.findById(targetUserId);
    if (targetUserRecord && targetUserRecord.notificationPreferences?.roleChanges !== false) {
      await createNotification({
        user: targetUserId,
        type: NOTIFICATION_TYPES.ROLE_CHANGED,
        title: 'Document Permission Updated',
        message: `Your collaborator permission on document "${document.title || 'Untitled Document'}" was updated to "${role}"`,
        link: `/workspace/${document.workspace}/document/${document._id}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Collaborator role updated successfully',
      data: document.collaborators
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove collaborator from document
 * @route   DELETE /api/documents/:id/member/:userId
 * @access  Private (Write access required or self leaving)
 */
export const removeDocumentCollaborator = async (req, res, next) => {
  try {
    const documentId = req.params.id;
    const targetUserId = req.params.userId;

    const document = await Document.findById(documentId);
    if (!document) {
      res.status(404);
      return next(new Error('Document not found'));
    }

    const index = document.collaborators.findIndex(
      (c) => c.user.toString() === targetUserId.toString()
    );

    if (index === -1) {
      res.status(404);
      return next(new Error('Collaborator not found'));
    }

    document.collaborators.splice(index, 1);
    await document.save();

    res.status(200).json({
      success: true,
      message: 'Collaborator removed successfully',
      data: document.collaborators
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle document public status (generate or clear token link)
 * @route   PATCH /api/documents/:id/public
 * @access  Private (Write access required)
 */
export const toggleDocumentPublicLink = async (req, res, next) => {
  try {
    const documentId = req.params.id;
    const { isPublic } = req.body;

    if (isPublic === undefined) {
      res.status(400);
      return next(new Error('isPublic boolean state is required'));
    }

    const document = await Document.findById(documentId);
    if (!document) {
      res.status(404);
      return next(new Error('Document not found'));
    }

    if (isPublic) {
      document.isPublic = true;
      if (!document.publicToken) {
        document.publicToken = crypto.randomBytes(24).toString('hex');
      }
    } else {
      document.isPublic = false;
      document.publicToken = null;
    }

    await document.save();

    // Log to Audit Log
    await logAudit({
      user: req.user._id,
      action: isPublic ? 'enabled public link' : 'disabled public link',
      workspace: document.workspace,
      document: document._id
    });

    // Notify workspace members of public status change
    const workspace = await mongoose.model('Workspace').findById(document.workspace);
    if (workspace) {
      for (const member of workspace.members) {
        if (member.user.toString() !== req.user._id.toString() && member.status === 'accepted') {
          const u = await User.findById(member.user);
          if (u && u.notificationPreferences?.publicLinkChanges !== false) {
            await createNotification({
              user: u._id,
              type: isPublic ? NOTIFICATION_TYPES.PUBLIC_LINK_ENABLED : NOTIFICATION_TYPES.PUBLIC_LINK_DISABLED,
              title: isPublic ? 'Document Made Public' : 'Document Made Private',
              message: `The document "${document.title || 'Untitled Document'}" was made ${isPublic ? 'public' : 'private'} by ${req.user.fullName}`,
              link: `/workspace/${document.workspace}/document/${document._id}`
            });
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        isPublic: document.isPublic,
        publicToken: document.publicToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fetch public document by secure token link (No Auth)
 * @route   GET /api/public/document/:token
 * @access  Public
 */
export const getPublicDocumentByToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    const document = await Document.findOne({
      publicToken: token,
      isPublic: true,
      isArchived: false
    }).populate('workspace', 'name icon');

    if (!document) {
      res.status(404);
      return next(new Error('Public document not found or link has expired'));
    }

    res.status(200).json({
      success: true,
      data: document
    });
  } catch (error) {
    next(error);
  }
};
