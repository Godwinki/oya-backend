const { ActivityLog, LoginHistory, User } = require('../models');
const { Op } = require('sequelize');

exports.getActivityLogs = async (req, res) => {
  try {
    console.log('Request received for activity logs');
    const { startDate, endDate, type } = req.query;
    
    const where = {};
    
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else {
      // Default to last 7 days if no date range provided
      where.createdAt = {
        [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      };
    }
    
    if (type && type !== 'all') {
      where.action = {
        [Op.iLike]: `%${type}%`
      };
    }

    console.log('Executing query with where clause:', where);

    const activities = await ActivityLog.findAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });

    console.log(`Found ${activities.length} activities`);

    res.status(200).json({
      status: 'success',
      data: {
        activities
      }
    });
  } catch (error) {
    console.error('Error in getActivityLogs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch activity logs',
      details: error.message
    });
  }
};

exports.logActivity = async (req, res) => {
  try {
    const { action, details, status } = req.body;
    const userId = req.user.id;

    console.log('Creating activity log:', {
      userId,
      action,
      details,
      status,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    const activity = await ActivityLog.create({
      userId,
      action,
      details,
      status,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    console.log('Activity log created:', activity.toJSON());

    res.status(201).json({
      status: 'success',
      data: {
        activity
      }
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to log activity'
    });
  }
};

exports.getUserActivities = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, type } = req.query;

    const where = { userId };
    
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (type) {
      where.action = type;
    }

    const activities = await ActivityLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'email']
      }]
    });

    res.status(200).json({
      status: 'success',
      data: { activities }
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch activities'
    });
  }
};

exports.getLoginHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    const loginHistory = await LoginHistory.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      include: [{
        model: User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'email']
      }]
    });

    res.status(200).json({
      status: 'success',
      data: { loginHistory }
    });
  } catch (error) {
    console.error('Get login history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch login history'
    });
  }
}; 