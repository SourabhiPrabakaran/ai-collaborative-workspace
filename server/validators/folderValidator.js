const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Helper to check valid Mongoose ObjectId
 * @param {string} id
 * @returns {boolean}
 */
const isValidObjectId = (id) => id && OBJECT_ID_REGEX.test(id);

/**
 * Validate Folder Create fields
 * @param {Object} data
 * @returns {Object} { isValid, errors }
 */
export const validateCreateFolderInput = (data) => {
  const errors = {};
  const { name, workspace, parentFolder } = data;

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.name = 'Folder name is required';
  }

  if (!workspace || !isValidObjectId(workspace)) {
    errors.workspace = 'A valid Workspace ID is required';
  }

  if (parentFolder && !isValidObjectId(parentFolder)) {
    errors.parentFolder = 'Parent Folder ID must be a valid ID';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

/**
 * Validate Folder Update fields (rename / move)
 * @param {Object} data
 * @returns {Object} { isValid, errors }
 */
export const validateUpdateFolderInput = (data) => {
  const errors = {};
  const { name, parentFolder } = data;

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    errors.name = 'Folder name cannot be empty';
  }

  if (parentFolder !== undefined && parentFolder !== null && !isValidObjectId(parentFolder)) {
    errors.parentFolder = 'Parent Folder ID must be a valid ID or null';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};
