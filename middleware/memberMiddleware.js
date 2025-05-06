// middleware/memberMiddleware.js
/**
 * Validation middleware for Member endpoints
 */
const { body, validationResult } = require('express-validator');

// Validation rules for creating/updating a member
const memberValidationRules = [
  body('nin').notEmpty().withMessage('NIN is required'),
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('idNo').notEmpty().withMessage('ID number is required'),
  body('dateOfBirth').optional().isISO8601().withMessage('Date of birth must be a valid date'),
  body('mobile').optional().isMobilePhone().withMessage('Mobile number must be valid'),
  body('email').optional().isEmail().withMessage('Email must be valid'),
  body('accountNumber').optional().isString(),
  // Add more field-specific rules as needed
];

// Middleware to handle validation result
const validateMember = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  memberValidationRules,
  validateMember,
};
