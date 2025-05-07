// Beneficiary.js
module.exports = (sequelize, DataTypes) => {
  const Beneficiary = sequelize.define('Beneficiary', {
    fullName: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    relationship: { 
      type: DataTypes.STRING 
    },
    dateOfBirth: { 
      type: DataTypes.DATEONLY 
    },
    sharePercentage: { 
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      }
    },
    contactInfo: { 
      type: DataTypes.STRING 
    },
    isMinor: { 
      type: DataTypes.BOOLEAN,
      defaultValue: false 
    },
    guardianName: { 
      type: DataTypes.STRING 
    },
    guardianContact: { 
      type: DataTypes.STRING 
    }
  }, {
    tableName: 'Beneficiaries',
    timestamps: true
  });

  // Define association
  Beneficiary.associate = (models) => {
    Beneficiary.belongsTo(models.Member, {
      foreignKey: 'memberId',
      onDelete: 'CASCADE'
    });
  };

  return Beneficiary;
};
