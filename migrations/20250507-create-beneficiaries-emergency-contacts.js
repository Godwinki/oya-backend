'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create Beneficiaries table
    await queryInterface.createTable('Beneficiaries', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      memberId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Members',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      fullName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      relationship: {
        type: Sequelize.STRING
      },
      dateOfBirth: {
        type: Sequelize.DATEONLY
      },
      sharePercentage: {
        type: Sequelize.FLOAT,
        allowNull: false,
        validate: {
          min: 0,
          max: 100
        }
      },
      contactInfo: {
        type: Sequelize.STRING
      },
      isMinor: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      guardianName: {
        type: Sequelize.STRING
      },
      guardianContact: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create EmergencyContacts table
    await queryInterface.createTable('EmergencyContacts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      memberId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Members',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      fullName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      relationship: {
        type: Sequelize.STRING
      },
      primaryPhone: {
        type: Sequelize.STRING,
        allowNull: false
      },
      alternativePhone: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING
      },
      address: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('EmergencyContacts');
    await queryInterface.dropTable('Beneficiaries');
  }
};
