'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Leave extends Model {
    static associate(models) {
      // Change the alias for the main user association
      Leave.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'requestedBy'  // Changed from 'user' to 'requestedBy'
      });
      
      Leave.belongsTo(models.User, {
        foreignKey: 'approvedBy',
        as: 'approver'
      });
      
      Leave.belongsTo(models.User, {
        foreignKey: 'rejectedBy',
        as: 'rejector'
      });
      
      Leave.belongsTo(models.Department, {
        foreignKey: 'departmentId',
        as: 'department'
      });
    }
  }
  
  Leave.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    requestNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
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
    type: {
      type: DataTypes.ENUM('annual', 'sick', 'maternity', 'paternity', 'unpaid'),
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
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      defaultValue: 'PENDING'
    },
    notes: {
      type: DataTypes.TEXT
    },
    approvedBy: {
      type: DataTypes.UUID,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    approvedAt: {
      type: DataTypes.DATE
    },
    rejectedBy: {
      type: DataTypes.UUID,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    rejectedAt: {
      type: DataTypes.DATE
    },
    approvalNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Leave',
    tableName: 'Leaves'
  });
  
  return Leave;
};