const express = require('express');
const { authLimiter } = require('../middleware/rateLimiter');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

const router = express.Router();

// Public routes
router.post('/login', authLimiter, userController.login);

// Protected routes
router.use(protect); // All routes after this middleware will require authentication

// Auth routes
router.post('/logout', authLimiter, userController.logout);
router.post('/change-password', userController.changePassword);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password/:token', userController.resetPassword);

// User profile routes
router.get('/profile', userController.getProfile);
router.patch('/profile', userController.updateProfile);

// Admin only routes - Special routes first
router.get('/locked', restrictTo('admin'), userController.getLockedAccounts);
router.post('/register', restrictTo('admin'), userController.register);

// Admin only routes - ID parameter routes last
router.get('/', restrictTo('admin'), userController.getAllUsers);
router.get('/:id', restrictTo('admin'), userController.getUser);
router.patch('/:id', restrictTo('admin'), userController.updateUser);
router.delete('/:id', restrictTo('admin'), userController.deleteUser);
router.post('/:id/unlock', restrictTo('admin'), userController.unlockAccount);

module.exports = router; 