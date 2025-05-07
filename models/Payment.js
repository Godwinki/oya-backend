// models/Payment.js
module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    memberId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Members',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      // Types: INITIAL_PAYMENT, DEPOSIT, WITHDRAWAL, LOAN_REPAYMENT, INTEREST, FEE, etc.
    },
    description: {
      type: DataTypes.STRING
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: true,
      // External reference number or transaction ID
    },
    breakdown: {
      type: DataTypes.TEXT,
      allowNull: true,
      // JSON string of payment breakdown (for itemized payments)
      get() {
        const value = this.getDataValue('breakdown');
        return value ? JSON.parse(value) : {};
      },
      set(value) {
        this.setDataValue('breakdown', value ? JSON.stringify(value) : null);
      }
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'PENDING',
      // PENDING, COMPLETED, FAILED, REVERSED
    },
    paymentDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      // Removed foreign key reference to avoid constraint issues
    }
  }, {
    tableName: 'Payments',
    timestamps: true,
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.Member, {
      foreignKey: 'memberId',
      as: 'member'
    });

    // Only associate with User if it exists in the models
    if (models.User) {
      Payment.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator',
        constraints: false // Disable the foreign key constraint
      });
    }
  };

  return Payment;
};
