// smsMessageController.js
const axios = require('axios');
const { Op } = require('sequelize');
const { 
  Member, 
  SMSMessage, 
  SMSProvider,
  SMSTemplate,
  SMSRecipient,
  ContactCategory,
  User,
  sequelize
} = require('../models');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { checkPhoneFormat } = require('../utils/validatePhone');

/**
 * Send SMS messages
 */
const sendSMS = catchAsync(async (req, res) => {
  const { 
    message, 
    memberGroups = [], 
    contactCategories = [], 
    individualMembers = [], 
    phoneNumbers = [],
    templateId,
    providerId,
    scheduledFor
  } = req.body;

  if (!message) {
    throw new ApiError(400, 'Message content is required');
  }

  if (
    memberGroups.length === 0 && 
    contactCategories.length === 0 && 
    individualMembers.length === 0 && 
    phoneNumbers.length === 0
  ) {
    throw new ApiError(400, 'At least one recipient (group, category, individual, or phone number) is required');
  }

  // Find or use the active provider if providerId is not specified
  let provider;
  if (providerId) {
    provider = await SMSProvider.findByPk(providerId);
    if (!provider) {
      throw new ApiError(404, 'SMS provider not found');
    }
  } else {
    provider = await SMSProvider.findOne({
      where: { isActive: true }
    });
    if (!provider) {
      throw new ApiError(404, 'No active SMS provider found. Please set an active provider.');
    }
  }

  // Check if template exists if provided
  let template;
  if (templateId) {
    template = await SMSTemplate.findByPk(templateId);
    if (!template) {
      throw new ApiError(404, 'SMS template not found');
    }
  }

  // Create the SMS message record
  const smsMessage = await SMSMessage.create({
    content: message,
    templateId: template?.id,
    providerId: provider.id,
    createdById: req.user.id,
    scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    status: scheduledFor ? 'PENDING' : 'PROCESSING'
  });

  // Collect all recipient phone numbers
  const allRecipients = new Set();
  
  // Process member groups
  if (memberGroups.length > 0) {
    for (const groupId of memberGroups) {
      let members = [];
      
      if (groupId === 'all') {
        // All members
        members = await Member.findAll({
          where: {
            mobile: {
              [Op.not]: null,
              [Op.ne]: ''
            }
          },
          attributes: ['id', 'mobile']
        });
      } else if (groupId === 'loan-holders') {
        // Members with active loans
        members = await Member.findAll({
          include: [{
            model: sequelize.models.Loan,
            where: { status: { [Op.in]: ['ACTIVE', 'PAST_DUE'] } },
            required: true
          }],
          where: {
            mobile: {
              [Op.not]: null,
              [Op.ne]: ''
            }
          },
          attributes: ['id', 'mobile']
        });
      } else if (groupId === 'overdue-loans') {
        // Members with overdue loans
        members = await Member.findAll({
          include: [{
            model: sequelize.models.Loan,
            where: { status: 'PAST_DUE' },
            required: true
          }],
          where: {
            mobile: {
              [Op.not]: null,
              [Op.ne]: ''
            }
          },
          attributes: ['id', 'mobile']
        });
      } else if (groupId === 'high-savings') {
        // Members with high savings
        members = await Member.findAll({
          include: [{
            model: sequelize.models.Saving,
            where: { balance: { [Op.gt]: 1000000 } },
            required: true
          }],
          where: {
            mobile: {
              [Op.not]: null,
              [Op.ne]: ''
            }
          },
          attributes: ['id', 'mobile']
        });
      } else if (groupId === 'inactive') {
        // Inactive members
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        members = await Member.findAll({
          include: [{
            model: sequelize.models.Transaction,
            where: { 
              createdAt: { [Op.lt]: threeMonthsAgo }
            },
            required: false
          }],
          where: {
            mobile: {
              [Op.not]: null,
              [Op.ne]: ''
            },
            '$Transactions.id$': null // No transactions or transactions older than 3 months
          },
          attributes: ['id', 'mobile']
        });
      }
      
      // Add members to recipients
      members.forEach(member => {
        if (member.mobile && checkPhoneFormat(member.mobile)) {
          allRecipients.add({ id: member.id, phone: member.mobile });
        }
      });
    }
  }
  
  // Process contact categories
  if (contactCategories.length > 0) {
    for (const categoryId of contactCategories) {
      const members = await Member.findAll({
        include: [{
          model: ContactCategory,
          as: 'categories',
          where: { id: categoryId },
          required: true,
          through: { attributes: [] }
        }],
        where: {
          mobile: {
            [Op.not]: null,
            [Op.ne]: ''
          }
        },
        attributes: ['id', 'mobile']
      });
      
      members.forEach(member => {
        if (member.mobile && checkPhoneFormat(member.mobile)) {
          allRecipients.add({ id: member.id, phone: member.mobile });
        }
      });
    }
  }
  
  // Process individual members
  if (individualMembers.length > 0) {
    const members = await Member.findAll({
      where: {
        id: { [Op.in]: individualMembers },
        mobile: {
          [Op.not]: null,
          [Op.ne]: ''
        }
      },
      attributes: ['id', 'mobile']
    });
    
    members.forEach(member => {
      if (member.mobile && checkPhoneFormat(member.mobile)) {
        allRecipients.add({ id: member.id, phone: member.mobile });
      }
    });
  }
  
  // Process custom phone numbers
  if (phoneNumbers.length > 0) {
    phoneNumbers.forEach(phone => {
      if (checkPhoneFormat(phone)) {
        allRecipients.add({ id: null, phone });
      }
    });
  }
  
  // Convert recipients set to array
  const recipientsArray = Array.from(allRecipients);
  
  // Update message with recipient count
  smsMessage.recipientCount = recipientsArray.length;
  await smsMessage.save();
  
  // Create recipients in bulk
  if (recipientsArray.length > 0) {
    await SMSRecipient.bulkCreate(
      recipientsArray.map(recipient => ({
        messageId: smsMessage.id,
        memberId: recipient.id,
        phoneNumber: recipient.phone,
        status: 'PENDING'
      }))
    );
  }
  
  // If message is scheduled for later, return now
  if (scheduledFor) {
    return res.status(201).json({
      status: 'success',
      data: {
        ...smsMessage.get({ plain: true }),
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null
      },
      message: `SMS scheduled to be sent to ${recipientsArray.length} recipients at ${new Date(scheduledFor).toLocaleString()}`
    });
  }
  
  // Otherwise, send the message immediately
  try {
    // Calculate the cost
    const messageSegments = Math.ceil(message.length / 160);
    const totalCost = recipientsArray.length * messageSegments * provider.costPerSMS;
    
    // Check if there's enough balance
    if (provider.balance < totalCost) {
      throw new ApiError(400, `Insufficient SMS balance. Required: ${totalCost} ${provider.currency}, Available: ${provider.balance} ${provider.currency}`);
    }
    
    // Deduct the cost from provider balance
    provider.balance = parseFloat(provider.balance) - parseFloat(totalCost);
    await provider.save();
    
    // Update message cost
    smsMessage.totalCost = totalCost;
    await smsMessage.save();
    
    // Depending on the provider, integrate with their API to send SMS
    // For now, we'll just simulate sending the message
    
    // EXAMPLE: BongoLive SMS Integration
    if (provider.name === 'BongoLive') {
      // await axios.post(`${provider.baseUrl}/send`, {
      //   apiKey: provider.apiKey,
      //   secret: provider.apiSecret,
      //   senderId: provider.senderId,
      //   message,
      //   recipients: recipientsArray.map(r => r.phone).join(',')
      // });
      
      // Simulate successful sending
      smsMessage.status = 'SENT';
      smsMessage.sentAt = new Date();
      smsMessage.totalSent = recipientsArray.length;
      smsMessage.deliveryRate = '100%';
      await smsMessage.save();
      
      // Update all recipients as sent
      await SMSRecipient.update(
        { status: 'SENT', deliveredAt: new Date() },
        { where: { messageId: smsMessage.id } }
      );
    } 
    // EXAMPLE: Tigo Business SMS Integration
    else if (provider.name === 'Tigo Business') {
      // await axios.post(`${provider.baseUrl}/sms/v1/send`, {
      //   api_key: provider.apiKey,
      //   username: provider.username,
      //   password: provider.apiSecret,
      //   from: provider.senderId,
      //   to: recipientsArray.map(r => r.phone),
      //   text: message
      // });
      
      // Simulate successful sending
      smsMessage.status = 'SENT';
      smsMessage.sentAt = new Date();
      smsMessage.totalSent = recipientsArray.length;
      smsMessage.deliveryRate = '98%';
      await smsMessage.save();
      
      // Update all recipients as sent
      await SMSRecipient.update(
        { status: 'SENT', deliveredAt: new Date() },
        { where: { messageId: smsMessage.id } }
      );
    }
    // Generic provider implementation
    else {
      // Simulate successful sending
      smsMessage.status = 'SENT';
      smsMessage.sentAt = new Date();
      smsMessage.totalSent = recipientsArray.length;
      smsMessage.deliveryRate = '95%';
      await smsMessage.save();
      
      // Update all recipients as sent
      await SMSRecipient.update(
        { status: 'SENT', deliveredAt: new Date() },
        { where: { messageId: smsMessage.id } }
      );
    }
    
    res.status(200).json({
      status: 'success',
      data: smsMessage,
      message: `SMS sent to ${recipientsArray.length} recipients successfully`
    });
    
  } catch (error) {
    // If sending fails, update message status
    smsMessage.status = 'FAILED';
    await smsMessage.save();
    
    throw new ApiError(500, `Failed to send SMS: ${error.message}`);
  }
});

/**
 * Get SMS message history with pagination
 */
const getMessageHistory = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  
  const { count, rows } = await SMSMessage.findAndCountAll({
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName']
      },
      {
        model: SMSProvider,
        as: 'provider',
        attributes: ['id', 'name']
      }
    ],
    order: [['createdAt', 'DESC']],
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
 * Get SMS message details by ID
 */
const getMessageById = catchAsync(async (req, res) => {
  const message = await SMSMessage.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName']
      },
      {
        model: SMSProvider,
        as: 'provider',
        attributes: ['id', 'name']
      },
      {
        model: SMSTemplate,
        as: 'template',
        attributes: ['id', 'name']
      }
    ]
  });
  
  if (!message) {
    throw new ApiError(404, 'SMS message not found');
  }
  
  // Get message recipients with delivery status
  const recipients = await SMSRecipient.findAll({
    where: { messageId: message.id },
    include: [
      {
        model: Member,
        as: 'member',
        attributes: ['id', 'fullName', 'accountNumber']
      }
    ]
  });
  
  // Calculate delivery statistics
  const totalDelivered = recipients.filter(r => r.status === 'DELIVERED').length;
  const totalSent = recipients.filter(r => r.status === 'SENT' || r.status === 'DELIVERED').length;
  const totalFailed = recipients.filter(r => r.status === 'FAILED').length;
  const totalPending = recipients.filter(r => r.status === 'PENDING').length;
  
  message.deliveryRate = totalRecipients > 0 
    ? `${Math.round((totalDelivered / recipients.length) * 100)}%` 
    : '0%';
  
  message.totalSent = totalSent;
  await message.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      ...message.get({ plain: true }),
      recipients: recipients,
      stats: {
        totalRecipients: recipients.length,
        totalDelivered,
        totalSent,
        totalFailed,
        totalPending,
        deliveryRate: message.deliveryRate
      }
    }
  });
});

/**
 * Cancel a scheduled SMS message
 */
const cancelScheduledMessage = catchAsync(async (req, res) => {
  const message = await SMSMessage.findByPk(req.params.id);
  
  if (!message) {
    throw new ApiError(404, 'SMS message not found');
  }
  
  if (message.status !== 'PENDING' || !message.scheduledFor) {
    throw new ApiError(400, 'Only scheduled (pending) messages can be cancelled');
  }
  
  // If the message was already scheduled with the provider, cancel it
  // This would require provider-specific API calls
  
  // Delete all recipients
  await SMSRecipient.destroy({
    where: { messageId: message.id }
  });
  
  // Delete the message
  await message.destroy();
  
  res.status(200).json({
    status: 'success',
    message: 'Scheduled SMS message cancelled successfully'
  });
});

module.exports = {
  sendSMS,
  getMessageHistory,
  getMessageById,
  cancelScheduledMessage
};
