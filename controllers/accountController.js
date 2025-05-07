// controllers/accountController.js
const db = require('../models');
const MemberAccount = db.MemberAccount;
const Transaction = db.Transaction;
const AccountType = db.AccountType;
const Member = db.Member;
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
    
    // Count existing accounts of this type to create a sequential number
    const count = await MemberAccount.count({ where: { accountTypeId } });
    
    // Format number with padding
    const paddedNumber = String(count + 1).padStart(8, '0');
    
    // Concatenate with current year
    const year = new Date().getFullYear().toString().substr(2, 2);
    
    return `${prefix}${year}${paddedNumber}`;
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
  console.log(`📥 [Account] Request to list accounts for member: ${req.params.memberId}`);
  try {
    const accounts = await MemberAccount.findAll({
      where: { memberId: req.params.memberId },
      include: [{
        model: AccountType,
        as: 'accountType'
      }]
    });
    console.log(`✅ [Account] Returned ${accounts.length} accounts for member: ${req.params.memberId}`);
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
  console.log('📥 [AccountType] Request to list account types');
  try {
    const accountTypes = await AccountType.findAll({
      where: { isActive: true }
    });
    console.log(`✅ [AccountType] Returned ${accountTypes.length} account types`);
    res.json({ 
      emoji: '📋', 
      message: 'Account types fetched successfully', 
      accountTypes 
    });
  } catch (error) {
    console.log('❌ [AccountType] Failed to fetch account types:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Create account type
exports.createAccountType = async (req, res) => {
  console.log('📝 [AccountType] Create account type request received');
  try {
    const { name, description, interestRate, minimumBalance } = req.body;
    
    const accountType = await AccountType.create({
      name,
      description,
      interestRate: interestRate || 0,
      minimumBalance: minimumBalance || 0,
      isActive: true
    });
    
    console.log('✅ [AccountType] Account type created:', accountType.id);
    res.status(201).json({ 
      emoji: '🎉', 
      message: 'Account type created successfully', 
      accountType 
    });
  } catch (error) {
    console.log('❌ [AccountType] Failed to create account type:', error.message);
    res.status(400).json({ emoji: '❌', error: error.message });
  }
};
