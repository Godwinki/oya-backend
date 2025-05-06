// routes/memberRoutes.js
const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { memberValidationRules, validateMember } = require('../middleware/memberMiddleware');

// CRUD routes
router.post('/', memberValidationRules, validateMember, memberController.createMember);
router.get('/', memberController.getMembers);
router.get('/:id', memberController.getMemberById);
router.put('/:id', memberValidationRules, validateMember, memberController.updateMember);
router.delete('/:id', memberController.deleteMember);

module.exports = router;
