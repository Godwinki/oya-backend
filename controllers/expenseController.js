const db = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const ExpenseRequest = db.ExpenseRequest;
const ExpenseItem = db.ExpenseItem;
const User = db.User;
const Department = db.Department;
const Receipt = db.Receipt;
const BudgetCategory = db.BudgetCategory;
const BudgetAllocation = db.BudgetAllocation;
const ActivityLog = db.ActivityLog;
const Notification = db.Notification;

// Helper function to create notifications for expense status changes
const createExpenseNotification = async (expense, targetUserId, action, createdBy) => {
  try {
    let title, message;
    
    switch (action) {
      case 'CREATED':
        title = 'New Expense Request';
        message = `A new expense request (${expense.requestNumber}) has been created and needs your review.`;
        break;
      case 'SUBMITTED':
        title = 'Expense Request Submitted';
        message = `Expense request ${expense.requestNumber} has been submitted for approval.`;
        break;
      case 'ACCOUNTANT_APPROVED':
        title = 'Expense Approved by Accountant';
        message = `Expense request ${expense.requestNumber} has been approved by an accountant and awaits manager approval.`;
        break;
      case 'MANAGER_APPROVED':
        title = 'Expense Approved by Manager';
        message = `Expense request ${expense.requestNumber} has been approved by a manager and is ready for processing.`;
        break;
      case 'PROCESSED':
        title = 'Expense Processed';
        message = `Your expense request ${expense.requestNumber} has been processed by the cashier.`;
        break;
      case 'COMPLETED':
        title = 'Expense Completed';
        message = `Your expense request ${expense.requestNumber} has been marked as completed.`;
        break;
      case 'REJECTED':
        title = 'Expense Request Rejected';
        message = `Expense request ${expense.requestNumber} has been rejected.`;
        break;
      default:
        title = 'Expense Update';
        message = `There's an update on expense request ${expense.requestNumber}.`;
    }
    
    await Notification.create({
      userId: targetUserId,
      title,
      message,
      type: 'EXPENSE',
      resourceType: 'ExpenseRequest',
      resourceId: expense.id,
      createdBy,
      metadata: {
        expenseId: expense.id,
        requestNumber: expense.requestNumber,
        status: expense.status
      }
    });
    
    console.log(`Created ${action} notification for user ${targetUserId}`);
  } catch (error) {
    console.error('Error creating expense notification:', error);
    // Don't throw, just log the error to prevent disrupting the main flow
  }
};

// Helper function to notify users with specific roles
const notifyUsersByRole = async (expense, roles, action, createdBy) => {
  try {
    // Find users with the specified roles
    const users = await User.findAll({
      where: {
        role: {
          [Op.in]: roles
        }
      }
    });
    
    for (const user of users) {
      await createExpenseNotification(expense, user.id, action, createdBy);
    }
  } catch (error) {
    console.error('Error notifying users by role:', error);
  }
};

/**
 * Get all expenses with optional filters
 */
exports.getAllExpenses = async (req, res) => {
  try {
    const { status, departmentId } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Base conditions
    const where = {};
    
    // Filter by status if provided
    if (status) {
      where.status = status;
    }
    
    // Filter by department if provided
    if (departmentId) {
      where.departmentId = departmentId;
    }
    
    // Restrict to user's own expenses unless admin/manager/accountant/cashier
    if (!['admin', 'manager', 'accountant', 'cashier'].includes(userRole)) {
      where.userId = userId;
    }
    
    // Get expenses with associated models
    const expenses = await ExpenseRequest.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        },
        {
          model: ExpenseItem,
          as: 'items',
          include: [
            {
              model: BudgetCategory,
              as: 'category',
              attributes: ['id', 'name', 'code']
            }
          ]
        },
        {
          model: Receipt,
          as: 'receipts',
          attributes: ['id', 'fileName', 'filePath', 'fileType', 'uploadedAt']
        },
        {
          model: User,
          as: 'managerApprover',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'accountantApprover',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'cashierProcessor',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'READ',
      details: `Retrieved expenses list with filters: ${JSON.stringify(req.query)}`,
      ipAddress: req.ip
    });
    
    return res.status(200).json({
      status: 'success',
      data: expenses
    });
  } catch (error) {
    console.error('Error getting expenses:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve expenses',
      error: error.message
    });
  }
};

/**
 * Get expense by ID
 */
exports.getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const expense = await ExpenseRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        },
        {
          model: ExpenseItem,
          as: 'items',
          include: [
            {
              model: BudgetCategory,
              as: 'category',
              attributes: ['id', 'name', 'code']
            }
          ]
        },
        {
          model: Receipt,
          as: 'receipts',
          attributes: ['id', 'fileName', 'filePath', 'fileType', 'uploadedAt']
        },
        {
          model: User,
          as: 'managerApprover',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'accountantApprover',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'cashierProcessor',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!expense) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense request not found'
      });
    }
    
    // Check if user has permission to view
    const userRole = req.user.role;
    if (
      expense.userId !== req.user.id && 
      !['admin', 'manager', 'accountant', 'cashier'].includes(userRole)
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to view this expense request'
      });
    }
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'READ',
      details: `Viewed expense request: ${expense.requestNumber}`,
      ipAddress: req.ip
    });
    
    return res.status(200).json({
      status: 'success',
      data: expense
    });
  } catch (error) {
    console.error('Error getting expense:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve expense request',
      error: error.message
    });
  }
};

/**
 * Create a new expense request
 */
exports.createExpenseRequest = async (req, res) => {
  try {
    const {
      title,
      description,
      purpose,
      totalAmount,
      departmentId,
      requiresReceipt = true,
      fiscalYear,
      items = []
    } = req.body;
    
    // Start transaction
    const transaction = await db.sequelize.transaction();
    
    try {
      // Create expense request
      const expenseRequest = await ExpenseRequest.create({
        title,
        description,
        purpose,
        totalEstimatedAmount: totalAmount,
        totalActualAmount: 0,
        departmentId,
        userId: req.user.id,
        requiresReceipt,
        fiscalYear: fiscalYear || new Date().getFullYear(),
        status: 'DRAFT'
      }, { transaction });
      
      // Create expense items if provided
      if (items.length > 0) {
        const expenseItems = items.map(item => ({
          expenseId: expenseRequest.id,
          categoryId: item.categoryId,
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice,
          estimatedAmount: item.quantity ? item.quantity * item.unitPrice : item.unitPrice,
          actualAmount: 0,
          status: 'PENDING',
          notes: item.notes
        }));
        
        await ExpenseItem.bulkCreate(expenseItems, { transaction });
        
        // Update total amount
        const totalEstimated = expenseItems.reduce((sum, item) => sum + parseFloat(item.estimatedAmount), 0);
        await expenseRequest.update({
          totalEstimatedAmount: totalEstimated
        }, { transaction });
      }
      
      // Commit transaction
      await transaction.commit();
      
      // Log activity
      await ActivityLog.create({
        userId: req.user.id,
        action: 'CREATE',
        details: `Created expense request: ${expenseRequest.requestNumber}`,
        ipAddress: req.ip
      });
      
      // Fetch the created expense with its items
      const createdExpense = await ExpenseRequest.findByPk(expenseRequest.id, {
        include: [
          {
            model: ExpenseItem,
            as: 'items',
            include: [
              {
                model: BudgetCategory,
                as: 'category',
                attributes: ['id', 'name', 'code']
              }
            ]
          },
          {
            model: Department,
            as: 'department'
          }
        ]
      });
      
      // Create notification for the new expense
      await createExpenseNotification(createdExpense, req.user.id, 'CREATED', req.user.id);
      
      return res.status(201).json({
        status: 'success',
        message: 'Expense request created successfully',
        data: createdExpense
      });
    } catch (error) {
      // Rollback transaction in case of error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error creating expense request:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create expense request',
      error: error.message
    });
  }
};

/**
 * Add expense item to an expense request
 */
exports.addExpenseItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, description, unitPrice, quantity, notes } = req.body;
    
    // Find expense request
    const expenseRequest = await ExpenseRequest.findByPk(id);
    
    if (!expenseRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense request not found'
      });
    }
    
    // Check if user has permission
    if (
      expenseRequest.userId !== req.user.id && 
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to modify this expense request'
      });
    }
    
    // Check if expense is in draft status
    if (expenseRequest.status !== 'DRAFT') {
      return res.status(400).json({
        status: 'error',
        message: 'Expense items can only be added to DRAFT expense requests'
      });
    }
    
    // Create expense item
    const expenseItem = await ExpenseItem.create({
      expenseId: id,
      categoryId,
      description,
      quantity: quantity || 1,
      unitPrice,
      estimatedAmount: (quantity || 1) * unitPrice,
      status: 'PENDING',
      notes
    });
    
    // Update expense total amount
    const expenseItems = await ExpenseItem.findAll({
      where: { expenseId: id }
    });
    
    const totalEstimatedAmount = expenseItems.reduce((sum, item) => sum + parseFloat(item.estimatedAmount), 0);
    await expenseRequest.update({
      totalEstimatedAmount
    });
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE',
      details: `Added item to expense request: ${expenseRequest.requestNumber}`,
      ipAddress: req.ip
    });
    
    // Get the created item with its category
    const createdItem = await ExpenseItem.findByPk(expenseItem.id, {
      include: [
        {
          model: BudgetCategory,
          as: 'category',
          attributes: ['id', 'name', 'code']
        }
      ]
    });
    
    return res.status(201).json({
      status: 'success',
      message: 'Expense item added successfully',
      data: createdItem
    });
  } catch (error) {
    console.error('Error adding expense item:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to add expense item',
      error: error.message
    });
  }
};

/**
 * Submit an expense request for approval
 */
exports.submitExpenseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find expense request
    const expenseRequest = await ExpenseRequest.findByPk(id, {
      include: [
        {
          model: ExpenseItem,
          as: 'items'
        }
      ]
    });
    
    if (!expenseRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense request not found'
      });
    }
    
    // Check if user has permission
    if (
      expenseRequest.userId !== req.user.id && 
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to submit this expense request'
      });
    }
    
    // Check if expense is in draft status
    if (expenseRequest.status !== 'DRAFT') {
      return res.status(400).json({
        status: 'error',
        message: 'Only DRAFT expense requests can be submitted'
      });
    }
    
    // Check if expense has items
    if (!expenseRequest.items || expenseRequest.items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Expense request must have at least one item'
      });
    }
    
    // Update expense status
    await expenseRequest.update({
      status: 'SUBMITTED'
    });
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE',
      details: `Submitted expense request: ${expenseRequest.requestNumber}`,
      ipAddress: req.ip
    });
    
    // Create notification for the submitted expense
    await createExpenseNotification(expenseRequest, req.user.id, 'SUBMITTED', req.user.id);
    
    // Notify accountants that there's a new expense to review
    await notifyUsersByRole(expenseRequest, ['accountant', 'admin'], 'SUBMITTED', req.user.id);
    
    return res.status(200).json({
      status: 'success',
      message: 'Expense request submitted successfully',
      data: expenseRequest
    });
  } catch (error) {
    console.error('Error submitting expense request:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to submit expense request',
      error: error.message
    });
  }
};

/**
 * Accountant approval of an expense request
 */
exports.approveByAccountant = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, budgetAllocationIds } = req.body;
    
    // Find expense request
    const expenseRequest = await ExpenseRequest.findByPk(id, {
      include: [
        {
          model: ExpenseItem,
          as: 'items',
          include: [
            {
              model: BudgetCategory,
              as: 'category'
            }
          ]
        }
      ]
    });
    
    if (!expenseRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense request not found'
      });
    }
    
    // Check if expense is in the correct status
    if (expenseRequest.status !== 'SUBMITTED') {
      return res.status(400).json({
        status: 'error',
        message: 'Only SUBMITTED expense requests can be approved by accountant'
      });
    }
    
    // Budget check (warning only, not blocking at this stage)
    const budgetWarnings = [];
    
    // Check each expense item against its category budget
    if (expenseRequest.items && expenseRequest.items.length > 0) {
      for (const item of expenseRequest.items) {
        if (item.category) {
          const amountToUpdate = parseFloat(item.actualAmount > 0 ? item.actualAmount : item.estimatedAmount);
          const currentUsedAmount = parseFloat(item.category.usedAmount || 0);
          const allocatedAmount = parseFloat(item.category.allocatedAmount || 0);
          
          console.log(`Budget check for category ${item.category.name} during accountant approval:`, {
            categoryName: item.category.name,
            allocated: allocatedAmount,
            currentlyUsed: currentUsedAmount,
            requested: amountToUpdate,
            wouldExceed: (currentUsedAmount + amountToUpdate > allocatedAmount)
          });
          
          // Check if this expense would exceed the budget
          if (currentUsedAmount + amountToUpdate > allocatedAmount) {
            budgetWarnings.push({
              categoryId: item.categoryId,
              categoryName: item.category.name,
              allocated: allocatedAmount,
              currentlyUsed: currentUsedAmount,
              requested: amountToUpdate,
              deficit: (currentUsedAmount + amountToUpdate) - allocatedAmount
            });
          }
        }
      }
    }
    
    // Update expense
    await expenseRequest.update({
      status: 'ACCOUNTANT_APPROVED',
      accountantApprovalDate: new Date(),
      accountantApprovalUserId: req.user.id,
      accountantNotes: notes,
      budgetAllocationIds: budgetAllocationIds || []
    });
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE',
      details: `Accountant approved expense request: ${expenseRequest.requestNumber}`
    });
    
    // Create notification for the accountant-approved expense
    await createExpenseNotification(expenseRequest, req.user.id, 'ACCOUNTANT_APPROVED', req.user.id);
    
    // Notify managers that there's an expense awaiting their approval
    await notifyUsersByRole(expenseRequest, ['manager', 'admin'], 'ACCOUNTANT_APPROVED', req.user.id);
    
    return res.status(200).json({
      status: 'success',
      message: 'Expense request approved by accountant',
      data: expenseRequest,
      budgetWarnings: budgetWarnings.length > 0 ? budgetWarnings : null
    });
  } catch (error) {
    console.error('Error approving expense by accountant:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to approve expense request',
      error: error.message
    });
  }
};

/**
 * Manager approval of an expense request
 */
exports.approveByManager = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    // Find expense request with its items
    const expenseRequest = await ExpenseRequest.findByPk(id, {
      include: [
        {
          model: ExpenseItem,
          as: 'items',
          include: [
            {
              model: BudgetCategory,
              as: 'category'
            }
          ]
        }
      ]
    });
    
    if (!expenseRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense request not found'
      });
    }
    
    // Check if expense is in the correct status
    if (expenseRequest.status !== 'ACCOUNTANT_APPROVED') {
      return res.status(400).json({
        status: 'error',
        message: 'Only ACCOUNTANT_APPROVED expense requests can be approved by manager'
      });
    }
    
    // Budget check (warning only, not blocking at this stage)
    const budgetWarnings = [];
    
    // Check each expense item against its category budget
    if (expenseRequest.items && expenseRequest.items.length > 0) {
      for (const item of expenseRequest.items) {
        if (item.category) {
          const amountToUpdate = parseFloat(item.actualAmount > 0 ? item.actualAmount : item.estimatedAmount);
          const currentUsedAmount = parseFloat(item.category.usedAmount || 0);
          const allocatedAmount = parseFloat(item.category.allocatedAmount || 0);
          
          console.log(`Budget check for category ${item.category.name} during manager approval:`, {
            categoryName: item.category.name,
            allocated: allocatedAmount,
            currentlyUsed: currentUsedAmount,
            requested: amountToUpdate,
            wouldExceed: (currentUsedAmount + amountToUpdate > allocatedAmount)
          });
          
          // Check if this expense would exceed the budget
          if (currentUsedAmount + amountToUpdate > allocatedAmount) {
            budgetWarnings.push({
              categoryId: item.categoryId,
              categoryName: item.category.name,
              allocated: allocatedAmount,
              currentlyUsed: currentUsedAmount,
              requested: amountToUpdate,
              deficit: (currentUsedAmount + amountToUpdate) - allocatedAmount
            });
          }
        }
      }
    }
    
    // Update expense
    await expenseRequest.update({
      status: 'MANAGER_APPROVED',
      managerApprovalDate: new Date(),
      managerApprovalUserId: req.user.id,
      managerNotes: notes
    });
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE',
      details: `Manager approved expense request: ${expenseRequest.requestNumber}`
    });
    
    // Create notification for the manager-approved expense
    await createExpenseNotification(expenseRequest, req.user.id, 'MANAGER_APPROVED', req.user.id);
    
    // Notify cashiers that there's an expense ready for processing
    await notifyUsersByRole(expenseRequest, ['cashier', 'admin'], 'MANAGER_APPROVED', req.user.id);
    
    return res.status(200).json({
      status: 'success',
      message: 'Expense request approved by manager',
      data: expenseRequest,
      budgetWarnings: budgetWarnings.length > 0 ? budgetWarnings : null
    });
  } catch (error) {
    console.error('Error approving expense by manager:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to approve expense request',
      error: error.message
    });
  }
};

/**
 * Cashier processing of an expense request
 */
exports.processByCashier = async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionDetails, notes, overrideBudgetLimit } = req.body;
    
    // Start a transaction to ensure data consistency
    const t = await db.sequelize.transaction();
    
    try {
      // Find expense request with its items
      const expenseRequest = await ExpenseRequest.findByPk(id, {
        include: [
          {
            model: ExpenseItem,
            as: 'items',
            include: [
              {
                model: BudgetCategory,
                as: 'category'
              }
            ]
          }
        ],
        transaction: t
      });
      
      if (!expenseRequest) {
        await t.rollback();
        return res.status(404).json({
          status: 'error',
          message: 'Expense request not found'
        });
      }
      
      // Check if expense is in the correct status
      if (expenseRequest.status !== 'MANAGER_APPROVED') {
        await t.rollback();
        return res.status(400).json({
          status: 'error',
          message: 'Only MANAGER_APPROVED expense requests can be processed'
        });
      }
      
      // Validate transaction details
      if (!transactionDetails) {
        await t.rollback();
        return res.status(400).json({
          status: 'error',
          message: 'Transaction details are required'
        });
      }
      
      // Check budget limits before processing
      if (!overrideBudgetLimit) {
        const budgetExceededItems = [];
        
        // Check each expense item against its category budget
        if (expenseRequest.items && expenseRequest.items.length > 0) {
          for (const item of expenseRequest.items) {
            if (item.category) {
              const amountToUpdate = parseFloat(item.actualAmount > 0 ? item.actualAmount : item.estimatedAmount);
              const currentUsedAmount = parseFloat(item.category.usedAmount || 0);
              const allocatedAmount = parseFloat(item.category.allocatedAmount || 0);
              
              console.log(`Budget check for category ${item.category.name} (${item.categoryId}):`, {
                categoryName: item.category.name,
                allocated: allocatedAmount,
                currentlyUsed: currentUsedAmount,
                requested: amountToUpdate,
                wouldExceed: (currentUsedAmount + amountToUpdate > allocatedAmount)
              });
              
              // Check if this expense would exceed the budget
              if (currentUsedAmount + amountToUpdate > allocatedAmount) {
                budgetExceededItems.push({
                  categoryId: item.categoryId,
                  categoryName: item.category.name,
                  allocated: allocatedAmount,
                  currentlyUsed: currentUsedAmount,
                  requested: amountToUpdate,
                  deficit: (currentUsedAmount + amountToUpdate) - allocatedAmount
                });
              }
            }
          }
        }
        
        // If any budget exceedances were found, return an error with details
        if (budgetExceededItems.length > 0) {
          console.log('Budget exceeded when processing expense:', {
            expenseId: id,
            requestNumber: expenseRequest.requestNumber,
            exceededItems: budgetExceededItems
          });
          
          await t.rollback();
          return res.status(400).json({
            status: 'budget_exceeded',
            message: 'This expense would exceed the budget for one or more categories',
            data: {
              expenseId: id,
              requestNumber: expenseRequest.requestNumber,
              exceededItems: budgetExceededItems
            }
          });
        }
      }
      
      // Update expense
      await expenseRequest.update({
        status: 'PROCESSED',
        processedByUserId: req.user.id,
        processedDate: new Date(),
        transactionDetails,
        cashierNotes: notes
      }, { transaction: t });
      
      // Update budget allocations
      if (expenseRequest.items && expenseRequest.items.length > 0) {
        for (const item of expenseRequest.items) {
          // Get the amount to update (actual or estimated)
          const amountToUpdate = parseFloat(item.actualAmount > 0 ? item.actualAmount : item.estimatedAmount);
          
          // First, update the category's usedAmount directly - this ensures basic tracking works
          if (item.category) {
            // Use direct value update instead of sequelize.literal to avoid case sensitivity issues
            const currentUsedAmount = parseFloat(item.category.usedAmount || 0);
            const newUsedAmount = currentUsedAmount + amountToUpdate;
            
            await item.category.update({
              usedAmount: newUsedAmount
            }, { transaction: t });
            
            console.log(`Updated budget category ${item.category.id} used amount from ${currentUsedAmount} to ${newUsedAmount}`);
          }
          
          // Then, find and update the specific budget allocation if it exists
          if (expenseRequest.budgetAllocationIds && expenseRequest.budgetAllocationIds.length > 0) {
            // Find the allocation that matches this category
            const allocation = await db.BudgetAllocation.findOne({
              where: {
                id: {
                  [Op.in]: expenseRequest.budgetAllocationIds
                },
                categoryId: item.categoryId
              },
              transaction: t
            });
            
            if (allocation) {
              // Use direct value update instead of sequelize.literal
              const currentUsedAmount = parseFloat(allocation.usedAmount || 0);
              const newUsedAmount = currentUsedAmount + amountToUpdate;
              
              await allocation.update({
                usedAmount: newUsedAmount
              }, { transaction: t });
              
              console.log(`Updated budget allocation ${allocation.id} used amount from ${currentUsedAmount} to ${newUsedAmount}`);
            } else {
              console.log(`No matching budget allocation found for category ${item.categoryId}`);
              
              // As you mentioned, we should primarily focus on the BudgetCategory since
              // allocations might not exist. We've already updated the category above.
            }
          } else {
            console.log('No budgetAllocationIds found in expense request - using just category update');
          }
        }
      }
      
      // Log activity
      await ActivityLog.create({
        userId: req.user.id,
        action: 'UPDATE',
        details: `Processed expense request: ${expenseRequest.requestNumber} and updated budget allocations`,
        ipAddress: req.ip
      }, { transaction: t });
      
      // Commit the transaction
      await t.commit();
      
      // Create notification for the processed expense
      await createExpenseNotification(expenseRequest, expenseRequest.userId, 'PROCESSED', req.user.id);
      
      return res.status(200).json({
        status: 'success',
        message: 'Expense request processed successfully and budget allocations updated',
        data: expenseRequest
      });
    } catch (error) {
      // Rollback transaction on error
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error processing expense:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to process expense request',
      error: error.message
    });
  }
};

/**
 * Mark an expense as completed by the requester
 */
exports.markExpenseCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find expense request
    const expenseRequest = await ExpenseRequest.findByPk(id, {
      include: [
        {
          model: Receipt,
          as: 'receipts'
        }
      ]
    });
    
    if (!expenseRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense request not found'
      });
    }
    
    // Check if user has permission
    if (expenseRequest.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only the requester can mark an expense as completed'
      });
    }
    
    // Check if expense is in the correct status
    if (expenseRequest.status !== 'PROCESSED') {
      return res.status(400).json({
        status: 'error',
        message: 'Only PROCESSED expense requests can be marked as completed'
      });
    }
    
    // Check if receipt is required but not uploaded
    if (expenseRequest.requiresReceipt && 
        (!expenseRequest.receipts || expenseRequest.receipts.length === 0)) {
      return res.status(400).json({
        status: 'error',
        message: 'This expense request requires receipt upload before completion'
      });
    }
    
    // Check if user has too many pending completed expenses
    const pendingCount = await ExpenseRequest.count({
      where: {
        userId: req.user.id,
        status: 'PROCESSED'
      }
    });
    
    if (pendingCount > 2) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot have more than 2 expense requests pending completion'
      });
    }
    
    // Update expense
    await expenseRequest.update({
      status: 'COMPLETED',
      completedDate: new Date()
    });
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE',
      details: `Marked expense request as completed: ${expenseRequest.requestNumber}`,
      ipAddress: req.ip
    });
    
    // Create notification for the completed expense
    await createExpenseNotification(expenseRequest, expenseRequest.userId, 'COMPLETED', req.user.id);
    
    return res.status(200).json({
      status: 'success',
      message: 'Expense request marked as completed',
      data: expenseRequest
    });
  } catch (error) {
    console.error('Error completing expense:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to mark expense request as completed',
      error: error.message
    });
  }
};

/**
 * Reject an expense request
 */
exports.rejectExpenseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    
    // Find expense request
    const expenseRequest = await ExpenseRequest.findByPk(id);
    
    if (!expenseRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense request not found'
      });
    }
    
    // Check if user has permission based on current status
    let hasPermission = false;
    
    if (req.user.role === 'admin') {
      hasPermission = true;
    } else if (req.user.role === 'accountant' && 
        ['SUBMITTED'].includes(expenseRequest.status)) {
      hasPermission = true;
    } else if (req.user.role === 'manager' && 
        ['ACCOUNTANT_APPROVED'].includes(expenseRequest.status)) {
      hasPermission = true;
    } else if (req.user.role === 'cashier' && 
        ['MANAGER_APPROVED'].includes(expenseRequest.status)) {
      hasPermission = true;
    }
    
    if (!hasPermission) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to reject this expense request'
      });
    }
    
    // Validate rejection reason
    if (!rejectionReason) {
      return res.status(400).json({
        status: 'error',
        message: 'Rejection reason is required'
      });
    }
    
    // Update expense
    await expenseRequest.update({
      status: 'REJECTED',
      rejectedDate: new Date(),
      rejectedByUserId: req.user.id,
      rejectionReason
    });
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE',
      details: `Rejected expense request: ${expenseRequest.requestNumber}`,
      ipAddress: req.ip
    });
    
    // Create notification for the rejected expense
    await createExpenseNotification(expenseRequest, expenseRequest.userId, 'REJECTED', req.user.id);
    
    return res.status(200).json({
      status: 'success',
      message: 'Expense request rejected',
      data: expenseRequest
    });
  } catch (error) {
    console.error('Error rejecting expense:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to reject expense request',
      error: error.message
    });
  }
};

/**
 * Upload a receipt for an expense
 */
exports.uploadReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No receipt file uploaded'
      });
    }
    
    // Find expense request
    const expenseRequest = await ExpenseRequest.findByPk(id);
    
    if (!expenseRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense request not found'
      });
    }
    
    // Check if user has permission
    if (expenseRequest.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to upload receipts for this expense'
      });
    }
    
    // Check if expense is in valid status for receipt upload
    if (!['PROCESSED'].includes(expenseRequest.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Receipts can only be uploaded for PROCESSED expense requests'
      });
    }
    
    // Create receipt record
    const receipt = await Receipt.create({
      expenseRequestId: id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user.id,
      uploadedAt: new Date()
    });
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'CREATE',
      details: `Uploaded receipt for expense request: ${expenseRequest.requestNumber}`,
      ipAddress: req.ip
    });
    
    return res.status(201).json({
      status: 'success',
      message: 'Receipt uploaded successfully',
      data: {
        id: receipt.id,
        fileName: receipt.fileName,
        filePath: receipt.filePath,
        fileType: receipt.fileType,
        uploadedAt: receipt.uploadedAt
      }
    });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to upload receipt',
      error: error.message
    });
  }
};

/**
 * Generate a PDF for an expense
 */
exports.generateExpensePdf = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find expense request with all related data
    const expense = await ExpenseRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        },
        {
          model: ExpenseItem,
          as: 'items',
          include: [
            {
              model: BudgetCategory,
              as: 'category',
              attributes: ['id', 'name', 'code']
            }
          ]
        },
        {
          model: User,
          as: 'managerApprover',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'accountantApprover',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'cashierProcessor',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!expense) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense request not found'
      });
    }
    
    // Import the PDF generator utility
    const pdfGenerator = require('../utils/pdfGenerator');
    
    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true // Important for page numbering
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=expense_${expense.requestNumber}.pdf`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Use the PDF generator utility to create the expense voucher
    // Note: This is now async so we need to await it
    await pdfGenerator.generateExpenseVoucher(expense, doc);
    
    // Finalize PDF
    doc.end();
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'READ',
      details: `Generated PDF for expense request: ${expense.requestNumber}`,
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error generating expense PDF:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to generate expense PDF',
      error: error.message
    });
  }
};

/**
 * Get user's expenses pending completion
 */
exports.getPendingCompletionExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const expenses = await ExpenseRequest.findAll({
      where: {
        userId,
        status: 'PROCESSED'
      },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Receipt,
          as: 'receipts',
          attributes: ['id', 'fileName', 'uploadedAt']
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    
    return res.status(200).json({
      status: 'success',
      data: expenses
    });
  } catch (error) {
    console.error('Error getting pending completion expenses:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve pending completion expenses',
      error: error.message
    });
  }
};

/**
 * Get count of user's expenses by status
 */
exports.getUserExpenseCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const counts = {
      DRAFT: 0,
      SUBMITTED: 0,
      MANAGER_APPROVED: 0,
      ACCOUNTANT_APPROVED: 0,
      PROCESSED: 0,
      COMPLETED: 0,
      REJECTED: 0,
      total: 0
    };
    
    // Get counts for each status
    const statuses = Object.keys(counts).filter(status => status !== 'total');
    
    for (const status of statuses) {
      counts[status] = await ExpenseRequest.count({
        where: {
          userId,
          status
        }
      });
    }
    
    // Calculate total
    counts.total = Object.values(counts).reduce((sum, count) => sum + count, 0) - counts.total;
    
    return res.status(200).json({
      status: 'success',
      data: counts
    });
  } catch (error) {
    console.error('Error getting user expense counts:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve expense counts',
      error: error.message
    });
  }
}; 