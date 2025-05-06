'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BudgetCategory extends Model {
    static associate(models) {
      // Define associations
      if (models.ExpenseItem) {
        BudgetCategory.hasMany(models.ExpenseItem, {
          foreignKey: 'categoryId',
          as: 'expenseItems'
        });
      }
    }
  }
  
  BudgetCategory.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    type: {
      type: DataTypes.ENUM('income', 'expense', 'capital'),
      defaultValue: 'expense'
    },
    allocatedAmount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    usedAmount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    sequelize,
    modelName: 'BudgetCategory',
    tableName: 'BudgetCategories'
  });
  
  return BudgetCategory;
}; 