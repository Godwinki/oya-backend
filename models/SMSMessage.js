// SMSMessage.js
module.exports = (sequelize, DataTypes) => {
  const SMSMessage = sequelize.define('SMSMessage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    content: { 
      type: DataTypes.TEXT, 
      allowNull: false 
    },
    recipientCount: { 
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    totalSent: { 
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    deliveryRate: { 
      type: DataTypes.STRING,
      defaultValue: "0%"
    },
    status: { 
      type: DataTypes.ENUM('PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'FAILED'),
      defaultValue: 'PENDING'
    },
    scheduledFor: { 
      type: DataTypes.DATE,
      allowNull: true
    },
    sentAt: { 
      type: DataTypes.DATE,
      allowNull: true
    },
    templateId: { 
      type: DataTypes.UUID,
      allowNull: true
    },
    providerId: { 
      type: DataTypes.UUID,
      allowNull: false
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false
    },
    totalCost: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    }
  }, {
    tableName: 'SMSMessages',
    timestamps: true,
  });

  SMSMessage.associate = (models) => {
    // Each message is sent by a user
    SMSMessage.belongsTo(models.User, {
      foreignKey: 'createdById',
      as: 'creator'
    });

    // Each message may use a template
    SMSMessage.belongsTo(models.SMSTemplate, {
      foreignKey: 'templateId',
      as: 'template'
    });

    // Each message is sent via a provider
    SMSMessage.belongsTo(models.SMSProvider, {
      foreignKey: 'providerId',
      as: 'provider'
    });

    // Many-to-many relationship with recipient members
    SMSMessage.belongsToMany(models.Member, {
      through: 'SMSRecipients',
      foreignKey: 'messageId',
      otherKey: 'memberId',
      as: 'recipients'
    });
  };

  return SMSMessage;
};
