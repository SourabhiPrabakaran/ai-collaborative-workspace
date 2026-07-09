/**
 * Validate Workspace Create fields
 * @param {Object} data
 * @returns {Object} { isValid, errors }
 */
export const validateCreateWorkspaceInput = (data) => {
  const errors = {};
  const { name } = data;

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.name = 'Workspace name is required';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

/**
 * Validate Workspace Update fields
 * @param {Object} data
 * @returns {Object} { isValid, errors }
 */
export const validateUpdateWorkspaceInput = (data) => {
  const errors = {};
  const { name, icon, coverImage, favorite } = data;

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    errors.name = 'Workspace name cannot be empty';
  }

  if (icon !== undefined && typeof icon !== 'string') {
    errors.icon = 'Workspace icon must be a string';
  }

  if (coverImage !== undefined && typeof coverImage !== 'string') {
    errors.coverImage = 'Workspace cover image must be a URL string';
  }

  if (favorite !== undefined && typeof favorite !== 'boolean') {
    errors.favorite = 'Favorite must be a boolean';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};
