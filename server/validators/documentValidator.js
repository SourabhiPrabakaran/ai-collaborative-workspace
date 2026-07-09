const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const isValidObjectId = (id) => id && OBJECT_ID_REGEX.test(id);

/**
 * Validate Document Create fields
 * @param {Object} data
 * @returns {Object} { isValid, errors }
 */
export const validateCreateDocumentInput = (data) => {
  const errors = {};
  const { title, workspace, folder } = data;

  if (title !== undefined && typeof title !== 'string') {
    errors.title = 'Document title must be a string';
  }

  if (!workspace || !isValidObjectId(workspace)) {
    errors.workspace = 'A valid Workspace ID is required';
  }

  if (folder && !isValidObjectId(folder)) {
    errors.folder = 'Folder ID must be a valid ID';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

/**
 * Validate Document Update fields
 * @param {Object} data
 * @returns {Object} { isValid, errors }
 */
export const validateUpdateDocumentInput = (data) => {
  const errors = {};
  const { title, emoji, isPublic, isArchived, folder } = data;

  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    errors.title = 'Document title cannot be empty';
  }

  if (emoji !== undefined && typeof emoji !== 'string') {
    errors.emoji = 'Emoji representation must be a string';
  }

  if (isPublic !== undefined && typeof isPublic !== 'boolean') {
    errors.isPublic = 'Public flag must be a boolean';
  }

  if (isArchived !== undefined && typeof isArchived !== 'boolean') {
    errors.isArchived = 'Archived flag must be a boolean';
  }

  if (folder !== undefined && folder !== null && !isValidObjectId(folder)) {
    errors.folder = 'Folder ID must be a valid ID or null';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};
