// models/MemberAccount.js
module.exports = (sequelize, DataTypes) => {
  const MemberAccount = sequelize.define('MemberAccount', {
    memberId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Members',
        key: 'id'
      }
    },
    accountTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'AccountTypes',
        key: 'id'
      }
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    balance: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      get() {
        // Always return balance as a number, never as a string
        const value = this.getDataValue('balance');
        return value === null || value === undefined ? 0.00 : parseFloat(value);
      }
    },
    lastTransactionDate: {
      type: DataTypes.DATE
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'ACTIVE'
      // Options: ACTIVE, FROZEN, CLOSED, DORMANT
    },
    activationDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    closureDate: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'MemberAccounts',
    timestamps: true,
  });

  MemberAccount.associate = (models) => {
    MemberAccount.belongsTo(models.Member, {
      foreignKey: 'memberId',
      as: 'member'
    });
    
    MemberAccount.belongsTo(models.AccountType, {
      foreignKey: 'accountTypeId',
      as: 'accountType'
    });
    
    MemberAccount.hasMany(models.Transaction, {
      foreignKey: 'accountId',
      as: 'transactions'
    });
  };

  return MemberAccount;
};
