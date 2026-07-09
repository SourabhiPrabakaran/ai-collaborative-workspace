import express from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Require auth for all notification endpoints

router.get('/', getUserNotifications);
router.patch('/read-all', markAllNotificationsAsRead); // Must go before /:id/read
router.patch('/:id/read', markNotificationAsRead);

export default router;
