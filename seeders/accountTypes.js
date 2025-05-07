'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Define all standard account types
    const accountTypes = [
      {
        name: 'SHARES',
        description: 'Member shares account - mandatory for all members',
        interestRate: 0.00,
        minimumBalance: 100000.00,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'SAVINGS',
        description: 'Regular savings account',
        interestRate: 3.50,
        minimumBalance: 0.00,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'JUNIOR_SAVINGS',
        description: 'Toto junior savings account for children',
        interestRate: 4.00,
        minimumBalance: 0.00,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'VOLUNTARY_SHARES',
        description: 'Optional additional shares for members',
        interestRate: 0.00,
        minimumBalance: 0.00,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'DEPOSITS',
        description: 'Fixed term deposits',
        interestRate: 5.00,
        minimumBalance: 500000.00,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'LOAN',
        description: 'Loan account',
        interestRate: 12.00,
        minimumBalance: 0.00,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    return queryInterface.bulkInsert('AccountTypes', accountTypes, {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('AccountTypes', null, {});
  }
};
