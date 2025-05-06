const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const activityController = require('../controllers/activityController');

const router = express.Router();

// Add debug middleware
router.use((req, res, next) => {
  console.log('Activity route accessed:', req.method, req.url);
  next();
});

// Protect all routes
router.use(protect);

router.get('/', activityController.getActivityLogs);
router.post('/', activityController.logActivity);

module.exports = router; 