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

      // More strict check for password change requirement
      // 1. Check explicit force flag
      // 2. Check virtual property
      // 3. Check for missing password dates (for existing users)
      const missingPasswordDates = !user.lastPasswordChangedAt || !user.passwordExpiresAt;
      
      // Debug raw values
      console.log('RAW VALUES:');
      console.log('- forcePasswordChange:', !!user.forcePasswordChange);
      console.log('- mustChangePassword:', !!user.mustChangePassword);
      console.log('- lastPasswordChangedAt exists:', !!user.lastPasswordChangedAt);
      console.log('- passwordExpiresAt exists:', !!user.passwordExpiresAt);
      console.log('- missingPasswordDates:', missingPasswordDates);
      
      // Force password change if any condition is met
      const passwordChangeRequired = true;  // Force all users to change password for testing
      // In production, use: const passwordChangeRequired = user.forcePasswordChange || user.mustChangePassword || missingPasswordDates || false;
      
      // Get password expiry information
      const lastPasswordChangedAt = user.lastPasswordChangedAt || null;
      const passwordExpiresAt = user.passwordExpiresAt || null;
      
      // Debug password related info
      console.log('Backend - Force password change flag:', user.forcePasswordChange);
      console.log('Backend - User must change password (virtual):', user.mustChangePassword);
      console.log('Backend - Last password changed:', lastPasswordChangedAt);
      console.log('Backend - Password expires at:', passwordExpiresAt);
      console.log('Backend - Final password change required flag:', passwordChangeRequired);
      
      // Generate token and send response
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      console.log('Login activity logged successfully');
      console.log('Password change required:', passwordChangeRequired);

      res.status(200).json({
        status: 'success',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department,
          status: user.status,
          passwordChangeRequired: passwordChangeRequired,
          forcePasswordChange: user.forcePasswordChange || false,
          lastPasswordChangedAt: lastPasswordChangedAt,
          passwordExpiresAt: passwordExpiresAt,
          profilePicture: user.profilePicture
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