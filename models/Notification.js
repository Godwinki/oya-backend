'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      if (models.User) {
        Notification.belongsTo(models.User, {
          foreignKey: 'userId',
          as: 'user'
        });
        
        Notification.belongsTo(models.User, {
          foreignKey: 'createdBy',
          as: 'creator'
        });
      }
    }
  }
  
  Notification.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('EXPENSE', 'LEAVE', 'SYSTEM', 'OTHER'),
      defaultValue: 'SYSTEM'
    },
    status: {
      type: DataTypes.ENUM('UNREAD', 'READ'),
      defaultValue: 'UNREAD'
    },
    resourceType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    resourceId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'Notification',
  });
  
  return Notification;
};
