// smsRoutes.js
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const smsController = require('../controllers/smsController');
const smsMemberController = require('../controllers/smsMemberController');
const smsProviderController = require('../controllers/smsProviderController');
const smsMessageController = require('../controllers/smsMessageController');

// --------------------- Templates ---------------------
router.get('/templates', 
  protect, 
  smsController.getAllTemplates
);

router.get('/templates/:id', 
  protect, 
  smsController.getTemplateById
);

router.post('/templates', 
  protect, 
  // Allow all authenticated users to create templates for testing purposes
  // restrictTo('ADMIN', 'MANAGER', 'COMMUNICATION_OFFICER'), 
  smsController.createTemplate
);

router.put('/templates/:id', 
  protect, 
  // Allow all authenticated users to update templates for testing purposes
  // restrictTo('ADMIN', 'MANAGER', 'COMMUNICATION_OFFICER'), 
  smsController.updateTemplate
);

router.delete('/templates/:id', 
  protect, 
  // Allow all authenticated users to delete templates for testing purposes
  // restrictTo('ADMIN', 'MANAGER'), 
  smsController.deleteTemplate
);

// --------------------- Contact Categories ---------------------
router.get('/categories', 
  protect, 
  smsController.getAllContactCategories
);

router.get('/categories/:id', 
  protect, 
  smsController.getContactCategoryById
);

router.post('/categories', 
  protect, 
  // Allow all authenticated users to create categories for testing purposes
  // restrictTo('ADMIN', 'MANAGER', 'COMMUNICATION_OFFICER'), 
  smsController.createContactCategory
);

router.put('/categories/:id', 
  protect, 
  // Allow all authenticated users to update categories for testing purposes
  // restrictTo('ADMIN', 'MANAGER', 'COMMUNICATION_OFFICER'), 
  smsController.updateContactCategory
);

router.delete('/categories/:id', 
  protect, 
  restrictTo('ADMIN', 'MANAGER'), 
  smsController.deleteContactCategory
);

// --------------------- Category Members ---------------------
router.get('/categories/:categoryId/members', 
  protect, 
  smsMemberController.getCategoryMembers
);

router.post('/categories/:categoryId/members', 
  protect, 
  restrictTo('ADMIN', 'MANAGER', 'COMMUNICATION_OFFICER'), 
  smsMemberController.addMembersToCategory
);

router.delete('/categories/:categoryId/members', 
  protect, 
  restrictTo('ADMIN', 'MANAGER', 'COMMUNICATION_OFFICER'), 
  smsMemberController.removeMembersFromCategory
);

// --------------------- Member Groups & Individuals ---------------------
router.get('/groups', 
  protect, 
  smsMemberController.getMemberGroups
);

router.get('/member-groups', 
  protect, 
  smsMemberController.getMemberGroups
);

router.get('/members/search', 
  protect, 
  smsMemberController.searchMembers
);

router.get('/individual-members', 
  protect, 
  smsMemberController.getIndividualMembers
);

// --------------------- Providers ---------------------
router.get('/providers', 
  protect, 
  smsProviderController.getAllProviders
);

router.get('/providers/active', 
  protect, 
  smsProviderController.getActiveProvider
);

router.get('/providers/:id', 
  protect, 
  smsProviderController.getProviderById
);

router.post('/providers', 
  protect, 
  restrictTo('ADMIN'), 
  smsProviderController.createProvider
);

router.put('/providers/:id', 
  protect, 
  restrictTo('ADMIN'), 
  smsProviderController.updateProvider
);

router.delete('/providers/:id', 
  protect, 
  restrictTo('ADMIN'), 
  smsProviderController.deleteProvider
);

router.put('/providers/:id/activate', 
  protect, 
  restrictTo('ADMIN'), 
  smsProviderController.setActiveProvider
);

// --------------------- SMS Balance & Payment ---------------------
router.get('/balance/:providerId', 
  protect, 
  smsProviderController.getProviderBalance
);

router.post('/topup', 
  protect, 
  restrictTo('ADMIN', 'MANAGER'), 
  smsProviderController.topUpSMSBalance
);

router.get('/payment/:transactionId/verify', 
  protect, 
  smsProviderController.verifyPayment
);

// --------------------- Messages ---------------------
router.post('/send', 
  protect, 
  restrictTo('ADMIN', 'MANAGER', 'COMMUNICATION_OFFICER'), 
  smsMessageController.sendSMS
);

router.get('/messages', 
  protect, 
  smsMessageController.getMessageHistory
);

router.get('/messages/:id', 
  protect, 
  smsMessageController.getMessageById
);

router.delete('/messages/:id/cancel', 
  protect, 
  restrictTo('ADMIN', 'MANAGER', 'COMMUNICATION_OFFICER'), 
  smsMessageController.cancelScheduledMessage
);

module.exports = router;
