// routes/memberRoutes.js
const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const accountController = require('../controllers/accountController');
const { memberValidationRules, validateMember } = require('../middleware/memberMiddleware');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

// Get next available account number
router.get('/next-account-number', protect, apiLimiter, memberController.getNextAccountNumber);

// CRUD routes
router.post('/', protect, apiLimiter, memberValidationRules, validateMember, memberController.createMember);
router.get('/', protect, apiLimiter, memberController.getMembers);
router.get('/:id', protect, apiLimiter, memberController.getMemberById);
router.put('/:id', protect, apiLimiter, memberValidationRules, validateMember, memberController.updateMember);
router.delete('/:id', protect, restrictTo('admin', 'manager'), apiLimiter, memberController.deleteMember);

// Member accounts and payments
router.post('/:id/initial-payment', protect, apiLimiter, accountController.processInitialPayment);
router.get('/:id/accounts', protect, apiLimiter, accountController.getMemberAccounts);
router.post('/:id/accounts', protect, restrictTo('admin', 'manager', 'cashier'), apiLimiter, accountController.createMemberAccount);
router.get('/:id/accounts/:accountId', protect, apiLimiter, accountController.getAccountDetails);
router.post('/:id/accounts/:accountId/transactions', protect, restrictTo('admin', 'manager', 'cashier'), apiLimiter, accountController.processTransaction);

module.exports = router;
