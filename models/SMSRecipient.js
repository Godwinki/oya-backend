// SMSRecipient.js
module.exports = (sequelize, DataTypes) => {
  const SMSRecipient = sequelize.define('SMSRecipient', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    messageId: { 
      type: DataTypes.UUID, 
      allowNull: false 
    },
    memberId: { 
      type: DataTypes.INTEGER,
      allowNull: true
    },
    phoneNumber: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    status: { 
      type: DataTypes.ENUM('PENDING', 'SENT', 'DELIVERED', 'FAILED'),
      defaultValue: 'PENDING'
    },
    deliveredAt: { 
      type: DataTypes.DATE,
      allowNull: true
    },
    failureReason: { 
      type: DataTypes.STRING,
      allowNull: true
    },
    providerMessageId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID returned by the SMS provider for tracking'
    }
  }, {
    tableName: 'SMSRecipients',
    timestamps: true,
  });

  SMSRecipient.associate = (models) => {
    // Each recipient belongs to a message
    SMSRecipient.belongsTo(models.SMSMessage, {
      foreignKey: 'messageId',
      as: 'message'
    });

    // Each recipient may be a member (or just a phone number)
    SMSRecipient.belongsTo(models.Member, {
      foreignKey: 'memberId',
      as: 'member'
    });
  };

  return SMSRecipient;
};
