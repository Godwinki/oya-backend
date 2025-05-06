const express = require('express');
const router = express.Router();
const budgetCategoryController = require('../controllers/budgetCategoryController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { readOnlyLimiter } = require('../middleware/rateLimiter');

// Apply read-only rate limiter to GET endpoints
router.get('/', readOnlyLimiter, budgetCategoryController.getBudgetCategories);

// Apply authentication for write operations
router.use(protect);

router
  .route('/')
  .post(restrictTo('admin', 'manager'), budgetCategoryController.createBudgetCategory);

router
  .route('/:id')
  .patch(restrictTo('admin', 'manager'), budgetCategoryController.updateBudgetCategory)
  .delete(restrictTo('admin'), budgetCategoryController.deleteBudgetCategory);

// Add the route for allocating budget to a category
router
  .route('/:id/allocate')
  .post(restrictTo('admin', 'manager'), budgetCategoryController.allocateBudgetToCategory);

module.exports = router; 