// utils/repairDatabase.js
const db = require('../models');
const { sequelize } = db;
const AccountType = db.AccountType;
const fs = require('fs');
const path = require('path');

/**
 * Repair database tables that are causing initialization errors
 */
async function repairDatabase() {
  let t;
  try {
    console.log('🔧 Starting database repair process...');
    
    // Start transaction
    t = await sequelize.transaction();

    // 1. Check if AccountTypes table exists and drop it if needed
    console.log('🔍 Checking for AccountTypes table...');
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
      { transaction: t }
    );
    
    const hasAccountTypesTable = tables.some(table => 
      table.table_name.toLowerCase() === 'accounttypes'
    );
    
    if (hasAccountTypesTable) {
      console.log('🗑️ Dropping AccountTypes table...');
      
      // Check for dependent tables first (MemberAccounts)
      console.log('🔍 Checking for dependencies...');
      const hasMemberAccountsTable = tables.some(table => 
        table.table_name.toLowerCase() === 'memberaccounts'
      );
      
      if (hasMemberAccountsTable) {
        // We need to drop the foreign key constraint first
        console.log('🔗 Dropping foreign key constraints from MemberAccounts...');
        await sequelize.query(
          `ALTER TABLE "MemberAccounts" DROP CONSTRAINT IF EXISTS "MemberAccounts_accountTypeId_fkey"`,
          { transaction: t }
        );
      }
      
      // Now safe to drop AccountTypes
      await sequelize.query('DROP TABLE IF EXISTS "AccountTypes" CASCADE', { transaction: t });
      console.log('✅ AccountTypes table dropped successfully');
    } else {
      console.log('ℹ️ AccountTypes table does not exist, creating fresh');
    }
    
    // 2. Re-create the AccountTypes table with the model definition
    console.log('🔧 Creating AccountTypes table from model definition...');
    await AccountType.sync({ force: true, transaction: t });
    console.log('✅ AccountTypes table created successfully');
    
    // 3. Seed the account types
    console.log('🌱 Seeding account types...');
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
    
    await AccountType.bulkCreate(accountTypes, { transaction: t });
    console.log('✅ Account types seeded successfully');
    
    // 4. If MemberAccounts table exists, reconnect the foreign key
    if (hasMemberAccountsTable) {
      console.log('🔗 Re-creating foreign key in MemberAccounts table...');
      await sequelize.query(
        `ALTER TABLE "MemberAccounts" 
         ADD CONSTRAINT "MemberAccounts_accountTypeId_fkey" 
         FOREIGN KEY ("accountTypeId") 
         REFERENCES "AccountTypes" (id) 
         ON DELETE CASCADE`,
        { transaction: t }
      );
      console.log('✅ Foreign key constraint re-created successfully');
    }
    
    // Commit all changes
    await t.commit();
    console.log('✅ Database repair completed successfully');
    
  } catch (error) {
    // Rollback the transaction if an error occurred
    if (t) await t.rollback();
    console.error('❌ Database repair failed:', error);
    throw error;
  }
}

// Run the repair function
repairDatabase()
  .then(() => {
    console.log('🎉 Database repair process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database repair process failed:', error);
    process.exit(1);
  });
