// SMSProvider.js
module.exports = (sequelize, DataTypes) => {
  const SMSProvider = sequelize.define('SMSProvider', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    logo: { 
      type: DataTypes.STRING
    },
    apiKey: { 
      type: DataTypes.STRING
    },
    apiSecret: { 
      type: DataTypes.STRING
    },
    senderId: { 
      type: DataTypes.STRING
    },
    baseUrl: { 
      type: DataTypes.STRING
    },
    costPerSMS: { 
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    features: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    balance: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'TSH'
    },
    lastBalanceCheck: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'SMSProviders',
    timestamps: true,
  });

  SMSProvider.associate = (models) => {
    // A provider has many SMS messages
    SMSProvider.hasMany(models.SMSMessage, {
      foreignKey: 'providerId',
      as: 'messages'
    });
  };

  return SMSProvider;
};
