const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LoginHistory = sequelize.define('LoginHistory', {
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
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    attemptType: {
      type: DataTypes.ENUM('success', 'failed', 'locked', '2fa_failed'),
      defaultValue: 'failed'
    },
    ipAddress: {
      type: DataTypes.STRING
    },
    userAgent: {
      type: DataTypes.STRING
    },
    browserFingerprint: {
      type: DataTypes.STRING
    },
    geoLocation: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    loggedOutAt: {
      type: DataTypes.DATE
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  LoginHistory.associate = (models) => {
    LoginHistory.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE'
    });
  };

  return LoginHistory;
}; 