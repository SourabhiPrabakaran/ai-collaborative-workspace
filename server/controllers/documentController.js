import Document from '../models/Document.js';
import Folder from '../models/Folder.js';
import VersionHistory from '../models/VersionHistory.js';
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

    // Verify folder resides in the same workspace (if folder is specified)
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
    const documentId = req.params.id;

    // The middleware (requireDocumentAccess) has already fetched and attached the document
    const document = req.document;

    // Update lastOpened timestamp asynchronously
    document.lastOpened = Date.now();
    await document.save();

    res.status(200).json({
      success: true,
      data: document,
      permission: req.docPermission // read or write permission level
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update document metadata or auto-save content
 * @route   PUT /api/documents/:id
 * @access  Private (Write permissions required)
 */
export const updateDocument = async (req, res, next) => {
  try {
    const { errors, isValid } = validateUpdateDocumentInput(req.body);
    if (!isValid) {
      res.status(400);
      return next(new Error(Object.values(errors)[0]));
    }

    const { title, emoji, isPublic, isArchived, folder, content } = req.body;
    const document = req.document; // attached by middleware
    const userId = req.user._id;

    // If moving folder, verify destination is valid and within the same workspace
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
    
    // Support database direct persistence of content state (e.g. periodically auto-saved)
    if (content !== undefined) {
      const contentChanged = JSON.stringify(content) !== JSON.stringify(document.content);
      if (contentChanged) {
        document.content = content;
        document.markModified('content');
        
        // Auto-create a Version History snapshot if contents change
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
 * @access  Private (Write permissions required)
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
 * @access  Private (Write permissions required)
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
 * @access  Private (Write permissions required)
 */
export const deleteDocument = async (req, res, next) => {
  try {
    const documentId = req.params.id;

    // 1. Delete all version history snapshots of this document
    await VersionHistory.deleteMany({ document: documentId });

    // 2. Delete the document record itself
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
