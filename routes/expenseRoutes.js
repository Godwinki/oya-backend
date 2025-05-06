const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { apiLimiter, resourceIntensiveLimiter, bypassRateLimiter } = require('../middleware/rateLimiter');
const expenseController = require('../controllers/expenseController');
const upload = require('../middleware/multer');

// GET /api/expenses - Get all expenses with optional filters
router.get('/', protect, apiLimiter, expenseController.getAllExpenses);

// GET /api/expenses/:id - Get expense by ID
router.get('/:id', protect, apiLimiter, expenseController.getExpenseById);

// POST /api/expenses - Create a new expense request
router.post('/', protect, apiLimiter, expenseController.createExpenseRequest);

// POST /api/expenses/:id/items - Add expense item to an expense request
router.post('/:id/items', protect, apiLimiter, expenseController.addExpenseItem);

// POST /api/expenses/:id/submit - Submit an expense request for approval
router.post('/:id/submit', protect, apiLimiter, expenseController.submitExpenseRequest);

// POST /api/expenses/:id/approve/manager - Manager approval of an expense request
router.post(
  '/:id/approve/manager',
  protect,
  restrictTo('manager', 'admin'),
  apiLimiter,
  expenseController.approveByManager
);

// POST /api/expenses/:id/approve/accountant - Accountant approval of an expense request
router.post(
  '/:id/approve/accountant',
  protect,
  restrictTo('accountant', 'admin'),
  apiLimiter,
  expenseController.approveByAccountant
);

// POST /api/expenses/:id/process - Cashier processing of an expense request
router.post(
  '/:id/process',
  protect,
  restrictTo('cashier', 'admin'),
  apiLimiter,
  expenseController.processByCashier
);

// POST /api/expenses/:id/complete - Mark an expense as completed
router.post(
  '/:id/complete',
  protect,
  apiLimiter,
  expenseController.markExpenseCompleted
);

// POST /api/expenses/:id/reject - Reject an expense request
router.post(
  '/:id/reject',
  protect,
  apiLimiter,
  expenseController.rejectExpenseRequest
);

// POST /api/expenses/:id/receipts - Upload a receipt for an expense
router.post(
  '/:id/receipts',
  protect,
  upload.single('receipt'),
  apiLimiter,
  expenseController.uploadReceipt
);

// GET /api/expenses/:id/pdf - Get the PDF for an expense
router.get(
  '/:id/pdf',
  protect,
  resourceIntensiveLimiter, // Use resource-intensive rate limiter for PDF generation
  expenseController.generateExpensePdf
);

// GET /api/expenses/user/pending-completion - Get user's expenses pending completion
router.get(
  '/user/pending-completion',
  protect,
  apiLimiter,
  expenseController.getPendingCompletionExpenses
);

// GET /api/expenses/user/count - Get count of user's expenses by status
router.get(
  '/user/count',
  protect,
  apiLimiter,
  expenseController.getUserExpenseCount
);

module.exports = router; 