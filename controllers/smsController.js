// smsController.js
const { Op } = require('sequelize');
const db = require('../models');
const { 
  User, 
  SMSTemplate, 
  ContactCategory, 
  SMSProvider, 
  SMSMessage, 
  SMSRecipient,
  Member
} = db;
const sequelize = db.sequelize;
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { checkPhoneFormat } = require('../utils/validatePhone');

// ------------------------- SMS TEMPLATES -------------------------

/**
 * Get all SMS templates
 */
const getAllTemplates = catchAsync(async (req, res) => {
  const templates = await SMSTemplate.findAll({
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName']
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.status(200).json({
    status: 'success',
    data: templates
  });
});

/**
 * Get SMS template by ID
 */
const getTemplateById = catchAsync(async (req, res) => {
  const template = await SMSTemplate.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName']
      }
    ]
  });

  if (!template) {
    throw new ApiError(404, 'SMS template not found');
  }

  res.status(200).json({
    status: 'success',
    data: template
  });
});

/**
 * Create a new SMS template
 */
const createTemplate = catchAsync(async (req, res) => {
  const { name, content } = req.body;

  if (!name || !content) {
    throw new ApiError(400, 'Name and content are required');
  }

  const template = await SMSTemplate.create({
    name,
    content,
    createdById: req.user.id
  });

  res.status(201).json({
    status: 'success',
    data: template
  });
});

/**
 * Update an SMS template
 */
const updateTemplate = catchAsync(async (req, res) => {
  const { name, content } = req.body;
  const template = await SMSTemplate.findByPk(req.params.id);

  if (!template) {
    throw new ApiError(404, 'SMS template not found');
  }

  if (name) template.name = name;
  if (content) template.content = content;

  await template.save();

  res.status(200).json({
    status: 'success',
    data: template
  });
});

/**
 * Delete an SMS template
 */
const deleteTemplate = catchAsync(async (req, res) => {
  const template = await SMSTemplate.findByPk(req.params.id);

  if (!template) {
    throw new ApiError(404, 'SMS template not found');
  }

  await template.destroy();

  res.status(204).send();
});

// ------------------------- CONTACT CATEGORIES -------------------------

/**
 * Get all contact categories
 */
const getAllContactCategories = catchAsync(async (req, res) => {
  try {
    // First, try to find all categories with includes
    const categories = await ContactCategory.findAll({
      attributes: ['id', 'name', 'description', 'color', 'createdAt', 'updatedAt', 'createdById'],
      order: [['createdAt', 'DESC']]
    });

    // Get the count of members for each category separately to avoid association issues
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        try {
          // Check if the CategoryMembers table exists first
          const tableExists = await sequelize.query(
            `SELECT EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_name = 'CategoryMembers'
            )`,
            {
              type: sequelize.QueryTypes.SELECT,
              plain: true
            }
          );
          
          let count = 0;
          if (tableExists && tableExists.exists) {
            const result = await sequelize.query(
              'SELECT COUNT(*) as count FROM "CategoryMembers" WHERE "categoryId" = :categoryId',
              {
                replacements: { categoryId: category.id },
                type: sequelize.QueryTypes.SELECT,
                plain: true
              }
            );
            count = result ? parseInt(result.count) : 0;
          }
          
          return {
            ...category.toJSON(),
            count
          };
        } catch (error) {
          console.error(`Error counting members for category ${category.id}:`, error);
          return {
            ...category.toJSON(),
            count: 0
          };
        }
      })
    );

    return res.status(200).json({
      status: 'success',
      data: categoriesWithCount
    });
  } catch (err) {
    console.error('Error fetching contact categories:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch contact categories',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * Get contact category by ID
 */
const getContactCategoryById = catchAsync(async (req, res) => {
  const category = await ContactCategory.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName']
      },
      {
        model: Member,
        as: 'members',
        attributes: ['id', 'fullName', 'mobile', 'email'],
        through: { attributes: [] }
      }
    ]
  });

  if (!category) {
    throw new ApiError(404, 'Contact category not found');
  }

  // Add member count
  const plainCategory = category.get({ plain: true });
  plainCategory.count = plainCategory.members ? plainCategory.members.length : 0;

  res.status(200).json({
    status: 'success',
    data: plainCategory
  });
});

/**
 * Create a new contact category
 */
const createContactCategory = catchAsync(async (req, res) => {
  const { name, description, color } = req.body;

  if (!name) {
    throw new ApiError(400, 'Name is required');
  }

  const category = await ContactCategory.create({
    name,
    description,
    color: color || 'bg-blue-500',
    createdById: req.user.id
  });

  res.status(201).json({
    status: 'success',
    data: {
      ...category.get({ plain: true }),
      count: 0
    }
  });
});

/**
 * Update a contact category
 */
const updateContactCategory = catchAsync(async (req, res) => {
  const { name, description, color } = req.body;
  const category = await ContactCategory.findByPk(req.params.id, {
    include: [
      {
        model: Member,
        as: 'members',
        attributes: ['id'],
        through: { attributes: [] }
      }
    ]
  });

  if (!category) {
    throw new ApiError(404, 'Contact category not found');
  }

  if (name) category.name = name;
  if (description !== undefined) category.description = description;
  if (color) category.color = color;

  await category.save();

  // Add member count
  const plainCategory = category.get({ plain: true });
  plainCategory.count = plainCategory.members ? plainCategory.members.length : 0;
  delete plainCategory.members;

  res.status(200).json({
    status: 'success',
    data: plainCategory
  });
});

/**
 * Delete a contact category
 */
const deleteContactCategory = catchAsync(async (req, res) => {
  const category = await ContactCategory.findByPk(req.params.id);

  if (!category) {
    throw new ApiError(404, 'Contact category not found');
  }

  await category.destroy();

  res.status(204).send();
});

module.exports = {
  // Templates
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  
  // Categories
  getAllContactCategories,
  getContactCategoryById,
  createContactCategory,
  updateContactCategory,
  deleteContactCategory,
};
