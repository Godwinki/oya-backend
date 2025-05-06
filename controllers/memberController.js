// controllers/memberController.js
const db = require('../models');
const Member = db.Member;

// Create a new member
exports.createMember = async (req, res) => {
  console.log('📝 [Member] Create member request received');
  try {
    const member = await Member.create(req.body);
    console.log('✅ [Member] Member created:', member.id);
    res.status(201).json({ emoji: '🎉', message: 'Member created successfully', member });
  } catch (error) {
    console.log('❌ [Member] Failed to create member:', error.message);
    res.status(400).json({ emoji: '❌', error: error.message });
  }
};

// Get all members
exports.getMembers = async (req, res) => {
  console.log('📥 [Member] Request to list all members received');
  try {
    const members = await Member.findAll();
    console.log(`✅ [Member] Returned ${members.length} members`);
    res.json({ emoji: '📖', message: 'All members fetched successfully', members });
  } catch (error) {
    console.log('❌ [Member] Failed to fetch members:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get a single member by ID
exports.getMemberById = async (req, res) => {
  console.log(`📥 [Member] Request to get member: ${req.params.id}`);
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      console.log(`⚠️ [Member] Member not found: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Member not found' });
    }
    console.log(`✅ [Member] Member returned: ${req.params.id}`);
    res.json({ emoji: '🧑', message: 'Member fetched successfully', member });
  } catch (error) {
    console.log('❌ [Member] Failed to fetch member:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Update a member
exports.updateMember = async (req, res) => {
  console.log(`✏️ [Member] Update request for member: ${req.params.id}`);
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      console.log(`⚠️ [Member] Member not found for update: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Member not found' });
    }
    await member.update(req.body);
    console.log(`✅ [Member] Member updated: ${req.params.id}`);
    res.json({ emoji: '✏️', message: 'Member updated successfully', member });
  } catch (error) {
    console.log('❌ [Member] Failed to update member:', error.message);
    res.status(400).json({ emoji: '❌', error: error.message });
  }
};

// Delete a member
exports.deleteMember = async (req, res) => {
  console.log(`🗑️ [Member] Delete request for member: ${req.params.id}`);
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      console.log(`⚠️ [Member] Member not found for delete: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Member not found' });
    }
    await member.destroy();
    console.log(`✅ [Member] Member deleted: ${req.params.id}`);
    res.json({ emoji: '🗑️', message: 'Member deleted' });
  } catch (error) {
    console.log('❌ [Member] Failed to delete member:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};
