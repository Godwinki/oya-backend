const db = require('../models');
const { Op } = require('sequelize');
const { createActivity } = require('../utils/activityLog');

const budgetController = {
  async createBudget(req, res) {
    try {
      const { fiscalYear, departmentId, startDate, endDate, totalAmount, description } = req.body;

      // Validate dates
      if (new Date(startDate) >= new Date(endDate)) {
        return res.status(400).json({
          message: 'End date must be after start date'
        });
      }

      // Check if department exists
      const department = await db.Department.findByPk(departmentId);
      if (!department) {
        return res.status(404).json({
          message: 'Department not found'
        });
      }

      // Check for existing budget in the same fiscal year for the department
      const existingBudget = await db.Budget.findOne({
        where: {
          departmentId,
          fiscalYear,
          status: {
            [Op.ne]: 'closed'
          }
        }
      });

      if (existingBudget) {
        return res.status(400).json({
          message: 'An active or draft budget already exists for this department and fiscal year'
        });
      }

      const budget = await db.Budget.create({
        fiscalYear,
        departmentId,
        startDate,
        endDate,
        totalAmount,
        description,
        status: 'draft',
        createdBy: req.user.id
      });

      await createActivity({
        action: 'CREATE_BUDGET',
        userId: req.user.id,
        details: {
          budgetId: budget.id,
          fiscalYear,
          department: department.name,
          totalAmount
        }
      });

      const budgetWithDepartment = await db.Budget.findByPk(budget.id, {
        include: [{
          model: db.Department,
          as: 'department'
        }]
      });

      res.status(201).json({
        message: 'Budget created successfully',
        data: budgetWithDepartment
      });
    } catch (error) {
      console.error('Error creating budget:', error);
      res.status(500).json({
        message: 'Failed to create budget'
      });
    }
  },

  async getBudgets(req, res) {
    try {
      const budgets = await db.Budget.findAll({
        include: [{
          model: db.Department,
          as: 'department'
        }],
        order: [['createdAt', 'DESC']]
      });

      res.json({
        data: budgets
      });
    } catch (error) {
      console.error('Error fetching budgets:', error);
      res.status(500).json({
        message: 'Failed to fetch budgets'
      });
    }
  },

  async getBudget(req, res) {
    try {
      const budget = await db.Budget.findByPk(req.params.id, {
        include: [{
          model: db.Department,
          as: 'department'
        }]
      });

      if (!budget) {
        return res.status(404).json({
          message: 'Budget not found'
        });
      }

      res.json({
        data: budget
      });
    } catch (error) {
      console.error('Error fetching budget:', error);
      res.status(500).json({
        message: 'Failed to fetch budget'
      });
    }
  },

  async updateBudget(req, res) {
    try {
      const budget = await db.Budget.findByPk(req.params.id);
      if (!budget) {
        return res.status(404).json({
          message: 'Budget not found'
        });
      }

      // Don't allow updates to closed budgets
      if (budget.status === 'closed') {
        return res.status(400).json({
          message: 'Cannot update a closed budget'
        });
      }

      const updates = req.body;
      await budget.update(updates);

      await createActivity({
        action: 'UPDATE_BUDGET',
        userId: req.user.id,
        details: {
          budgetId: budget.id,
          updates
        }
      });

      const updatedBudget = await db.Budget.findByPk(budget.id, {
        include: [{
          model: db.Department,
          as: 'department'
        }]
      });

      res.json({
        message: 'Budget updated successfully',
        data: updatedBudget
      });
    } catch (error) {
      console.error('Error updating budget:', error);
      res.status(500).json({
        message: 'Failed to update budget'
      });
    }
  },

  async deleteBudget(req, res) {
    try {
      const budget = await db.Budget.findByPk(req.params.id);
      if (!budget) {
        return res.status(404).json({
          message: 'Budget not found'
        });
      }

      // Only allow deletion of draft budgets
      if (budget.status !== 'draft') {
        return res.status(400).json({
          message: 'Only draft budgets can be deleted'
        });
      }

      await budget.destroy();

      await createActivity({
        action: 'DELETE_BUDGET',
        userId: req.user.id,
        details: {
          budgetId: budget.id
        }
      });

      res.json({
        message: 'Budget deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting budget:', error);
      res.status(500).json({
        message: 'Failed to delete budget'
      });
    }
  }
};

module.exports = budgetController; 