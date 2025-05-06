const { User } = require('../models');
const { ActivityLog } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// ... other imports ...

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Log failed login attempt for non-existent user
      await ActivityLog.create({
        userId: null,
        action: 'login',
        status: 'failed',
        details: { 
          attemptedEmail: email,
          reason: 'User not found' 
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      // Log successful login BEFORE sending response
      const loginActivity = await ActivityLog.create({
        userId: user.id,
        action: 'LOGIN',
        status: 'success',
        details: { 
          userInfo: {
            email: user.email,
            fullName: `${user.firstName} ${user.lastName}`,
            role: user.role
          },
          timestamp: new Date().toISOString()
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      console.log('Login activity created:', loginActivity.id);

      // Generate token and send response
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      console.log('Login activity logged successfully');

      res.status(200).json({
        status: 'success',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    } else {
      // Log failed login
      await ActivityLog.create({
        userId: user.id,
        action: 'login',
        status: 'failed',
        details: { 
          userEmail: user.email,
          reason: 'Invalid password',
          attemptTime: new Date().toISOString()
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}; 