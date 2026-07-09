import AuditLog from '../models/AuditLog.js';

/**
 * Records an entry into the AuditLog collection for tracking workspace and document events.
 */
export const logAudit = async ({ user, action, workspace = null, document = null, targetUser = null }) => {
  try {
    await AuditLog.create({
      user,
      action,
      workspace,
      document,
      targetUser
    });
  } catch (err) {
    console.error('[AuditLog] Error recording action:', err.message);
  }
};
