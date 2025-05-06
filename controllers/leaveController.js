const db = require('../models');
const { createActivity } = require('../utils/activityLog');
const { Op } = require('sequelize');

// Helper to generate request number: LV-date-month-year-random
function generateLeaveRequestNumber() {
  const now = new Date();
  const date = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  return `LV-${date}-${month}-${year}-${random}`;
}

const leaveController = {
  async createLeaveRequest(req, res) {
    try {
      const { type, startDate, endDate, reason } = req.body;
      const userId = req.user.id;

      // Validate dates
      if (new Date(startDate) >= new Date(endDate)) {
        return res.status(400).json({
          message: 'End date must be after start date'
        });
      }

      // Get user and department info (NO eager loading association)
      const user = await db.User.findByPk(userId);
      if (!user || !user.department) {
        return res.status(400).json({
          message: 'User must be assigned to a department'
        });
      }

      // Find department by name (or code if you prefer)
      const department = await db.Department.findOne({
        where: { name: user.department }
      });
      if (!department) {
        return res.status(400).json({
          message: 'Department not found for user'
        });
      }

      // Generate request number
      const requestNumber = generateLeaveRequestNumber();

      const leave = await db.Leave.create({
        userId,
        departmentId: department.id,
        type,
        startDate,
        endDate,
        reason,
        status: 'PENDING',
        requestNumber
      });

      await createActivity({
        action: 'CREATE_LEAVE_REQUEST',
        userId: req.user.id,
        details: {
          leaveId: leave.id,
          type,
          startDate,
          endDate
        }
      });

      const createdLeave = await db.Leave.findByPk(leave.id, {
        include: [{
          model: db.User,
          as: 'requestedBy', // match Leave.js association
          attributes: ['firstName', 'lastName', 'email']
        }]
      });

      res.status(201).json({
        message: 'Leave request created successfully',
        data: createdLeave
      });
    } catch (error) {
      console.error('Error creating leave request:', error);
      res.status(500).json({
        message: 'Error creating leave request',
        error: error.message
      });
    }
  },

  async getLeaveRequests(req, res) {
    try {
      const { status, userId, departmentId } = req.query;
      const filter = {};

      if (status) filter.status = status;
      if (userId) filter.userId = userId;
      if (departmentId) filter.departmentId = departmentId;

      // If user is not admin or manager, they can only see their own leave requests
      if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        filter.userId = req.user.id;
      }

      const leaves = await db.Leave.findAll({
        where: filter,
        include: [{
          model: db.User,
          as: 'requestedBy',  // Updated alias
          attributes: ['firstName', 'lastName', 'email']
        }],
        order: [['createdAt', 'DESC']]
      });

      res.json({
        data: leaves
      });
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      res.status(500).json({
        message: 'Failed to fetch leave requests'
      });
    }
  },

  async getLeaveRequestById(req, res) {
    try {
      const leaveId = req.params.id;
      const leave = await db.Leave.findByPk(leaveId, {
        include: [
          { model: db.User, as: 'requestedBy', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
          { model: db.User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
          { model: db.User, as: 'rejector', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
          { model: db.Department, as: 'department', attributes: ['id', 'name', 'code'] }
        ]
      });
      if (!leave) {
        return res.status(404).json({ message: 'Leave request not found' });
      }
      res.status(200).json({ data: leave });
    } catch (error) {
      console.error('Error fetching leave request:', error);
      res.status(500).json({ message: 'Error fetching leave request', error: error.message });
    }
  },

  async approveLeaveRequest(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      
      const leave = await db.Leave.findByPk(id);
      
      if (!leave) {
        return res.status(404).json({
          message: 'Leave request not found'
        });
      }

      // Only managers and admins can approve leave requests
      if (req.user.role !== 'manager' && req.user.role !== 'admin') {
        return res.status(403).json({
          message: 'You do not have permission to approve leave requests'
        });
      }

      // Cannot approve already approved or rejected leave requests
      if (leave.status !== 'PENDING') {
        return res.status(400).json({
          message: `Cannot approve a leave request that is already ${leave.status.toLowerCase()}`
        });
      }

      leave.status = 'APPROVED';
      leave.approvedBy = req.user.id;
      leave.approvedAt = new Date();
      leave.approvalNotes = req.body.notes || null;
      leave.rejectionReason = null;
      leave.rejectedBy = null;
      leave.rejectedAt = null;
      await leave.save();

      await createActivity({
        action: 'APPROVE_LEAVE_REQUEST',
        userId: req.user.id,
        details: {
          leaveId: leave.id,
          requestNumber: leave.requestNumber
        }
      });

      const updatedLeave = await db.Leave.findByPk(id, {
        include: [
          { model: db.User, as: 'requestedBy', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
          { model: db.User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
          { model: db.User, as: 'rejector', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
          { model: db.Department, as: 'department', attributes: ['id', 'name', 'code'] }
        ]
      });

      res.status(200).json({ data: updatedLeave });
    } catch (error) {
      console.error('Error approving leave request:', error);
      res.status(500).json({
        message: 'Failed to approve leave request'
      });
    }
  },

  async rejectLeaveRequest(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const leave = await db.Leave.findByPk(id);
      
      if (!leave) {
        return res.status(404).json({
          message: 'Leave request not found'
        });
      }

      // Only managers and admins can reject leave requests
      if (req.user.role !== 'manager' && req.user.role !== 'admin') {
        return res.status(403).json({
          message: 'You do not have permission to reject leave requests'
        });
      }

      // Cannot reject already approved or rejected leave requests
      if (leave.status !== 'PENDING') {
        return res.status(400).json({
          message: `Cannot reject a leave request that is already ${leave.status.toLowerCase()}`
        });
      }

      leave.status = 'REJECTED';
      leave.rejectedBy = req.user.id;
      leave.rejectedAt = new Date();
      leave.rejectionReason = req.body.reason || null;
      leave.approvalNotes = null;
      leave.approvedBy = null;
      leave.approvedAt = null;
      await leave.save();

      await createActivity({
        action: 'REJECT_LEAVE_REQUEST',
        userId: req.user.id,
        details: {
          leaveId: leave.id,
          requestNumber: leave.requestNumber
        }
      });

      const updatedLeave = await db.Leave.findByPk(id, {
        include: [
          { model: db.User, as: 'requestedBy', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
          { model: db.User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
          { model: db.User, as: 'rejector', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
          { model: db.Department, as: 'department', attributes: ['id', 'name', 'code'] }
        ]
      });

      res.status(200).json({ data: updatedLeave });
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      res.status(500).json({
        message: 'Failed to reject leave request'
      });
    }
  }
};

module.exports = leaveController;