const db = require('../models');

async function syncDatabase() {
  try {
    console.log('Starting database sync...');
    await db.sequelize.sync({ force: true });
    console.log('Database sync completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing database:', error);
    process.exit(1);
  }
}

syncDatabase();