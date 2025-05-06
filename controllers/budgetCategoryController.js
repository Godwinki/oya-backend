const { BudgetCategory } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { createActivity } = require('../utils/activityLog');

const budgetCategoryController = {
  async createBudgetCategory(req, res) {
    try {
      const { 
        name, 
        code, 
        description, 
        status = 'active'
      } = req.body;

      // Check if category with same code exists
      const existingCategory = await BudgetCategory.findOne({
        where: { code }
      });

      if (existingCategory) {
        return res.status(400).json({
          status: 'error',
          message: 'Budget category with this code already exists'
        });
      }

      const budgetCategory = await BudgetCategory.create({
        id: uuidv4(),
        name,
        code,
        description,
        status
      });

      await createActivity({
        action: 'CREATE_BUDGET_CATEGORY',
        userId: req.user.id,
        details: {
          categoryId: budgetCategory.id,
          name,
          code
        }
      });

      res.status(201).json({
        status: 'success',
        data: budgetCategory
      });
    } catch (error) {
      console.error('Error creating budget category:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  },

  async getBudgetCategories(req, res) {
    try {
      const { status, search, type, fiscalYear } = req.query;
      const filter = {};

      if (status) filter.status = status;
      if (search) {
        filter[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { code: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }
      if (type) filter.type = type;

      // Include all necessary fields in the query
      const categories = await BudgetCategory.findAll({
        where: filter,
        attributes: [
          'id', 
          'name', 
          'code', 
          'description', 
          'type', 
          'allocatedAmount', 
          'usedAmount', 
          'status', 
          'createdAt', 
          'updatedAt'
        ],
        order: [['createdAt', 'DESC']]
      });

      // Calculate the totals for the summary
      let totalAllocated = 0;
      let totalUsed = 0;
      
      categories.forEach(category => {
        totalAllocated += parseFloat(category.allocatedAmount || 0);
        totalUsed += parseFloat(category.usedAmount || 0);
      });

      return res.status(200).json({
        status: 'success',
        data: categories,
        summary: {
          totalAllocated,
          totalUsed
        }
      });
    } catch (error) {
      console.error('Error fetching budget categories:', error);
      return res.status(500).json({ 
        status: 'error',
        message: error.message 
      });
    }
  },

  async updateBudgetCategory(req, res) {
    try {
      const { id } = req.params;
      const { 
        name, 
        code, 
        description, 
        status
      } = req.body;

      const category = await BudgetCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({
          status: 'error',
          message: 'Budget category not found'
        });
      }

      // Check if new code conflicts with existing category
      if (code && code !== category.code) {
        const existingCategory = await BudgetCategory.findOne({
          where: { code }
        });

        if (existingCategory) {
          return res.status(400).json({
            status: 'error',
            message: 'Budget category with this code already exists'
          });
        }
      }

      const updates = {
        name,
        code,
        description,
        status
      };

      await category.update(updates);

      await createActivity({
        action: 'UPDATE_BUDGET_CATEGORY',
        userId: req.user.id,
        details: {
          categoryId: id,
          updates
        }
      });

      const updatedCategory = await BudgetCategory.findByPk(id);

      res.status(200).json({
        status: 'success',
        data: updatedCategory
      });
    } catch (error) {
      console.error('Error updating budget category:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  },

  async deleteBudgetCategory(req, res) {
    try {
      const { id } = req.params;

      const category = await BudgetCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({
          status: 'error',
          message: 'Budget category not found'
        });
      }

      // Here we would check if the category is referenced by any expense items
      // and prevent deletion if it is

      await category.destroy();

      await createActivity({
        action: 'DELETE_BUDGET_CATEGORY',
        userId: req.user.id,
        details: {
          categoryId: id,
          name: category.name
        }
      });

      res.status(200).json({
        status: 'success',
        message: 'Budget category deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting budget category:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  },

  // Method to allocate budget to a category
  async allocateBudgetToCategory(req, res) {
    try {
      const { id } = req.params;
      const { allocatedAmount, fiscalYear } = req.body;

      // Find the category
      const category = await BudgetCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({
          status: 'error',
          message: 'Budget category not found'
        });
      }

      // Update the category with the allocated amount
      // In a real implementation, you might want to store allocations in a separate table
      // with foreign keys to both the category and budget tables
      await category.update({
        allocatedAmount: parseFloat(allocatedAmount)
      });

      await createActivity({
        action: 'ALLOCATE_BUDGET',
        userId: req.user.id,
        details: {
          categoryId: id,
          name: category.name,
          allocatedAmount,
          fiscalYear
        }
      });

      // Return the updated category
      const updatedCategory = await BudgetCategory.findByPk(id);

      res.status(200).json({
        status: 'success',
        data: updatedCategory
      });
    } catch (error) {
      console.error('Error allocating budget to category:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
};

module.exports = budgetCategoryController; 