// utils/fixAccountsAndSeed.js
const db = require('../models');
const { sequelize } = db;
const AccountType = db.AccountType;
const MemberAccount = db.MemberAccount;

/**
 * Seeds standard account types if they don't exist
 */
async function seedAccountTypes() {
  console.log('⏳ Checking and seeding account types...');
  
  // Standard account types
  const accountTypes = [
    {
      name: 'SHARES',
      description: 'Member shares account - mandatory for all members',
      interestRate: 0.00,
      minimumBalance: 100000.00,
      isActive: true
    },
    {
      name: 'SAVINGS',
      description: 'Regular savings account',
      interestRate: 3.50,
      minimumBalance: 0.00,
      isActive: true
    },
    {
      name: 'JUNIOR_SAVINGS',
      description: 'Toto junior savings account for children',
      interestRate: 4.00,
      minimumBalance: 0.00,
      isActive: true
    },
    {
      name: 'VOLUNTARY_SHARES',
      description: 'Optional additional shares for members',
      interestRate: 0.00,
      minimumBalance: 0.00,
      isActive: true
    },
    {
      name: 'DEPOSITS',
      description: 'Fixed term deposits',
      interestRate: 5.00,
      minimumBalance: 500000.00,
      isActive: true
    },
    {
      name: 'LOAN',
      description: 'Loan account',
      interestRate: 12.00,
      minimumBalance: 0.00,
      isActive: true
    }
  ];

  // Process each account type
  for (const type of accountTypes) {
    const [accountType, created] = await AccountType.findOrCreate({
      where: { name: type.name },
      defaults: type
    });

    if (created) {
      console.log(`✅ Created account type: ${type.name}`);
    } else {
      console.log(`ℹ️ Account type already exists: ${type.name}`);
    }
  }

  console.log('✅ Account type seeding completed');
}

/**
 * Fixes existing account numbers to ensure uniqueness
 */
async function fixAccountNumbers() {
  console.log('⏳ Checking for duplicate account numbers...');
  
  // Find accounts with duplicate account numbers
  const duplicateAccounts = await sequelize.query(`
    SELECT "accountNumber", COUNT(*) as count
    FROM "MemberAccounts"
    GROUP BY "accountNumber"
    HAVING COUNT(*) > 1
  `, { type: sequelize.QueryTypes.SELECT });

  if (duplicateAccounts.length === 0) {
    console.log('✅ No duplicate account numbers found');
    return;
  }

  console.log(`⚠️ Found ${duplicateAccounts.length} duplicate account numbers. Fixing...`);
  
  const t = await sequelize.transaction();
  
  try {
    // Process each duplicate
    for (const duplicate of duplicateAccounts) {
      const accountNumber = duplicate.accountNumber;
      
      // Get all accounts with this number
      const accounts = await MemberAccount.findAll({
        where: { accountNumber },
        order: [['createdAt', 'ASC']] // Keep the oldest account number unchanged
      });
      
      // Skip the first one (oldest), update the rest
      for (let i = 1; i < accounts.length; i++) {
        const account = accounts[i];
        const accountType = await AccountType.findByPk(account.accountTypeId);
        
        // Create a truly unique number with timestamp
        const prefix = accountType ? accountType.name.substring(0, 3).toUpperCase() : 'ACC';
        const now = new Date();
        const year = now.getFullYear().toString().substr(2, 2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const timestamp = Math.floor(now.getTime() / 1000).toString().substr(-5);
        
        const newAccountNumber = `${prefix}${year}${month}${day}${timestamp}${i}`;
        
        // Update the account
        await account.update({ accountNumber: newAccountNumber }, { transaction: t });
        console.log(`✅ Updated account ID ${account.id} from ${accountNumber} to ${newAccountNumber}`);
      }
    }
    
    await t.commit();
    console.log('✅ Successfully fixed all duplicate account numbers');
  } catch (error) {
    await t.rollback();
    console.error('❌ Error fixing account numbers:', error);
    throw error;
  }
}

// Run both functions
async function main() {
  try {
    console.log('🔄 Starting account system initialization...');
    await seedAccountTypes();
    await fixAccountNumbers();
    console.log('✅ Account system initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during account system initialization:', error);
    process.exit(1);
  }
}

main();
