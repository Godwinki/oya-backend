'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Receipt extends Model {
    static associate(models) {
      // Define associations
      if (models.ExpenseRequest) {
        Receipt.belongsTo(models.ExpenseRequest, {
          foreignKey: 'expenseRequestId',
          as: 'expenseRequest'
        });
      }
      
      if (models.User) {
        Receipt.belongsTo(models.User, {
          foreignKey: 'uploadedBy',
          as: 'uploader'
        });
      }
    }
  }
  
  Receipt.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    expenseRequestId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'ExpenseRequests',
        key: 'id'
      }
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2)
    },
    receiptDate: {
      type: DataTypes.DATE
    },
    vendor: {
      type: DataTypes.STRING
    },
    uploadedBy: {
      type: DataTypes.UUID,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    uploadedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    // For verification
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verifiedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    verificationNotes: {
      type: DataTypes.TEXT
    }
  }, {
    sequelize,
    modelName: 'Receipt',
    tableName: 'Receipts'
  });
  
  return Receipt;
}; 