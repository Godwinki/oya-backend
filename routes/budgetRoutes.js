const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

// Get all budgets
router.get('/', restrictTo('admin', 'manager'), budgetController.getBudgets);

// Create new budget
router.post('/', restrictTo('admin'), budgetController.createBudget);

// Get specific budget
router.get('/:id', restrictTo('admin', 'manager'), budgetController.getBudget);

// Update budget
router.patch('/:id', restrictTo('admin'), budgetController.updateBudget);

// Delete budget
router.delete('/:id', restrictTo('admin'), budgetController.deleteBudget);

module.exports = router; 