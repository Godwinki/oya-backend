// smsMemberController.js
const { Op } = require('sequelize');
const { 
  ContactCategory, 
  Member,
  sequelize
} = require('../models');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

/**
 * Add members to a contact category
 */
const addMembersToCategory = catchAsync(async (req, res) => {
  const { categoryId } = req.params;
  const { memberIds } = req.body;

  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    throw new ApiError(400, 'Member IDs are required and must be an array');
  }

  const category = await ContactCategory.findByPk(categoryId);
  if (!category) {
    throw new ApiError(404, 'Contact category not found');
  }

  // Validate that all members exist
  const members = await Member.findAll({
    where: {
      id: {
        [Op.in]: memberIds
      }
    }
  });

  if (members.length !== memberIds.length) {
    throw new ApiError(400, 'Some members were not found');
  }

  // Add members to category
  await category.addMembers(members);

  res.status(200).json({
    status: 'success',
    message: `${members.length} members added to the category`
  });
});

/**
 * Remove members from a contact category
 */
const removeMembersFromCategory = catchAsync(async (req, res) => {
  const { categoryId } = req.params;
  const { memberIds } = req.body;

  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    throw new ApiError(400, 'Member IDs are required and must be an array');
  }

  const category = await ContactCategory.findByPk(categoryId);
  if (!category) {
    throw new ApiError(404, 'Contact category not found');
  }

  // Remove members from category
  await category.removeMembers(memberIds);

  res.status(200).json({
    status: 'success',
    message: `Members removed from the category`
  });
});

/**
 * Get all members for a specific contact category
 */
const getCategoryMembers = catchAsync(async (req, res) => {
  const { categoryId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const category = await ContactCategory.findByPk(categoryId);
  if (!category) {
    throw new ApiError(404, 'Contact category not found');
  }

  const offset = (page - 1) * limit;

  const { count, rows } = await Member.findAndCountAll({
    include: [
      {
        model: ContactCategory,
        as: 'categories',
        where: { id: categoryId },
        through: { attributes: [] },
        attributes: []
      }
    ],
    attributes: ['id', 'fullName', 'mobile', 'email', 'accountNumber'],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.status(200).json({
    status: 'success',
    data: rows,
    meta: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  });
});

/**
 * Get member groups for SMS sending
 */
const getMemberGroups = catchAsync(async (req, res) => {
  // Create a default response with all members
  const memberGroups = [];
  
  try {
    // Check if Member table exists
    const memberTableExists = await sequelize.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'Members'
      )`,
      {
        type: sequelize.QueryTypes.SELECT,
        plain: true
      }
    );
    
    if (memberTableExists && memberTableExists.exists) {
      // Get total count of all members
      const totalMembersCount = await Member.count();
      memberGroups.push({ id: 'all', name: 'All Members', count: totalMembersCount || 0 });
      
      // Check if Loans table exists
      const loansTableExists = await sequelize.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'Loans'
        )`,
        {
          type: sequelize.QueryTypes.SELECT,
          plain: true
        }
      );
      
      if (loansTableExists && loansTableExists.exists) {
        // Get the count of members with loans
        const loanHoldersCountResult = await sequelize.query(
          `SELECT COUNT(DISTINCT m.id) as count 
           FROM "Members" m 
           INNER JOIN "Loans" l ON m.id = l."memberId" 
           WHERE l.status IN ('ACTIVE', 'PAST_DUE')`,
          { type: sequelize.QueryTypes.SELECT, plain: true }
        );
        
        // Get the count of members with overdue loans
        const overdueLoansCountResult = await sequelize.query(
          `SELECT COUNT(DISTINCT m.id) as count 
           FROM "Members" m 
           INNER JOIN "Loans" l ON m.id = l."memberId" 
           WHERE l.status = 'PAST_DUE'`,
          { type: sequelize.QueryTypes.SELECT, plain: true }
        );
        
        if (loanHoldersCountResult) {
          memberGroups.push({ 
            id: 'loan-holders', 
            name: 'Loan Holders', 
            count: parseInt(loanHoldersCountResult.count || 0) 
          });
        }
        
        if (overdueLoansCountResult) {
          memberGroups.push({ 
            id: 'overdue-loans', 
            name: 'Overdue Payments', 
            count: parseInt(overdueLoansCountResult.count || 0) 
          });
        }
      }
      
      // Check if Savings table exists
      const savingsTableExists = await sequelize.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'Savings'
        )`,
        {
          type: sequelize.QueryTypes.SELECT,
          plain: true
        }
      );
      
      if (savingsTableExists && savingsTableExists.exists) {
        const highSavingsCountResult = await sequelize.query(
          `SELECT COUNT(DISTINCT m.id) as count 
           FROM "Members" m 
           INNER JOIN "Savings" s ON m.id = s."memberId" 
           WHERE s.balance > 1000000`,
          { type: sequelize.QueryTypes.SELECT, plain: true }
        );
        
        if (highSavingsCountResult) {
          memberGroups.push({ 
            id: 'high-savings', 
            name: 'High Savings Members', 
            count: parseInt(highSavingsCountResult.count || 0) 
          });
        }
      }
      
      // Check if Transactions table exists
      const transactionsTableExists = await sequelize.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'Transactions'
        )`,
        {
          type: sequelize.QueryTypes.SELECT,
          plain: true
        }
      );
      
      if (transactionsTableExists && transactionsTableExists.exists) {
        const inactiveMembersCountResult = await sequelize.query(
          `SELECT COUNT(DISTINCT m.id) as count 
           FROM "Members" m 
           LEFT JOIN "Transactions" t ON m.id = t."memberId" 
           WHERE t."createdAt" < NOW() - INTERVAL '3 months'
           OR t.id IS NULL`,
          { type: sequelize.QueryTypes.SELECT, plain: true }
        );
        
        if (inactiveMembersCountResult) {
          memberGroups.push({ 
            id: 'inactive', 
            name: 'Inactive Members', 
            count: parseInt(inactiveMembersCountResult.count || 0) 
          });
        }
      }
    } else {
      // If Member table doesn't exist, return empty groups
      memberGroups.push({ id: 'all', name: 'All Members', count: 0 });
    }
  } catch (error) {
    console.error("Error in member groups queries:", error);
    // Even if queries fail, we still return the basic "All Members" group
    if (memberGroups.length === 0) {
      memberGroups.push({ id: 'all', name: 'All Members', count: 0 });
    }
  }

  res.status(200).json({
    status: 'success',
    data: memberGroups
  });
});

/**
 * Get individual members for SMS selection
 */
const getIndividualMembers = catchAsync(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = {};
  if (search) {
    where = {
      [Op.or]: [
        { fullName: { [Op.iLike]: `%${search}%` } },
        { mobile: { [Op.iLike]: `%${search}%` } },
        { accountNumber: { [Op.iLike]: `%${search}%` } }
      ]
    };
  }

  // Make sure members have a mobile number
  where.mobile = {
    [Op.not]: null,
    [Op.ne]: ''
  };

  const { count, rows } = await Member.findAndCountAll({
    where,
    attributes: ['id', 'fullName', 'mobile', 'accountNumber'],
    order: [['fullName', 'ASC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.status(200).json({
    status: 'success',
    data: rows,
    meta: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  });
});

/**
 * Search for members by name, phone number, or account number
 */
const searchMembers = catchAsync(async (req, res) => {
  const { query, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = {};
  if (query) {
    where = {
      [Op.or]: [
        { fullName: { [Op.iLike]: `%${query}%` } },
        { mobile: { [Op.iLike]: `%${query}%` } },
        { accountNumber: { [Op.iLike]: `%${query}%` } }
      ]
    };
  }

  // Make sure members have a mobile number
  where.mobile = { [Op.ne]: null };

  const { count, rows } = await Member.findAndCountAll({
    where,
    attributes: ['id', 'fullName', 'mobile', 'email', 'accountNumber'],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['fullName', 'ASC']]
  });

  const totalPages = Math.ceil(count / limit);

  res.status(200).json({
    status: 'success',
    data: rows,
    meta: {
      page: parseInt(page),
      limit: parseInt(limit),
      totalItems: count,
      totalPages
    }
  });
});

module.exports = {
  addMembersToCategory,
  removeMembersFromCategory,
  getCategoryMembers,
  getMemberGroups,
  getIndividualMembers,
  searchMembers
};
