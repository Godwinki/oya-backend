'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BudgetAllocation extends Model {
    static associate(models) {
      BudgetAllocation.belongsTo(models.Budget, {
        foreignKey: 'budgetId',
        as: 'budget'
      });
      BudgetAllocation.belongsTo(models.Department, {
        foreignKey: 'departmentId',
        as: 'department'
      });
      BudgetAllocation.belongsTo(models.BudgetCategory, {
        foreignKey: 'categoryId',
        as: 'category'
      });
    }
  }
  
  BudgetAllocation.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    budgetId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    usedAmount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    fiscalYear: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
    // TODO: Add status field to database schema
    // status: {
    //   type: DataTypes.ENUM('active', 'frozen', 'depleted'),
    //   defaultValue: 'active'
    // }
  }, {
    sequelize,
    modelName: 'BudgetAllocation',
  });
  
  return BudgetAllocation;
}; 