// EmergencyContact.js
module.exports = (sequelize, DataTypes) => {
  const EmergencyContact = sequelize.define('EmergencyContact', {
    fullName: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    relationship: { 
      type: DataTypes.STRING 
    },
    primaryPhone: { 
      type: DataTypes.STRING,
      allowNull: false
    },
    alternativePhone: { 
      type: DataTypes.STRING 
    },
    email: { 
      type: DataTypes.STRING 
    },
    address: { 
      type: DataTypes.STRING 
    }
  }, {
    tableName: 'EmergencyContacts',
    timestamps: true
  });

  // Define association
  EmergencyContact.associate = (models) => {
    EmergencyContact.belongsTo(models.Member, {
      foreignKey: 'memberId',
      onDelete: 'CASCADE'
    });
  };

  return EmergencyContact;
};
