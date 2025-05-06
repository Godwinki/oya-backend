'use strict';
const { Model } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class ExpenseRequest extends Model {
    static associate(models) {
      // Define associations
      if (models.User) {
        ExpenseRequest.belongsTo(models.User, {
          foreignKey: 'userId',
          as: 'user'
        });
        
        ExpenseRequest.belongsTo(models.User, {
          foreignKey: 'managerApprovalUserId',
          as: 'managerApprover'
        });
        
        ExpenseRequest.belongsTo(models.User, {
          foreignKey: 'accountantApprovalUserId',
          as: 'accountantApprover'
        });
        
        ExpenseRequest.belongsTo(models.User, {
          foreignKey: 'processedByUserId',
          as: 'cashierProcessor'
        });
        
        ExpenseRequest.belongsTo(models.User, {
          foreignKey: 'rejectedByUserId',
          as: 'rejector'
        });
      }
      
      if (models.Department) {
        ExpenseRequest.belongsTo(models.Department, {
          foreignKey: 'departmentId',
          as: 'department'
        });
      }
      
      if (models.ExpenseItem) {
        ExpenseRequest.hasMany(models.ExpenseItem, {
          foreignKey: 'expenseId',
          as: 'items'
        });
      }
      
      if (models.Receipt) {
        ExpenseRequest.hasMany(models.Receipt, {
          foreignKey: 'expenseRequestId',
          as: 'receipts'
        });
      }
    }
  }
  
  ExpenseRequest.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    requestNumber: {
      type: DataTypes.STRING,
      unique: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Departments',
        key: 'id'
      }
    },
    description: {
      type: DataTypes.TEXT
    },
    purpose: {
      type: DataTypes.TEXT
    },
    totalEstimatedAmount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    totalActualAmount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM(
        'DRAFT', 
        'SUBMITTED', 
        'ACCOUNTANT_APPROVED', 
        'MANAGER_APPROVED', 
        'PROCESSED', 
        'COMPLETED', 
        'REJECTED'
      ),
      defaultValue: 'DRAFT'
    },
    requiresReceipt: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    fiscalYear: {
      type: DataTypes.INTEGER,
      defaultValue: new Date().getFullYear()
    },
    managerApprovalDate: {
      type: DataTypes.DATE
    },
    managerApprovalUserId: {
      type: DataTypes.UUID,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    managerNotes: {
      type: DataTypes.TEXT
    },
    accountantApprovalDate: {
      type: DataTypes.DATE
    },
    accountantApprovalUserId: {
      type: DataTypes.UUID,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    accountantNotes: {
      type: DataTypes.TEXT
    },
    budgetAllocationIds: {
      type: DataTypes.ARRAY(DataTypes.UUID)
    },
    processedDate: {
      type: DataTypes.DATE
    },
    processedByUserId: {
      type: DataTypes.UUID,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    transactionDetails: {
      type: DataTypes.TEXT
    },
    cashierNotes: {
      type: DataTypes.TEXT
    },
    completedDate: {
      type: DataTypes.DATE
    },
    rejectedDate: {
      type: DataTypes.DATE
    },
    rejectedByUserId: {
      type: DataTypes.UUID,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    rejectionReason: {
      type: DataTypes.TEXT
    }
  }, {
    sequelize,
    modelName: 'ExpenseRequest',
    tableName: 'ExpenseRequests',
    hooks: {
      beforeCreate: async (expenseRequest) => {
        // Generate a unique request number
        const year = new Date().getFullYear().toString().slice(-2);
        const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
        const randomPart = Math.floor(10000 + Math.random() * 90000);
        expenseRequest.requestNumber = `EXP-${year}${month}-${randomPart}`;
      }
    }
  });
  
  return ExpenseRequest;
}; 