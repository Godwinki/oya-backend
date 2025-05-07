// routes/accountRoutes.js
const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const auth = require('../middleware/authMiddleware');

// Get all account types (for dropdown menus)
router.get('/account-types', 
  auth.protect, 
  accountController.getAccountTypes
);

// Get a specific account type
router.get('/account-types/:id', 
  auth.protect, 
  accountController.getAccountTypeById
);

// Create a new account type (admin only)
router.post('/account-types', 
  auth.protect, 
  accountController.createAccountType
);

// Update an account type (admin only)
router.put('/account-types/:id', 
  auth.protect, 
  accountController.updateAccountType
);

// Get accounts for a specific member
router.get('/member/:id', 
  auth.protect, 
  accountController.getMemberAccounts
);

// Create a new account for a member
router.post('/', 
  auth.protect, 
  accountController.createMemberAccount
);

// Get all accounts for a member
router.get('/member/:memberId', 
  auth.protect, 
  accountController.getMemberAccounts
);

// Get specific account details including transactions
router.get('/:id', 
  auth.protect, 
  accountController.getAccountDetails
);

// Process a transaction (deposit or withdrawal)
router.post('/transaction', 
  auth.protect, 
  accountController.processTransaction
);

module.exports = router;
