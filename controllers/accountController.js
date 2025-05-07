// controllers/accountController.js
const db = require('../models');
const MemberAccount = db.MemberAccount;
const Transaction = db.Transaction;
const AccountType = db.AccountType;
const Member = db.Member;
const Payment = db.Payment;
const { sequelize } = db;

// Helper function to generate account numbers
const generateAccountNumber = async (accountTypeId) => {
  try {
    // Get account type prefix
    const accountType = await AccountType.findByPk(accountTypeId);
    let prefix = 'ACC';
    if (accountType) {
      prefix = accountType.name.substring(0, 3).toUpperCase();
    }
    
    // Get current date components for uniqueness
    const now = new Date();
    const year = now.getFullYear().toString().substr(2, 2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = Math.floor(now.getTime() / 1000).toString().substr(-5);
    
    // Find the highest existing account number for this type to avoid duplicates
    const highestAccount = await MemberAccount.findOne({
      where: { accountTypeId },
      order: [['id', 'DESC']]
    });
    
    // Calculate next sequence number
    let sequenceNum = 1;
    if (highestAccount) {
      const currentNumber = highestAccount.accountNumber;
      // Extract sequence number if possible, otherwise use ID-based approach
      const matches = currentNumber.match(/\d{8}$/);
      if (matches && matches[0]) {
        sequenceNum = parseInt(matches[0], 10) + 1;
      } else {
        sequenceNum = highestAccount.id + 1;
      }
    }
    
    // Format with padding
    const paddedNumber = String(sequenceNum).padStart(8, '0');
    
    // Generate candidate account number
    const accountNumber = `${prefix}${year}${paddedNumber}`;
    
    // Check if this account number already exists to ensure uniqueness
    const existing = await MemberAccount.findOne({ where: { accountNumber } });
    if (existing) {
      // If it exists, create truly unique number with timestamp
      return `${prefix}${year}${month}${timestamp}`;
    }
    
    return accountNumber;
  } catch (error) {
    console.error('Error generating account number:', error);
    throw error;
  }
};

// Create a new account for member
exports.createMemberAccount = async (req, res) => {
  console.log('📝 [Account] Create account request received');
  const t = await sequelize.transaction();
  
  try {
    const { memberId, accountTypeId, initialDeposit = 0 } = req.body;
    
    // Check if member exists
    const member = await Member.findByPk(memberId);
    if (!member) {
      await t.rollback();
      return res.status(404).json({ emoji: '⚠️', error: 'Member not found' });
    }
    
    // Check if accountType exists
    const accountType = await AccountType.findByPk(accountTypeId);
    if (!accountType) {
      await t.rollback();
      return res.status(404).json({ emoji: '⚠️', error: 'Account type not found' });
    }
    
    // Generate unique account number
    const accountNumber = await generateAccountNumber(accountTypeId);
    
    const account = await MemberAccount.create({
      memberId,
      accountTypeId,
      accountNumber,
      balance: initialDeposit,
      lastTransactionDate: initialDeposit > 0 ? new Date() : null,
      status: 'ACTIVE',
      activationDate: new Date()
    }, { transaction: t });
    
    // Create initial transaction record if deposit > 0
    if (initialDeposit > 0) {
      await Transaction.create({
        accountId: account.id,
        amount: initialDeposit,
        type: 'DEPOSIT',
        description: 'Initial deposit',
        referenceNumber: `INIT-${Date.now()}`,
        balanceBefore: 0,
        balanceAfter: initialDeposit,
        status: 'COMPLETED',
        performedBy: req.user?.id || null
      }, { transaction: t });
    }
    
    await t.commit();
    console.log('✅ [Account] Account created:', account.id);
    res.status(201).json({ 
      emoji: '🎉', 
      message: 'Account created successfully', 
      account 
    });
  } catch (error) {
    await t.rollback();
    console.log('❌ [Account] Failed to create account:', error.message);
    res.status(400).json({ emoji: '❌', error: error.message });
  }
};

// Get all accounts for a member
exports.getMemberAccounts = async (req, res) => {
  const memberId = req.params.id; // Changed from memberId to id to match route parameter
  console.log(`📥 [Account] Request to list accounts for member: ${memberId}`);
  try {
    const accounts = await MemberAccount.findAll({
      where: { memberId },
      include: [{
        model: AccountType,
        as: 'accountType'
      }]
    });
    console.log(`✅ [Account] Returned ${accounts.length} accounts for member: ${memberId}`);
    res.json({ 
      emoji: '💰', 
      message: 'Member accounts fetched successfully', 
      accounts 
    });
  } catch (error) {
    console.log('❌ [Account] Failed to fetch accounts:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get specific account details including recent transactions
exports.getAccountDetails = async (req, res) => {
  console.log(`📥 [Account] Request for account details: ${req.params.id}`);
  try {
    const account = await MemberAccount.findByPk(req.params.id, {
      include: [
        {
          model: AccountType,
          as: 'accountType'
        },
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'fullName', 'nin', 'mobile', 'email']
        },
        {
          model: Transaction,
          as: 'transactions',
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ]
    });
    
    if (!account) {
      console.log(`⚠️ [Account] Account not found: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Account not found' });
    }
    
    console.log(`✅ [Account] Account details returned: ${req.params.id}`);
    res.json({ 
      emoji: '💰', 
      message: 'Account details fetched successfully', 
      account 
    });
  } catch (error) {
    console.log('❌ [Account] Failed to fetch account details:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Process a transaction (deposit or withdrawal)
exports.processTransaction = async (req, res) => {
  console.log('📝 [Transaction] Process transaction request received');
  const t = await sequelize.transaction();
  
  try {
    const { accountId, amount, type, description } = req.body;
    
    if (!['DEPOSIT', 'WITHDRAWAL'].includes(type)) {
      await t.rollback();
      return res.status(400).json({ emoji: '⚠️', error: 'Invalid transaction type' });
    }
    
    // Get account details
    const account = await MemberAccount.findByPk(accountId, { transaction: t });
    if (!account) {
      await t.rollback();
      return res.status(404).json({ emoji: '⚠️', error: 'Account not found' });
    }
    
    // Check if account is active
    if (account.status !== 'ACTIVE') {
      await t.rollback();
      return res.status(400).json({ emoji: '⚠️', error: `Cannot process transaction on ${account.status} account` });
    }
    
    // Check if sufficient balance for withdrawal
    const currentBalance = parseFloat(account.balance);
    const transactionAmount = parseFloat(amount);
    
    if (type === 'WITHDRAWAL' && currentBalance < transactionAmount) {
      await t.rollback();
      return res.status(400).json({ 
        emoji: '⚠️', 
        error: `Insufficient balance. Available: ${currentBalance}` 
      });
    }
    
    // Calculate new balance
    const balanceBefore = currentBalance;
    const balanceAfter = type === 'DEPOSIT' 
      ? currentBalance + transactionAmount 
      : currentBalance - transactionAmount;
    
    // Generate reference number
    const referenceNumber = `${type.substring(0, 3)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create transaction record
    const transaction = await Transaction.create({
      accountId,
      amount: transactionAmount,
      type,
      description: description || `${type} transaction`,
      referenceNumber,
      balanceBefore,
      balanceAfter,
      status: 'COMPLETED',
      performedBy: req.user?.id || null
    }, { transaction: t });
    
    // Update account balance
    await account.update({
      balance: balanceAfter,
      lastTransactionDate: new Date()
    }, { transaction: t });
    
    await t.commit();
    console.log(`✅ [Transaction] ${type} transaction processed:`, transaction.id);
    res.status(201).json({ 
      emoji: '💸', 
      message: `${type} processed successfully`, 
      transaction,
      newBalance: balanceAfter 
    });
  } catch (error) {
    await t.rollback();
    console.log('❌ [Transaction] Failed to process transaction:', error.message);
    res.status(400).json({ emoji: '❌', error: error.message });
  }
};

// Get account types
exports.getAccountTypes = async (req, res) => {
  console.log('👀 [Account] Get account types');
  try {
    const accountTypes = await AccountType.findAll({
      order: [['name', 'ASC']]
    });
    res.status(200).json(accountTypes);
  } catch (error) {
    console.error('Error fetching account types:', error);
    res.status(500).json({ error: 'Failed to fetch account types' });
  }
};

// Get account type by ID
exports.getAccountTypeById = async (req, res) => {
  console.log(`👀 [Account] Get account type with ID ${req.params.id}`);
  try {
    const accountType = await AccountType.findByPk(req.params.id);
    
    if (!accountType) {
      return res.status(404).json({ error: 'Account type not found' });
    }
    
    res.status(200).json(accountType);
  } catch (error) {
    console.error('Error fetching account type:', error);
    res.status(500).json({ error: 'Failed to fetch account type' });
  }
};

// Update account type
exports.updateAccountType = async (req, res) => {
  console.log(`📝 [Account] Update account type with ID ${req.params.id}`);
  try {
    const accountType = await AccountType.findByPk(req.params.id);
    
    if (!accountType) {
      return res.status(404).json({ error: 'Account type not found' });
    }
    
    // Update account type properties
    const updatedAccountType = await accountType.update(req.body);
    
    res.status(200).json(updatedAccountType);
  } catch (error) {
    console.error('Error updating account type:', error);
    res.status(500).json({ error: 'Failed to update account type' });
  }
};

// Create account type
exports.createAccountType = async (req, res) => {
  console.log('📝 [AccountType] Request to create new account type');
  try {
    const { name, description, interestRate, minimumBalance } = req.body;
    
    // Check if account type with same name exists
    const existingType = await AccountType.findOne({ where: { name } });
    if (existingType) {
      console.log('⚠️ [AccountType] Account type with this name already exists');
      return res.status(400).json({ 
        emoji: '⚠️', 
        error: 'Account type with this name already exists' 
      });
    }
    
    const accountType = await AccountType.create({
      name,
      description,
      interestRate: interestRate || 0,
      minimumBalance: minimumBalance || 0,
      isActive: true
    });
    
    console.log(`✅ [AccountType] Created new account type: ${accountType.name}`);
    res.status(201).json({ 
      emoji: '✅', 
      message: 'Account type created successfully', 
      accountType 
    });
  } catch (error) {
    console.log('❌ [AccountType] Failed to create account type:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Process initial membership payment
exports.processInitialPayment = async (req, res) => {
  const memberId = req.params.id; 
  console.log(`📥 [Initial Payment] Request received for member ID: ${memberId}`);
  let t;
  
  try {
    t = await sequelize.transaction();
    
    // First check if member has already made an initial payment
    console.log('⏳ Checking if member has already made an initial payment...');
    const existingPayment = await Payment.findOne({
      where: {
        memberId,
        type: 'INITIAL_PAYMENT'
      }
    });
    
    if (existingPayment) {
      console.log('⚠️ Member has already made an initial payment');
      await t.rollback();
      return res.status(400).json({ 
        emoji: '⚠️', 
        error: 'Member has already made an initial payment' 
      });
    }
    
    // Extract values with validation
    console.log('⏳ Validating payment details...');
    console.log('💰 Payment details:', JSON.stringify(req.body, null, 2));
    
    // Extract values with proper type conversion
    const joiningFee = parseFloat(req.body.joiningFee) || 0;
    const shares = parseFloat(req.body.shares) || 0;
    const idFee = parseFloat(req.body.idFee) || 0;
    const tshirtFee = parseFloat(req.body.tshirtFee) || 0;
    const joiningFormFee = parseFloat(req.body.joiningFormFee) || 0;
    const passbookFee = parseFloat(req.body.passbookFee) || 0;
    const totalAmount = parseFloat(req.body.totalAmount) || 
      (joiningFee + shares + idFee + tshirtFee + joiningFormFee + passbookFee);
    
    // Check if member exists
    const member = await Member.findByPk(memberId);
    if (!member) {
      await t.rollback();
      return res.status(404).json({ emoji: '⚠️', error: 'Member not found' });
    }
    
    // Get/create account types if they don't exist
    console.log('⏳ Setting up account types...');
    
    // Create or find all default account types
    const defaultAccountTypes = [
      {
        name: 'SHARES',
        description: 'Member shares account',
        interestRate: 0,
        minimumBalance: 100000,
        isActive: true
      },
      {
        name: 'SAVINGS',
        description: 'Member savings account',
        interestRate: 3.5,
        minimumBalance: 0,
        isActive: true
      },
      {
        name: 'DEPOSITS',
        description: 'Fixed term deposits',
        interestRate: 5.0,
        minimumBalance: 0,
        isActive: true
      },
      {
        name: 'VOLUNTARY_SHARES',
        description: 'Optional additional shares',
        interestRate: 0,
        minimumBalance: 0,
        isActive: true
      },
      {
        name: 'LOAN',
        description: 'Loan account',
        interestRate: 12.0,
        minimumBalance: 0,
        isActive: true
      }
    ];
    
    // Create account types and store them in a map for easy access
    const accountTypeMap = {};
    
    // Process each account type
    for (const typeData of defaultAccountTypes) {
      const [accountType] = await AccountType.findOrCreate({
        where: { name: typeData.name },
        defaults: typeData,
        transaction: t
      });
      
      accountTypeMap[typeData.name] = accountType;
      console.log(`✅ Account type ${typeData.name} ready`);
    }
    
    // Extract the account types we need
    const sharesAccountType = accountTypeMap['SHARES'];
    const savingsAccountType = accountTypeMap['SAVINGS'];
    const depositsAccountType = accountTypeMap['DEPOSITS'];
    const voluntarySharesAccountType = accountTypeMap['VOLUNTARY_SHARES'];
    const loanAccountType = accountTypeMap['LOAN'];
    
    console.log('⏳ Creating all default member accounts...');
    const accounts = {};
    
    // Create member share account (with initial shares value)
    const shareAccountNumber = await generateAccountNumber(sharesAccountType.id);
    accounts.shares = await MemberAccount.create({
      memberId,
      accountTypeId: sharesAccountType.id,
      accountNumber: shareAccountNumber,
      balance: shares,
      status: 'ACTIVE',
      activationDate: new Date()
    }, { transaction: t });
    console.log(`✅ Created SHARES account with number: ${shareAccountNumber}`);
    
    // Create member savings account (zero balance)
    const savingsAccountNumber = await generateAccountNumber(savingsAccountType.id);
    accounts.savings = await MemberAccount.create({
      memberId,
      accountTypeId: savingsAccountType.id,
      accountNumber: savingsAccountNumber,
      balance: 0,
      status: 'ACTIVE',
      activationDate: new Date()
    }, { transaction: t });
    console.log(`✅ Created SAVINGS account with number: ${savingsAccountNumber}`);
    
    // Create member deposits account (zero balance)
    const depositsAccountNumber = await generateAccountNumber(depositsAccountType.id);
    accounts.deposits = await MemberAccount.create({
      memberId,
      accountTypeId: depositsAccountType.id,
      accountNumber: depositsAccountNumber,
      balance: 0,
      status: 'ACTIVE',
      activationDate: new Date()
    }, { transaction: t });
    console.log(`✅ Created DEPOSITS account with number: ${depositsAccountNumber}`);
    
    // Create member voluntary shares account (zero balance)
    const voluntarySharesAccountNumber = await generateAccountNumber(voluntarySharesAccountType.id);
    accounts.voluntaryShares = await MemberAccount.create({
      memberId,
      accountTypeId: voluntarySharesAccountType.id,
      accountNumber: voluntarySharesAccountNumber,
      balance: 0,
      status: 'ACTIVE',
      activationDate: new Date()
    }, { transaction: t });
    console.log(`✅ Created VOLUNTARY_SHARES account with number: ${voluntarySharesAccountNumber}`);
    
    // Create member loan account (zero balance)
    const loanAccountNumber = await generateAccountNumber(loanAccountType.id);
    accounts.loan = await MemberAccount.create({
      memberId,
      accountTypeId: loanAccountType.id,
      accountNumber: loanAccountNumber,
      balance: 0,
      status: 'ACTIVE',
      activationDate: new Date()
    }, { transaction: t });
    console.log(`✅ Created LOAN account with number: ${loanAccountNumber}`);
    
    
    // Record transaction for shares account
    if (shares > 0) {
      console.log('⏳ Recording transaction for shares account...');
      try {
        await Transaction.create({
          accountId: accounts.shares.id, // Using the new accounts object structure
          amount: shares,
          type: 'CREDIT',
          description: 'Initial shares purchase',
          referenceNumber: `INIT-SHR-${Date.now()}`,
          balanceBefore: 0, // Required field
          balanceAfter: shares, // Required field
          performedBy: req.user?.id || 1
        }, { transaction: t });
        console.log('✅ Transaction recorded successfully');
      } catch (txError) {
        console.log('❌ Failed to record transaction:', txError.message);
        throw txError; // Re-throw to be caught by the main try-catch
      }
    }
    
    // Record fee payments in a ledger or separate table
    // For now, we'll just create a transaction record
    const feesBreakdown = {
      joiningFee,
      idFee,
      tshirtFee,
      joiningFormFee,
      passbookFee
    };
    
    // Create a record of the payment with proper error handling
    let paymentRecord;
    try {
      console.log('⏳ Creating payment record...');
      paymentRecord = await Payment.create({
        memberId: parseInt(memberId),
        amount: parseFloat(totalAmount) || 0,
        type: 'INITIAL_PAYMENT',
        description: 'Initial membership payment',
        breakdown: feesBreakdown, // Model setter will handle conversion to JSON string
        status: 'COMPLETED',
        paymentDate: new Date()
      }, { transaction: t });
      console.log('✅ Payment record created successfully with ID:', paymentRecord.id);
    } catch (paymentError) {
      console.log('❌ Failed to create payment record:', paymentError.message);
      console.error('Detailed payment error:', paymentError);
      // Continue without throwing - we'll use the accounts even if payment record fails
      paymentRecord = { id: null, error: paymentError.message };
    }
    
    await t.commit();
    
    console.log(`✅ Initial payment processed successfully for member ${memberId}`);
    res.status(200).json({
      emoji: '✅',
      message: 'Initial payment processed successfully',
      payment: {
        id: paymentRecord.id,
        amount: totalAmount,
        breakdown: {
          joiningFee,
          shares,
          idFee,
          tshirtFee,
          joiningFormFee,
          passbookFee
        }
      },
      accounts: {
        shares: {
          id: accounts.shares.id,
          accountNumber: accounts.shares.accountNumber,
          balance: accounts.shares.balance,
          accountType: 'SHARES'
        },
        savings: {
          id: accounts.savings.id,
          accountNumber: accounts.savings.accountNumber,
          balance: accounts.savings.balance,
          accountType: 'SAVINGS'
        },
        deposits: {
          id: accounts.deposits.id,
          accountNumber: accounts.deposits.accountNumber,
          balance: accounts.deposits.balance, 
          accountType: 'DEPOSITS'
        },
        voluntaryShares: {
          id: accounts.voluntaryShares.id,
          accountNumber: accounts.voluntaryShares.accountNumber,
          balance: accounts.voluntaryShares.balance,
          accountType: 'VOLUNTARY_SHARES'
        },
        loan: {
          id: accounts.loan.id,
          accountNumber: accounts.loan.accountNumber,
          balance: accounts.loan.balance,
          accountType: 'LOAN'
        }
      }
    });
    
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback().catch(rollbackErr => {
        console.error('Rollback error:', rollbackErr.message);
      });
    }
    
    console.log('❌ [Account] Failed to process initial payment:', error.message);
    
    // Enhanced error logging for debugging
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      console.error('Validation errors:');
      error.errors.forEach(e => {
        console.error(`- Field: ${e.path}, Error: ${e.message}, Value: ${e.value}`);
      });
      return res.status(400).json({ 
        emoji: '❌', 
        error: 'Validation error', 
        details: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    } else {
      console.error('Error details:', error);
      return res.status(500).json({ emoji: '❌', error: error.message });
    }
  }
};
