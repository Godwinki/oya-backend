const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { apiLimiter, bypassRateLimiter } = require('../middleware/rateLimiter');
const notificationController = require('../controllers/notificationController');

// GET /api/notifications - Get user's notifications
router.get('/', protect, apiLimiter, notificationController.getUserNotifications);

// GET /api/notifications/unread-count - Get user's unread notification count
router.get('/unread-count', protect, bypassRateLimiter, notificationController.getUnreadCount);

// POST /api/notifications - Create a notification (admin only)
router.post('/', protect, apiLimiter, notificationController.createNotification);

// PATCH /api/notifications/:id/mark-read - Mark a notification as read
router.patch('/:id/mark-read', protect, apiLimiter, notificationController.markAsRead);

// POST /api/notifications/mark-all-read - Mark all user's notifications as read
router.post('/mark-all-read', protect, apiLimiter, notificationController.markAllAsRead);

module.exports = router;
