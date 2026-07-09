import Folder from '../models/Folder.js';
import Document from '../models/Document.js';
import VersionHistory from '../models/VersionHistory.js';
import { validateCreateFolderInput, validateUpdateFolderInput } from '../validators/folderValidator.js';

/**
 * Helper: Recursive folder content deletion (folders, sub-folders, documents, version histories)
 */
const deleteFolderContentRecursive = async (folderId) => {
  // 1. Get and delete all nested sub-folders recursively
  const subFolders = await Folder.find({ parentFolder: folderId });
  for (const subFolder of subFolders) {
    await deleteFolderContentRecursive(subFolder._id);
  }

  // 2. Find all documents in this folder
  const docs = await Document.find({ folder: folderId });
  const docIds = docs.map(d => d._id);

  // 3. Cascading delete VersionHistory records
  if (docIds.length > 0) {
    await VersionHistory.deleteMany({ document: { $in: docIds } });
  }

  // 4. Delete the documents in the folder
  await Document.deleteMany({ folder: folderId });

  // 5. Delete this folder record
  await Folder.findByIdAndDelete(folderId);
};

/**
 * Helper: Recursively checks if folderA is a descendant of folderB
 * Used to prevent circular nesting when moving folders
 */
const isFolderDescendant = async (parentCheckId, childCheckId) => {
  if (!parentCheckId) return false;
  if (parentCheckId.toString() === childCheckId.toString()) return true;

  const parentFolder = await Folder.findById(parentCheckId);
  if (!parentFolder || !parentFolder.parentFolder) return false;

  return isFolderDescendant(parentFolder.parentFolder, childCheckId);
};

/**
 * @desc    Create a new folder (supports unlimited nesting)
 * @route   POST /api/folders
 * @access  Private
 */
export const createFolder = async (req, res, next) => {
  try {
    const { errors, isValid } = validateCreateFolderInput(req.body);
    if (!isValid) {
      res.status(400);
      return next(new Error(Object.values(errors)[0]));
    }

    const { name, workspace, parentFolder } = req.body;
    const userId = req.user._id;

    // Check unique constraint at current level
    const duplicate = await Folder.findOne({
      name: name.trim(),
      workspace,
      parentFolder: parentFolder || null
    });

    if (duplicate) {
      res.status(400);
      return next(new Error(`A folder named "${name}" already exists at this level`));
    }

    const folder = await Folder.create({
      name: name.trim(),
      workspace,
      parentFolder: parentFolder || null,
      createdBy: userId
    });

    res.status(201).json({
      success: true,
      data: folder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a folder (Rename / Move)
 * @route   PUT /api/folders/:id
 * @access  Private
 */
export const updateFolder = async (req, res, next) => {
  try {
    const { errors, isValid } = validateUpdateFolderInput(req.body);
    if (!isValid) {
      res.status(400);
      return next(new Error(Object.values(errors)[0]));
    }

    const { name, parentFolder } = req.body;
    const folderId = req.params.id;

    const folder = await Folder.findById(folderId);
    if (!folder) {
      res.status(404);
      return next(new Error('Folder not found'));
    }

    // Handle Folder Move with safety checks
    if (parentFolder !== undefined) {
      if (parentFolder !== null) {
        // Prevent moving a folder into itself
        if (folderId.toString() === parentFolder.toString()) {
          res.status(400);
          return next(new Error('Cannot move a folder into itself'));
        }

        // Prevent circular reference (moving a parent folder into one of its subfolders)
        const isCircular = await isFolderDescendant(parentFolder, folderId);
        if (isCircular) {
          res.status(400);
          return next(new Error('Cannot move a folder into one of its subfolders'));
        }

        // Verify target parent folder exists and is in the same workspace
        const targetParent = await Folder.findById(parentFolder);
        if (!targetParent) {
          res.status(404);
          return next(new Error('Target parent folder does not exist'));
        }

        if (targetParent.workspace.toString() !== folder.workspace.toString()) {
          res.status(400);
          return next(new Error('Target parent folder belongs to a different workspace'));
        }
      }

      folder.parentFolder = parentFolder;
    }

    // Handle Folder Rename
    if (name !== undefined) {
      // Check unique constraint at target level
      const duplicate = await Folder.findOne({
        _id: { $ne: folderId },
        name: name.trim(),
        workspace: folder.workspace,
        parentFolder: folder.parentFolder
      });

      if (duplicate) {
        res.status(400);
        return next(new Error(`A folder named "${name}" already exists at this level`));
      }

      folder.name = name.trim();
    }

    await folder.save();

    res.status(200).json({
      success: true,
      data: folder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a folder and all its contents recursively
 * @route   DELETE /api/folders/:id
 * @access  Private
 */
export const deleteFolder = async (req, res, next) => {
  try {
    const folderId = req.params.id;
    const folder = await Folder.findById(folderId);

    if (!folder) {
      res.status(404);
      return next(new Error('Folder not found'));
    }

    // Call recursive content purging
    await deleteFolderContentRecursive(folderId);

    res.status(200).json({
      success: true,
      message: 'Folder and all its nested subfolders and documents deleted recursively'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get complete folder and document tree for workspace (Sidebar API)
 * @route   GET /api/folders/workspace/:workspaceId
 * @access  Private
 */
export const getWorkspaceTree = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    // Fetch folders and documents simultaneously
    const [folders, documents] = await Promise.all([
      Folder.find({ workspace: workspaceId }).lean(),
      Document.find({ workspace: workspaceId, isArchived: false })
        .select('title emoji folder workspace lastOpened updatedAt')
        .lean()
    ]);

    // Create a fast lookup map for folders
    const folderMap = {};
    folders.forEach((folder) => {
      folderMap[folder._id.toString()] = {
        ...folder,
        folders: [],
        documents: []
      };
    });

    const rootFolders = [];
    const rootDocuments = [];

    // Construct hierarchy for folders
    folders.forEach((folder) => {
      const mappedFolder = folderMap[folder._id.toString()];
      if (folder.parentFolder) {
        const parentIdStr = folder.parentFolder.toString();
        if (folderMap[parentIdStr]) {
          folderMap[parentIdStr].folders.push(mappedFolder);
        } else {
          // Parent folder not in map (e.g. dangling reference), push to root
          rootFolders.push(mappedFolder);
        }
      } else {
        rootFolders.push(mappedFolder);
      }
    });

    // Nest documents under folders
    documents.forEach((doc) => {
      if (doc.folder) {
        const folderIdStr = doc.folder.toString();
        if (folderMap[folderIdStr]) {
          folderMap[folderIdStr].documents.push(doc);
        } else {
          rootDocuments.push(doc);
        }
      } else {
        rootDocuments.push(doc);
      }
    });

    res.status(200).json({
      success: true,
      data: {
        folders: rootFolders,
        documents: rootDocuments
      }
    });
  } catch (error) {
    next(error);
  }
};
