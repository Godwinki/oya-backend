// routes/settingRoutes.js
const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { readOnlyLimiter } = require('../middleware/rateLimiter');

router.get('/', readOnlyLimiter, settingController.getAllSettings);
router.get('/:key', readOnlyLimiter, settingController.getSetting);
router.put('/:key', settingController.upsertSetting);
router.delete('/:key', settingController.deleteSetting);

module.exports = router;
