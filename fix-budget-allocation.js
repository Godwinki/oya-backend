const db = require('./models');

async function fixBudgetAllocationTable() {
  try {
    console.log('Adding missing status column to BudgetAllocations table...');
    
    // Add the missing status column with ENUM type to match the model
    await db.sequelize.query(`
      ALTER TABLE "BudgetAllocations" 
      ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT 'active'
    `);
    
    console.log('✅ Status column added successfully');
    
    // Verify the column was added
    const columns = await db.sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'BudgetAllocations' 
      ORDER BY ordinal_position
    `, { type: db.sequelize.QueryTypes.SELECT });
    
    console.log('Current BudgetAllocations table structure:');
    console.log(JSON.stringify(columns, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing BudgetAllocations table:', error.message);
    process.exit(1);
  }
}

fixBudgetAllocationTable();
