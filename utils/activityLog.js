const { ActivityLog } = require('../models');

const createActivity = async ({ action, userId, details }) => {
  try {
    await ActivityLog.create({
      action,
      userId,
      details,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error creating activity log:', error);
   
  }
};

module.exports = {
  createActivity
}; 