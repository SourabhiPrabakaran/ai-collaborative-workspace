import Activity from '../models/Activity.js';

/**
 * Creates an activity feed item
 * @param {Object} params
 * @param {string} params.workspace - Workspace ID
 * @param {string} [params.document] - Document ID (optional)
 * @param {string} params.user - User ID who triggered the action
 * @param {string} params.type - Activity type (enum values)
 * @param {Object} [params.details] - Dynamic metadata details
 * @returns {Promise<Object>} The activity document or undefined on error
 */
export const logActivity = async ({ workspace, document = null, user, type, details = {} }) => {
  try {
    const activity = await Activity.create({
      workspace,
      document,
      user,
      type,
      details
    });
    return activity;
  } catch (err) {
    console.error('[ActivityLogger] Error logging activity:', err.message);
  }
};
