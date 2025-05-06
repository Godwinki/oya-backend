'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Budget extends Model {
    static associate(models) {
      Budget.hasMany(models.BudgetAllocation, {
        foreignKey: 'budgetId',
        as: 'allocations'
      });
      Budget.belongsTo(models.Department, {
        foreignKey: 'departmentId',
        as: 'department'
      });
    }
  }
  
  Budget.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    fiscalYear: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'closed'),
      defaultValue: 'draft'
    },
    description: {
      type: DataTypes.TEXT
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false
    },
    approvedBy: {
      type: DataTypes.UUID
    },
    approvedAt: {
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'Budget',
  });
  
  return Budget;
}; 