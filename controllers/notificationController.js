const { Notification, User } = require('../models');
const { Op } = require('sequelize');
const notificationService = require('../services/notificationService');

const notificationController = {
  /**
   * Create a new notification
   */
  async createNotification(req, res) {
    try {
      const { userId, title, message, type, resourceType, resourceId, metadata } = req.body;
      
      const notification = await notificationService.createNotification({
        userId,
        title,
        message,
        type: type || 'SYSTEM',
        resourceType,
        resourceId,
        metadata,
        createdBy: req.user?.id
      });
      
      return res.status(201).json({
        status: 'success',
        data: notification
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create notification',
        error: error.message
      });
    }
  },
  
  /**
   * Get user's notifications with pagination
   */
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, status, type } = req.query;
      
      const offset = (page - 1) * limit;
      const whereClause = { userId };
      
      if (status) {
        whereClause.status = status;
      }
      
      if (type) {
        whereClause.type = type;
      }
      
      const { count, rows: notifications } = await Notification.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      return res.status(200).json({
        status: 'success',
        data: notifications,
        meta: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve notifications',
        error: error.message
      });
    }
  },
  
  /**
   * Get unread notification count for user
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      
      const count = await Notification.count({
        where: {
          userId,
          status: 'UNREAD'
        }
      });
      
      return res.status(200).json({
        status: 'success',
        data: { count }
      });
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve unread count',
        error: error.message
      });
    }
  },
  
  /**
   * Mark notification as read
   */
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const notification = await notificationService.markAsRead(id, userId);
      
      return res.status(200).json({
        status: 'success',
        message: 'Notification marked as read',
        data: notification
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to mark notification as read',
        error: error.message
      });
    }
  },
  
  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      
      const updatedCount = await notificationService.markAllAsRead(userId);
      
      return res.status(200).json({
        status: 'success',
        message: `${updatedCount} notifications marked as read`
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to mark all notifications as read',
        error: error.message
      });
    }
  },
  
  /**
   * Create notifications for users with specific roles
   * This is an internal utility function, not exposed as an API endpoint
   */
  async createNotificationForRoles(roles, notificationData) {
    try {
      return await notificationService.createNotificationForRoles(roles, notificationData);
    } catch (error) {
      console.error('Error creating notifications for roles:', error);
      throw error;
    }
  }
};

module.exports = notificationController;
