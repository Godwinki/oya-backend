// utils/accountUtils.js
const db = require('../models');
const Member = db.Member;
const { Op } = require('sequelize');

/**
 * Get the next available member account number
 * 
 * @returns {Promise<string>} The next available account number
 */
const getNextMemberNumber = async () => {
  try {
    // Find the highest account number currently in use
    const latestMember = await Member.findOne({
      where: {
        accountNumber: {
          [Op.not]: null
        }
      },
      order: [['accountNumber', 'DESC']]
    });

    if (!latestMember || !latestMember.accountNumber) {
      // If there are no members with account numbers, start with 1000
      return '1000';
    }

    // Parse the number - assuming it's numeric
    const currentNumber = parseInt(latestMember.accountNumber, 10);
    if (isNaN(currentNumber)) {
      // If it can't be parsed as a number, start with 1000
      return '1000';
    }

    // Increment by 1 and return as string
    return (currentNumber + 1).toString();
  } catch (error) {
    console.error('Error getting next member number:', error);
    // Return a fallback value
    return 'NEW';
  }
};

module.exports = {
  getNextMemberNumber
};
