import VersionHistory from '../models/VersionHistory.js';
import Document from '../models/Document.js';
import Activity from '../models/Activity.js';
import { logAudit } from '../utils/auditLogger.js';
import { logActivity } from '../utils/activityLogger.js';
import { restoreDocumentInSession } from '../socket.js';

/**
 * @desc    Get paginated version history list for a document
 * @route   GET /api/documents/:id/versions
 * @access  Private (Read access required)
 */
export const getDocumentVersions = async (req, res, next) => {
  try {
    const documentId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await VersionHistory.countDocuments({ document: documentId });
    const versions = await VersionHistory.find({ document: documentId })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: versions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Manually create a document snapshot
 * @route   POST /api/documents/:id/versions
 * @access  Private (Write access required)
 */
export const createDocumentVersion = async (req, res, next) => {
  try {
    const documentId = req.params.id;
    const { description } = req.body;
    const userId = req.user._id;

    // Permissions check: Editor / Admin / Owner only
    if (req.docPermission !== 'write') {
      res.status(403);
      return next(new Error('Access Denied: Only Owners, Admins, and Editors can create versions'));
    }

    const document = await Document.findById(documentId);
    if (!document) {
      res.status(404);
      return next(new Error('Document not found'));
    }

    // Duplicate snapshot prevention: check latest content
    const latest = await VersionHistory.findOne({ document: documentId }).sort({ createdAt: -1 });
    if (latest && JSON.stringify(document.content) === JSON.stringify(latest.content)) {
      res.status(400);
      return next(new Error('No content changes detected. Snapshot creation skipped.'));
    }

    const versionCount = await VersionHistory.countDocuments({ document: documentId });
    const versionNumber = versionCount + 1;

    const version = await VersionHistory.create({
      document: documentId,
      content: document.content,
      createdBy: userId,
      version: versionNumber,
      description: description || `Snapshot v${versionNumber}`
    });

    // Log Activity Feed
    await logActivity({
      workspace: document.workspace,
      document: documentId,
      user: userId,
      type: 'VERSION_CREATED',
      details: { versionNumber, description }
    });

    res.status(201).json({
      success: true,
      data: version
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get details / content of a specific version
 * @route   GET /api/documents/:id/versions/:versionId
 * @access  Private (Read access required)
 */
export const getVersionDetails = async (req, res, next) => {
  try {
    const documentId = req.params.id;
    const versionId = req.params.versionId;

    const version = await VersionHistory.findOne({ _id: versionId, document: documentId })
      .populate('createdBy', 'fullName email');

    if (!version) {
      res.status(404);
      return next(new Error('Version not found'));
    }

    res.status(200).json({
      success: true,
      data: version
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Restore a previous version
 * @route   POST /api/documents/:id/versions/:versionId/restore
 * @access  Private (Write access required)
 */
export const restoreDocumentVersion = async (req, res, next) => {
  try {
    const documentId = req.params.id;
    const versionId = req.params.versionId;
    const userId = req.user._id;

    // Permissions check: Editor / Admin / Owner only
    if (req.docPermission !== 'write') {
      res.status(403);
      return next(new Error('Access Denied: Only Owners, Admins, and Editors can restore versions'));
    }

    const document = await Document.findById(documentId);
    if (!document) {
      res.status(404);
      return next(new Error('Document not found'));
    }

    const targetVersion = await VersionHistory.findOne({ _id: versionId, document: documentId });
    if (!targetVersion) {
      res.status(404);
      return next(new Error('Target version not found'));
    }

    // 1. Create a snapshot of the current state immediately before restoring
    const versionCount = await VersionHistory.countDocuments({ document: documentId });
    const versionNumber = versionCount + 1;

    await VersionHistory.create({
      document: documentId,
      content: document.content,
      createdBy: userId,
      version: versionNumber,
      description: `Backup before restoring v${targetVersion.version}`
    });

    // 2. Overwrite the document content in the database
    document.content = targetVersion.content;
    await document.save();

    // 3. Broadcast the restored content through Yjs if there is an active session
    restoreDocumentInSession(documentId, targetVersion.content);

    // 4. Log to AuditLog
    await logAudit({
      user: userId,
      action: 'restored version',
      workspace: document.workspace,
      document: documentId,
      targetUser: null
    });

    // 5. Log Activity Feed
    await logActivity({
      workspace: document.workspace,
      document: documentId,
      user: userId,
      type: 'VERSION_RESTORED',
      details: { 
        versionNumber: targetVersion.version, 
        restoredFromVersionId: versionId 
      }
    });

    res.status(200).json({
      success: true,
      message: `Successfully restored version v${targetVersion.version}`,
      data: document
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get chronological workspace activity feed
 * @route   GET /api/documents/:id/activity
 * @access  Private (Read access required)
 */
export const getWorkspaceActivity = async (req, res, next) => {
  try {
    const documentId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const document = await Document.findById(documentId);
    if (!document) {
      res.status(404);
      return next(new Error('Document not found'));
    }

    const total = await Activity.countDocuments({ workspace: document.workspace });
    const activities = await Activity.find({ workspace: document.workspace })
      .populate('user', 'fullName email avatarUrl')
      .populate('document', 'title emoji')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};
