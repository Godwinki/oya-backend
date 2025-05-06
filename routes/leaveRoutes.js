const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { readOnlyLimiter } = require('../middleware/rateLimiter');
const { generateLeavePDF } = require('../utils/leavePDFGenerator');

// Apply read-only rate limiter to GET endpoints
router.get('/', readOnlyLimiter, protect, leaveController.getLeaveRequests);
router.get('/:id', readOnlyLimiter, protect, leaveController.getLeaveRequestById);

// PDF endpoint
router.get('/:id/pdf', protect, async (req, res) => {
  const db = require('../models');
  const leave = await db.Leave.findByPk(req.params.id, {
    include: [
      { model: db.User, as: 'requestedBy', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
      { model: db.User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
      { model: db.User, as: 'rejector', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
      { model: db.Department, as: 'department', attributes: ['id', 'name', 'code'] }
    ]
  });
  if (!leave) return res.status(404).json({ message: 'Leave not found' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=leave-${leave.requestNumber}.pdf`);
  require('../utils/leavePDFGenerator').generateLeavePDF(leave, res);
});

// Apply authentication for write operations
router.use(protect);

// Create leave request - any authenticated user
router.post('/', leaveController.createLeaveRequest);

// Approve/reject leave requests - managers and admins only
router.post('/:id/approve', restrictTo('manager', 'admin'), leaveController.approveLeaveRequest);
router.post('/:id/reject', restrictTo('manager', 'admin'), leaveController.rejectLeaveRequest);

module.exports = router;