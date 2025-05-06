const jwt = require('jsonwebtoken');
const { User } = require('../models');

exports.protect = async (req, res, next) => {
  try {
    console.log('\n🔒 Authenticating request................'.yellow);
    
    // 1) Get token
    let token;
    // First, try to get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('⏳ Token found in Authorization header, verifying...............'.cyan);
    }
    // If not found, try to get token from auth_token cookie
    if (!token && req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
      console.log('⏳ Token found in cookie, verifying...............'.cyan);
    }

    if (!token) {
      console.log('❌ No token provided...................'.red);
      return res.status(401).json({
        status: 'error',
        message: '🔒 Authentication required! Please login.'
      });
    }

    // 2) Verify token
    try {
      console.log('⏳ Validating token....................'.cyan);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 3) Check if user still exists
      console.log('⏳ Checking user permissions............'.cyan);
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        console.log('❌ User not found.....................'.red);
        return res.status(401).json({
          status: 'error',
          message: '👤 User account no longer exists'
        });
      }

      // Grant access to protected route
      req.user = user;
      console.log('✅ Authentication successful...........'.green);
      next();
    } catch (error) {
      console.log('❌ Token validation failed.............'.red);
      return res.status(401).json({
        status: 'error',
        message: '🚫 Invalid or expired token. Please login again.'
      });
    }
  } catch (error) {
    console.log('❌ Authentication error................'.red);
    res.status(500).json({
      status: 'error',
      message: '🔥 Internal server error in authentication'
    });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: '🚫 You do not have permission to perform this action'
      });
    }
    next();
  };
}; 