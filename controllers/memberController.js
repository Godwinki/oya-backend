// controllers/memberController.js
const db = require('../models');
const Member = db.Member;
const Beneficiary = db.Beneficiary;
const EmergencyContact = db.EmergencyContact;
const { getNextMemberNumber } = require('../utils/accountUtils');

// Get the next available member account number
exports.getNextAccountNumber = async (req, res) => {
  console.log('📝 [Member] Request for next available account number');
  try {
    const nextNumber = await getNextMemberNumber();
    console.log('✅ [Member] Next account number generated:', nextNumber);
    res.json({ emoji: '💳', message: 'Next account number generated', accountNumber: nextNumber });
  } catch (error) {
    console.log('❌ [Member] Failed to generate next account number:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Create a new member
exports.createMember = async (req, res) => {
  console.log('📝 [Member] Create member request received');
  try {
    // Start a transaction so we can roll back if any part fails
    const transaction = await db.sequelize.transaction();
    
    try {
      // Extract beneficiaries and emergency contacts from request body
      const { beneficiaries, emergencyContacts, ...memberData } = req.body;
      
      // If no account number is provided, generate one
      if (!memberData.accountNumber) {
        memberData.accountNumber = await getNextMemberNumber();
        console.log('ℹ️ [Member] Auto-generated account number:', memberData.accountNumber);
      }
      
      // Create the member
      const member = await Member.create(memberData, { transaction });
      console.log('✅ [Member] Member created:', member.id);
      
      // Process beneficiaries if provided
      if (beneficiaries && Array.isArray(beneficiaries)) {
        console.log(`ℹ️ [Member] Processing ${beneficiaries.length} beneficiaries`);
        
        for (const benef of beneficiaries) {
          // Transform names if necessary (frontend might use 'name' instead of 'fullName')
          const benefData = {
            fullName: benef.name || benef.fullName || '',
            relationship: benef.relationship || '',
            contactInfo: benef.phone || benef.contactInfo || '',
            sharePercentage: parseFloat(benef.percentage || benef.sharePercentage || '0'),
            dateOfBirth: benef.dateOfBirth || new Date(),
            isMinor: benef.isMinor || false,
            guardianName: benef.guardianName || '',
            guardianContact: benef.guardianContact || '',
            memberId: member.id
          };
          
          await Beneficiary.create(benefData, { transaction });
        }
      } else if (typeof beneficiaries === 'string') {
        // Parse JSON string if it comes in that format
        try {
          const parsedBeneficiaries = JSON.parse(beneficiaries);
          if (Array.isArray(parsedBeneficiaries)) {
            console.log(`ℹ️ [Member] Processing ${parsedBeneficiaries.length} parsed beneficiaries`);
            
            for (const benef of parsedBeneficiaries) {
              const benefData = {
                fullName: benef.name || benef.fullName || '',
                relationship: benef.relationship || '',
                contactInfo: benef.phone || benef.contactInfo || '',
                sharePercentage: parseFloat(benef.percentage || benef.sharePercentage || '0'),
                dateOfBirth: benef.dateOfBirth || new Date(),
                isMinor: benef.isMinor || false,
                guardianName: benef.guardianName || '',
                guardianContact: benef.guardianContact || '',
                memberId: member.id
              };
              
              await Beneficiary.create(benefData, { transaction });
            }
          }
        } catch (parseError) {
          console.log('⚠️ [Member] Failed to parse beneficiaries JSON:', parseError.message);
        }
      }
      
      // Process emergency contacts if provided
      if (emergencyContacts && Array.isArray(emergencyContacts)) {
        console.log(`ℹ️ [Member] Processing ${emergencyContacts.length} emergency contacts`);
        
        for (const contact of emergencyContacts) {
          // Transform names if necessary
          const contactData = {
            fullName: contact.name || contact.fullName || '',
            relationship: contact.relationship || '',
            primaryPhone: contact.phone || contact.primaryPhone || '',
            alternativePhone: contact.alternativePhone || '',
            email: contact.email || '',
            address: contact.address || '',
            memberId: member.id
          };
          
          await EmergencyContact.create(contactData, { transaction });
        }
      } else if (typeof emergencyContacts === 'string') {
        // Parse JSON string if it comes in that format
        try {
          const parsedContacts = JSON.parse(emergencyContacts);
          if (Array.isArray(parsedContacts)) {
            console.log(`ℹ️ [Member] Processing ${parsedContacts.length} parsed emergency contacts`);
            
            for (const contact of parsedContacts) {
              const contactData = {
                fullName: contact.name || contact.fullName || '',
                relationship: contact.relationship || '',
                primaryPhone: contact.phone || contact.primaryPhone || '',
                alternativePhone: contact.alternativePhone || '',
                email: contact.email || '',
                address: contact.address || '',
                memberId: member.id
              };
              
              await EmergencyContact.create(contactData, { transaction });
            }
          }
        } catch (parseError) {
          console.log('⚠️ [Member] Failed to parse emergency contacts JSON:', parseError.message);
        }
      }
      
      // Commit the transaction
      await transaction.commit();
      
      // Fetch the member with all associations to return
      const memberWithRelations = await Member.findByPk(member.id, {
        include: [
          { model: Beneficiary, as: 'beneficiaries' },
          { model: EmergencyContact, as: 'emergencyContacts' }
        ]
      });
      
      res.status(201).json({ 
        emoji: '🎉', 
        message: 'Member created successfully', 
        member: memberWithRelations 
      });
    } catch (error) {
      // Rollback transaction if anything fails
      await transaction.rollback();
      throw error;
    }
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
    const member = await Member.findByPk(req.params.id, {
      include: [
        { model: Beneficiary, as: 'beneficiaries' },
        { model: EmergencyContact, as: 'emergencyContacts' },
        // Keep any other includes that you need
      ]
    });
    
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
  console.log(`📝 [Member] Update request for member: ${req.params.id}`);
  try {
    // Start a transaction
    const transaction = await db.sequelize.transaction();
    
    try {
      // Extract beneficiaries and emergency contacts from request body
      const { beneficiaries, emergencyContacts, ...memberData } = req.body;
      
      const member = await Member.findByPk(req.params.id);
      if (!member) {
        console.log(`⚠️ [Member] Member not found: ${req.params.id}`);
        await transaction.rollback();
        return res.status(404).json({ emoji: '⚠️', error: 'Member not found' });
      }
      
      // Update member data
      await member.update(memberData, { transaction });
      
      // Handle beneficiaries if provided
      if (beneficiaries && (Array.isArray(beneficiaries) || typeof beneficiaries === 'string')) {
        // First, remove existing beneficiaries
        await Beneficiary.destroy({
          where: { memberId: member.id },
          transaction
        });
        
        // Then add the new ones
        let beneficiaryArray = beneficiaries;
        if (typeof beneficiaries === 'string') {
          try {
            beneficiaryArray = JSON.parse(beneficiaries);
          } catch (parseError) {
            console.log('⚠️ [Member] Failed to parse beneficiaries JSON:', parseError.message);
            beneficiaryArray = [];
          }
        }
        
        if (Array.isArray(beneficiaryArray)) {
          for (const benef of beneficiaryArray) {
            const benefData = {
              fullName: benef.name || benef.fullName || '',
              relationship: benef.relationship || '',
              contactInfo: benef.phone || benef.contactInfo || '',
              sharePercentage: parseFloat(benef.percentage || benef.sharePercentage || '0'),
              dateOfBirth: benef.dateOfBirth || new Date(),
              isMinor: benef.isMinor || false,
              guardianName: benef.guardianName || '',
              guardianContact: benef.guardianContact || '',
              memberId: member.id
            };
            
            await Beneficiary.create(benefData, { transaction });
          }
        }
      }
      
      // Handle emergency contacts if provided
      if (emergencyContacts && (Array.isArray(emergencyContacts) || typeof emergencyContacts === 'string')) {
        // First, remove existing emergency contacts
        await EmergencyContact.destroy({
          where: { memberId: member.id },
          transaction
        });
        
        // Then add the new ones
        let contactsArray = emergencyContacts;
        if (typeof emergencyContacts === 'string') {
          try {
            contactsArray = JSON.parse(emergencyContacts);
          } catch (parseError) {
            console.log('⚠️ [Member] Failed to parse emergency contacts JSON:', parseError.message);
            contactsArray = [];
          }
        }
        
        if (Array.isArray(contactsArray)) {
          for (const contact of contactsArray) {
            const contactData = {
              fullName: contact.name || contact.fullName || '',
              relationship: contact.relationship || '',
              primaryPhone: contact.phone || contact.primaryPhone || '',
              alternativePhone: contact.alternativePhone || '',
              email: contact.email || '',
              address: contact.address || '',
              memberId: member.id
            };
            
            await EmergencyContact.create(contactData, { transaction });
          }
        }
      }
      
      // Commit the transaction
      await transaction.commit();
      
      // Fetch the updated member with all associations
      const updatedMember = await Member.findByPk(member.id, {
        include: [
          { model: Beneficiary, as: 'beneficiaries' },
          { model: EmergencyContact, as: 'emergencyContacts' }
        ]
      });
      
      console.log(`✅ [Member] Member updated: ${req.params.id}`);
      res.json({ emoji: '🔄', message: 'Member updated successfully', member: updatedMember });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.log(`❌ [Member] Failed to update member: ${req.params.id}`, error.message);
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
