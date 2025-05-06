// sms-tables-migration.js
const { Sequelize } = require('sequelize');
const config = require('../config/config.json')['development'];

// Initialize Sequelize with database configuration
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
    logging: console.log,
  }
);

// Import models
const SMSTemplateModel = require('../models/SMSTemplate');
const SMSProviderModel = require('../models/SMSProvider');
const ContactCategoryModel = require('../models/ContactCategory');
const SMSMessageModel = require('../models/SMSMessage');
const SMSRecipientModel = require('../models/SMSRecipient');

// Initialize models
const SMSTemplate = SMSTemplateModel(sequelize, Sequelize.DataTypes);
const SMSProvider = SMSProviderModel(sequelize, Sequelize.DataTypes);
const ContactCategory = ContactCategoryModel(sequelize, Sequelize.DataTypes);
const SMSMessage = SMSMessageModel(sequelize, Sequelize.DataTypes);
const SMSRecipient = SMSRecipientModel(sequelize, Sequelize.DataTypes);

// Set up associations
SMSMessage.belongsTo(SMSProvider, { foreignKey: 'providerId' });
SMSMessage.belongsTo(SMSTemplate, { foreignKey: 'templateId' });
SMSRecipient.belongsTo(SMSMessage, { foreignKey: 'messageId' });

// Sync models in proper order
async function migrateSMSTables() {
  try {
    console.log('Starting SMS tables migration...');
    
    // Create tables in the correct order
    console.log('Creating SMSTemplate table...');
    await SMSTemplate.sync({ force: true });
    
    console.log('Creating SMSProvider table...');
    await SMSProvider.sync({ force: true });
    
    console.log('Creating ContactCategory table...');
    await ContactCategory.sync({ force: true });
    
    console.log('Creating SMSMessage table...');
    await SMSMessage.sync({ force: true });
    
    console.log('Creating SMSRecipient table...');
    await SMSRecipient.sync({ force: true });
    
    console.log('SMS tables migration completed successfully!');
    
    // Get a valid user ID from the database to use for createdById
    const [results] = await sequelize.query("SELECT id FROM \"Users\" LIMIT 1");
    const adminUserId = results[0]?.id || '00000000-0000-0000-0000-000000000000';
    console.log(`Using admin user ID: ${adminUserId}`);
    
    // Create default SMS provider
    await SMSProvider.create({
      name: 'BongoLive',
      apiKey: 'demo-api-key',
      apiSecret: 'demo-api-secret',
      senderId: 'SACCO',
      baseUrl: 'https://bongolive-sms.co.tz/api',
      costPerSMS: 15.00,
      isActive: true,
      features: ['delivery-reports', 'scheduled-messages'],
      balance: 5000.00,
      currency: 'TSH'
    });
    
    console.log('Created default SMS provider');
    
    // Create some template examples
    await SMSTemplate.create({
      name: 'Payment Confirmation',
      content: 'Dear member, we confirm receipt of your payment of TSH {{amount}} on {{date}}. Your new balance is TSH {{balance}}. Thank you for choosing us!',
      createdById: adminUserId
    });
    
    await SMSTemplate.create({
      name: 'Loan Reminder',
      content: 'Dear {{name}}, this is a friendly reminder that your loan payment of TSH {{amount}} is due on {{date}}. Please ensure timely payment to avoid penalties.',
      createdById: adminUserId
    });
    
    await SMSTemplate.create({
      name: 'Member Welcome',
      content: 'Welcome to our SACCO, {{name}}! Your membership has been activated. Your member number is {{memberNumber}}. For assistance, call us at +255 123 456 789.',
      createdById: adminUserId
    });
    
    console.log('Created SMS templates');
    
    // Create contact categories
    await ContactCategory.create({
      name: 'Board Members',
      description: 'SACCO board members and leadership',
      color: 'bg-blue-500',
      createdById: adminUserId
    });
    
    await ContactCategory.create({
      name: 'VIP Members',
      description: 'Members with high value accounts',
      color: 'bg-purple-500',
      createdById: adminUserId
    });
    
    console.log('Created contact categories');
    
    console.log('SMS tables seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

// Run migration
migrateSMSTables();
