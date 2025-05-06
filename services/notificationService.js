const { Notification, User } = require('../models');
const { Op } = require('sequelize');
const emailService = require('./emailService');

/**
 * Create a notification and send email if user has enabled email notifications
 * @param {Object} notificationData - Notification data
 * @param {Object} options - Additional options
 * @returns {Promise<Notification>} Created notification
 */
async function createNotification(notificationData, options = {}) {
  try {
    const {
      userId,
      title,
      message,
      type = 'SYSTEM',
      resourceType,
      resourceId,
      metadata,
      createdBy
    } = notificationData;
    
    // Create the notification in database
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      resourceType,
      resourceId,
      metadata,
      createdBy
    });
    
    // Send email notification if enabled
    if (options.sendEmail !== false) {
      try {
        const user = await User.findByPk(userId);
        
        if (user) {
          // Check user preferences
          const preferences = user.preferences || {};
          
          if (preferences.emailNotifications !== false) {
            // Determine which template to use based on notification type
            let templateName = 'expense-notification';
            if (type === 'LEAVE') {
              templateName = 'leave-notification';
            } else if (type === 'SYSTEM') {
              templateName = 'system-notification';
            }
            
            // Send email
            await emailService.sendEmail(
              user.email,
              title,
              templateName,
              {
                user: {
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email
                },
                message,
                actionUrl: resourceType && resourceId 
                  ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/${resourceType.toLowerCase()}s/${resourceId}`
                  : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/notifications/system`,
                ...metadata
              }
            );
            
            console.log(`Email notification sent to ${user.email}`);
          }
        }
      } catch (emailError) {
        // Log error but don't fail the operation
        console.error('Failed to send email notification:', emailError);
      }
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create notifications for users with specific roles
 * @param {Array<string>} roles - Array of role names
 * @param {Object} notificationData - Notification data
 * @param {Object} options - Additional options
 * @returns {Promise<Array<Notification>>} Created notifications
 */
async function createNotificationForRoles(roles, notificationData, options = {}) {
  try {
    // Find users with the specified roles
    const users = await User.findAll({
      where: {
        role: {
          [Op.in]: roles
        }
      }
    });
    
    // Create notifications for each user
    const notifications = [];
    
    for (const user of users) {
      const notification = await createNotification({
        userId: user.id,
        ...notificationData
      }, options);
      
      notifications.push(notification);
    }
    
    return notifications;
  } catch (error) {
    console.error('Error creating notifications for roles:', error);
    throw error;
  }
}

/**
 * Mark a notification as read
 * @param {string} id - Notification ID
 * @param {string} userId - User ID
 * @returns {Promise<Notification>} Updated notification
 */
async function markAsRead(id, userId) {
  try {
    const notification = await Notification.findOne({
      where: {
        id,
        userId
      }
    });
    
    if (!notification) {
      throw new Error('Notification not found or does not belong to user');
    }
    
    await notification.update({ status: 'READ' });
    
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of notifications updated
 */
async function markAllAsRead(userId) {
  try {
    const [updatedCount] = await Notification.update(
      { status: 'READ' },
      { 
        where: { 
          userId,
          status: 'UNREAD'
        } 
      }
    );
    
    return updatedCount;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

module.exports = {
  createNotification,
  createNotificationForRoles,
  markAsRead,
  markAllAsRead
};
