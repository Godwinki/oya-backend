// routes/memberRoutes.js
const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const accountController = require('../controllers/accountController');
const { memberValidationRules, validateMember } = require('../middleware/memberMiddleware');

// CRUD routes
router.post('/', memberValidationRules, validateMember, memberController.createMember);
router.get('/', memberController.getMembers);
router.get('/:id', memberController.getMemberById);
router.put('/:id', memberValidationRules, validateMember, memberController.updateMember);
router.delete('/:id', memberController.deleteMember);

// Member accounts and payments
router.post('/:id/initial-payment', accountController.processInitialPayment);
router.get('/:id/accounts', accountController.getMemberAccounts);
router.post('/:id/accounts', accountController.createMemberAccount);
router.get('/:id/accounts/:accountId', accountController.getAccountDetails);
router.post('/:id/accounts/:accountId/transactions', accountController.processTransaction);

module.exports = router;
