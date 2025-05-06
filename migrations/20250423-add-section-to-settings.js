// Migration: Add 'section' column to Settings table
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      'Settings',
      'section',
      {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'system',
      }
    );
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Settings', 'section');
  },
};
