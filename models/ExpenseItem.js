'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExpenseItem extends Model {
    static associate(models) {
      // Define associations
      if (models.ExpenseRequest) {
        ExpenseItem.belongsTo(models.ExpenseRequest, {
          foreignKey: 'expenseId',
          as: 'expense'
        });
      }
      
      if (models.BudgetCategory) {
        ExpenseItem.belongsTo(models.BudgetCategory, {
          foreignKey: 'categoryId',
          as: 'category'
        });
      }
    }
  }
  
  ExpenseItem.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    expenseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'ExpenseRequests',
        key: 'id'
      }
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'BudgetCategories',
        key: 'id'
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    unitPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    estimatedAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    actualAmount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      defaultValue: 'PENDING'
    },
    notes: {
      type: DataTypes.TEXT
    },
    receiptPath: {
      type: DataTypes.STRING
    }
  }, {
    sequelize,
    modelName: 'ExpenseItem',
    tableName: 'ExpenseItems',
    hooks: {
      beforeValidate: (item) => {
        // Calculate estimated amount based on quantity and unit price
        if (item.quantity && item.unitPrice) {
          item.estimatedAmount = parseFloat(item.quantity) * parseFloat(item.unitPrice);
        } else if (item.unitPrice) {
          item.estimatedAmount = parseFloat(item.unitPrice);
        }
      }
    }
  });
  
  return ExpenseItem;
}; 