const db = require('../models');
const { createActivity } = require('../utils/activityLog');

const departmentController = {
  async createDepartment(req, res) {
    try {
      const { name, code, description } = req.body;

      // Check if department with same code exists
      const existingDepartment = await db.Department.findOne({
        where: { code }
      });

      if (existingDepartment) {
        return res.status(400).json({
          message: 'Department with this code already exists'
        });
      }

      const department = await db.Department.create({
        name,
        code,
        description,
        status: 'active'
      });

      await createActivity({
        action: 'CREATE_DEPARTMENT',
        userId: req.user.id,
        details: {
          departmentId: department.id,
          name,
          code
        }
      });

      res.status(201).json({
        message: 'Department created successfully',
        data: department
      });
    } catch (error) {
      console.error('Error creating department:', error);
      res.status(500).json({
        message: 'Failed to create department'
      });
    }
  },

  async getDepartments(req, res) {
    try {
      const departments = await db.Department.findAll({
        order: [['name', 'ASC']]
      });

      res.json({
        data: departments
      });
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).json({
        message: 'Failed to fetch departments'
      });
    }
  },

  async updateDepartment(req, res) {
    try {
      const { id } = req.params;
      const { name, code, description, status } = req.body;

      const department = await db.Department.findByPk(id);
      if (!department) {
        return res.status(404).json({
          message: 'Department not found'
        });
      }

      // Check if new code conflicts with existing department
      if (code !== department.code) {
        const existingDepartment = await db.Department.findOne({
          where: { code }
        });

        if (existingDepartment) {
          return res.status(400).json({
            message: 'Department with this code already exists'
          });
        }
      }

      await department.update({
        name,
        code,
        description,
        status
      });

      await createActivity({
        action: 'UPDATE_DEPARTMENT',
        userId: req.user.id,
        details: {
          departmentId: id,
          updates: { name, code, description, status }
        }
      });

      res.json({
        message: 'Department updated successfully',
        data: department
      });
    } catch (error) {
      console.error('Error updating department:', error);
      res.status(500).json({
        message: 'Failed to update department'
      });
    }
  },

  async deleteDepartment(req, res) {
    try {
      const { id } = req.params;

      const department = await db.Department.findByPk(id);
      if (!department) {
        return res.status(404).json({
          message: 'Department not found'
        });
      }

      // Check if department has associated budgets
      const hasBudgets = await db.Budget.findOne({
        where: { departmentId: id }
      });

      if (hasBudgets) {
        return res.status(400).json({
          message: 'Cannot delete department with associated budgets'
        });
      }

      await department.destroy();

      await createActivity({
        action: 'DELETE_DEPARTMENT',
        userId: req.user.id,
        details: {
          departmentId: id,
          name: department.name
        }
      });

      res.json({
        message: 'Department deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting department:', error);
      res.status(500).json({
        message: 'Failed to delete department'
      });
    }
  }
};

module.exports = departmentController; 