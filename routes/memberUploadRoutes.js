// memberUploadRoutes.js
const express = require('express');
const router = express.Router();
const memberUploadController = require('../controllers/memberUploadController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Generate and download Excel template
router.get('/template', protect, restrictTo('admin', 'manager'), memberUploadController.generateTemplate);

// Upload Excel file with member data
router.post('/upload', protect, restrictTo('admin', 'manager'), memberUploadController.uploadMembers);

module.exports = router;
