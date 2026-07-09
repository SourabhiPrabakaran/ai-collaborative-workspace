import Workspace from '../models/Workspace.js';
import Folder from '../models/Folder.js';
import Document from '../models/Document.js';
import VersionHistory from '../models/VersionHistory.js';
import { validateCreateWorkspaceInput, validateUpdateWorkspaceInput } from '../validators/workspaceValidator.js';

/**
 * @desc    Create a new workspace
 * @route   POST /api/workspaces
 * @access  Private
 */
export const createWorkspace = async (req, res, next) => {
  try {
    const { errors, isValid } = validateCreateWorkspaceInput(req.body);
    if (!isValid) {
      res.status(400);
      return next(new Error(Object.values(errors)[0]));
    }

    const { name, icon, coverImage } = req.body;
    const userId = req.user._id;

    const workspace = await Workspace.create({
      name,
      owner: userId,
      icon: icon || undefined,
      coverImage: coverImage || undefined,
      members: [{ user: userId, role: 'admin' }] // Owner is also admin member
    });

    res.status(201).json({
      success: true,
      data: workspace
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user workspaces (owned or joined)
 * @route   GET /api/workspaces
 * @access  Private
 */
export const getUserWorkspaces = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Retrieve workspaces where user is owner or listed in members
    const workspaces = await Workspace.find({
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    }).populate('owner', 'fullName email avatarUrl');

    res.status(200).json({
      success: true,
      data: workspaces
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get details and member list of workspace
 * @route   GET /api/workspaces/:id
 * @access  Private
 */
export const getWorkspaceById = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'fullName email avatarUrl')
      .populate('members.user', 'fullName email avatarUrl');

    if (!workspace) {
      res.status(404);
      return next(new Error('Workspace not found'));
    }

    res.status(200).json({
      success: true,
      data: workspace
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a workspace
 * @route   PUT /api/workspaces/:id
 * @access  Private (Owner / Admin level check handled by Middleware)
 */
export const updateWorkspace = async (req, res, next) => {
  try {
    const { errors, isValid } = validateUpdateWorkspaceInput(req.body);
    if (!isValid) {
      res.status(400);
      return next(new Error(Object.values(errors)[0]));
    }

    const { name, icon, coverImage, favorite } = req.body;

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      res.status(404);
      return next(new Error('Workspace not found'));
    }

    if (name !== undefined) workspace.name = name;
    if (icon !== undefined) workspace.icon = icon;
    if (coverImage !== undefined) workspace.coverImage = coverImage;
    if (favorite !== undefined) workspace.favorite = favorite;

    await workspace.save();

    res.status(200).json({
      success: true,
      data: workspace
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete workspace (permanently destroys all folders, files, and histories)
 * @route   DELETE /api/workspaces/:id
 * @access  Private (Only Workspace Owner check)
 */
export const deleteWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      res.status(404);
      return next(new Error('Workspace not found'));
    }

    // Owner check: Only the owner can delete the workspace entirely
    if (workspace.owner.toString() !== req.user._id.toString()) {
      res.status(403);
      return next(new Error('Access Denied: Only the workspace owner can delete it'));
    }

    const workspaceId = workspace._id;

    // 1. Delete all version histories linked to documents in this workspace
    const documents = await Document.find({ workspace: workspaceId });
    const documentIds = documents.map(doc => doc._id);
    await VersionHistory.deleteMany({ document: { $in: documentIds } });

    // 2. Delete all documents in this workspace
    await Document.deleteMany({ workspace: workspaceId });

    // 3. Delete all folders in this workspace
    await Folder.deleteMany({ workspace: workspaceId });

    // 4. Delete the workspace record itself
    await Workspace.findByIdAndDelete(workspaceId);

    res.status(200).json({
      success: true,
      message: 'Workspace and all associated contents deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
