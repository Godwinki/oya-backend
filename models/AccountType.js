// models/AccountType.js
module.exports = (sequelize, DataTypes) => {
  const AccountType = sequelize.define('AccountType', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
      // Examples: SAVINGS, DEPOSITS, SHARES, VOLUNTARY_SHARES, LOAN
    },
    description: {
      type: DataTypes.TEXT
    },
    interestRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00
    },
    minimumBalance: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'AccountTypes',
    timestamps: true,
  });

  // Define association in the associate method which will be called later
  AccountType.associate = (models) => {
    AccountType.hasMany(models.MemberAccount, {
      foreignKey: 'accountTypeId',
      as: 'accounts'
    });
  };

  return AccountType;
};
