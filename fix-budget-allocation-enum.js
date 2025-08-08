const db = require('./models');

async function fixBudgetAllocationTable() {
  try {
    console.log('Fixing BudgetAllocations table schema...');
    
    // First, check if status column exists
    const existingColumns = await db.sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'BudgetAllocations' AND column_name = 'status'
    `, { type: db.sequelize.QueryTypes.SELECT });
    
    if (existingColumns.length === 0) {
      console.log('Adding status column...');
      
      // Create ENUM type first
      await db.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE budget_allocation_status AS ENUM ('active', 'frozen', 'depleted');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      
      // Add the status column with ENUM type
      await db.sequelize.query(`
        ALTER TABLE "BudgetAllocations" 
        ADD COLUMN status budget_allocation_status DEFAULT 'active'
      `);
      
      console.log('✅ Status column added with ENUM type');
    } else {
      console.log('Status column already exists');
    }
    
    // Force refresh the database connection to clear any cached metadata
    await db.sequelize.connectionManager.pool.drain();
    await db.sequelize.connectionManager.pool.clear();
    
    console.log('✅ Database connection cache cleared');
    
    // Verify the final table structure
    const finalColumns = await db.sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'BudgetAllocations' 
      ORDER BY ordinal_position
    `, { type: db.sequelize.QueryTypes.SELECT });
    
    console.log('Final BudgetAllocations table structure:');
    console.log(JSON.stringify(finalColumns, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing BudgetAllocations table:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

fixBudgetAllocationTable();
