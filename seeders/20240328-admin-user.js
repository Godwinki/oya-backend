'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('Admin@255', 12);
    const now = new Date();
    const threeMonthsFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));
    
    await queryInterface.bulkInsert('Users', [{
      id: uuidv4(),
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@awibsys.com',
      password: hashedPassword,
      phoneNumber: '+255123456789',
      department: 'Administration',
      role: 'admin',
      status: 'active',
      failedLoginAttempts: 0,
      lastPasswordChangedAt: now,
      passwordExpiresAt: threeMonthsFromNow,
      lockoutUntil: null,
      passwordHistory: '{}',
      securityQuestions: '{}',
      preferences: '{}',
      profilePicture: null,
      lastLogin: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      createdAt: now,
      updatedAt: now
    }], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', { email: 'admin@awibsys.com' }, {});
  }
}; 