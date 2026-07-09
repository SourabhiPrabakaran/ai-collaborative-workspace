import Notification, { NOTIFICATION_TYPES } from '../models/Notification.js';
import { sendLiveNotification } from '../socket.js';

export { NOTIFICATION_TYPES };

/**
 * Creates a notification in the database and broadcasts it live via Socket.io
 * @param {Object} params
 * @param {string} params.user - Target User ID
 * @param {string} params.type - Notification type ('invitation', 'mention', etc.)
 * @param {string} params.title - Title
 * @param {string} params.message - Content message
 * @param {string} [params.link] - Navigation link URL on click
 * @returns {Promise<Object>} The created notification document
 */
export const createNotification = async ({ user, type, title, message, link = '' }) => {
  try {
    const notification = await Notification.create({
      user,
      type,
      title,
      message,
      link
    });

    // Populate user references or details if needed. For now, sending flat JSON is clean
    sendLiveNotification(user, notification);

    return notification;
  } catch (err) {
    console.error('[NotificationService] Error creating notification:', err.message);
  }
};
