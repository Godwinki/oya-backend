const { User, LoginHistory, ActivityLog, sequelize } = require('../models');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

exports.register = async (req, res) => {
  try {
    console.log('\n📝 New user registration request received...'.yellow);
    console.log('⏳ Validating user input...................'.cyan);

    const { email, phoneNumber } = req.body;

    // Check for existing user
    console.log('⏳ Checking for existing user..............'.cyan);
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { phoneNumber }]
      }
    });

    if (existingUser) {
      console.log('❌ User already exists....................'.red);
      return res.status(400).json({
        status: 'error',
        message: '❌ User with this email or phone number already exists'
      });
    }

    console.log('⏳ Creating new user......................'.cyan);
    const user = await User.create(req.body);
    
    // Log user registration
    await ActivityLog.create({
      userId: user.id, // The new user's ID
      action: 'user_registered',
      status: 'success',
      details: { 
        email: user.email,
        role: user.role 
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    console.log('✅ User created successfully..............'.green);
    
    // Remove password from output
    user.password = undefined;
    
    res.status(201).json({
      status: 'success',
      message: '✅ User account created successfully',
      data: { user }
    });
  } catch (error) {
    console.error('❌ Registration error:'.red, error.message);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    console.log('\n🔐 Login request received.................'.yellow);
    console.log('⏳ Validating credentials.................'.cyan);
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Missing credentials...................'.red);
      return res.status(400).json({
        status: 'error',
        message: '📝 Please provide both email and password'
      });
    }

    console.log('⏳ Checking user credentials..............'.cyan);
    const user = await User.findOne({ where: { email } });

    // Check if account is permanently locked
    if (user && user.isLocked) {
      console.log('🔒 Account is permanently locked..........'.red);
      return res.status(401).json({
        status: 'error',
        message: '🔒 Account is locked. Please contact an administrator to unlock your account.',
        permanentlyLocked: true
      });
    }

    // Incorrect credentials handling with progressive lockout
    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log('❌ Invalid credentials...................'.red);
      
      if (user) {
        const failedAttempts = user.failedLoginAttempts + 1;
        const updates = { failedLoginAttempts: failedAttempts };
        
        // After 10-minute timeout, if they fail again, permanently lock the account
        if (failedAttempts >= 4) {
          updates.isLocked = true;
          updates.lockoutUntil = null; // Permanent lock doesn't need a timeout
          console.log('🔒 Account permanently locked............'.red);
          
          await user.update(updates);
          
          return res.status(401).json({
            status: 'error',
            message: '🔒 Account has been locked due to multiple failed attempts. Please contact an administrator.',
            permanentlyLocked: true
          });
        }
        
        await user.update(updates);
        
        return res.status(401).json({
          status: 'error',
          message: '❌ Incorrect email or password',
          attemptsRemaining: 3 - failedAttempts
        });
      }
      
      return res.status(401).json({
        status: 'error',
        message: '❌ Incorrect email or password'
      });
    }

    console.log('⏳ Generating access token................'.cyan);
    
    // Update login history
    await user.update({
      lastLogin: new Date(),
      failedLoginAttempts: 0,
      lockoutUntil: null
    });

    // Check if password change is required (first login or expired password)
    const passwordChangeRequired = !user.lastPasswordChangedAt || 
      (new Date() - new Date(user.lastPasswordChangedAt)) / (1000 * 60 * 60 * 24) > 90;

    // Create token with user info
    const token = jwt.sign(
      { 
        id: user.id,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: '30m', // Short expiration for banking security
        issuer: 'AWIB SACCO Management System',
        subject: user.id.toString()
      }
    );

    // Get user basic info without sensitive data
    const userData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
      passwordChangeRequired,
      lastPasswordChangedAt: user.lastPasswordChangedAt,
      passwordExpiresAt: user.passwordExpiresAt,
      profilePicture: user.profilePicture
    };

    // Record login attempt
    try {
      await LoginHistory.create({
        userId: user.id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'Unknown',
        status: 'success'
      });
    } catch (historyError) {
      console.error('⚠️ Failed to record login history:', historyError.message);
      // Continue with login even if history recording fails
    }

    // Set token as HTTP-only cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only set secure in prod
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000 // 30 minutes
    });

    console.log('✅ Login successful......................'.green);
    res.status(200).json({
      status: 'success',
      message: '✅ Login successful! Welcome back!',
      token,
      user: userData
    });
  } catch (error) {
    console.error('❌ Login error:'.red, error.message);
    res.status(500).json({
      status: 'error',
      message: '🔥 Internal server error during login'
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.correctPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Check if password was previously used
    const isPasswordReused = await user.isPasswordPreviouslyUsed(newPassword);
    if (isPasswordReused) {
      return res.status(400).json({
        status: 'error',
        message: 'This password has been used recently. Please choose a different password.'
      });
    }

    // Update password and reset password change flags
    const now = new Date();
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setDate(now.getDate() + 90); // Password expires in 90 days
    
    await user.update({ 
      password: newPassword,
      lastPasswordChangedAt: now,
      passwordExpiresAt: passwordExpiresAt,
      forcePasswordChange: false
    });
    
    console.log('Password changed successfully for user:', user.id);
    console.log('Updated password dates:', {
      lastPasswordChangedAt: now,
      passwordExpiresAt: passwordExpiresAt,
      forcePasswordChange: false
    });

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password'
    });
  }
};

exports.logout = async (req, res) => {
  try {
    console.log('\n👋 Logout request received...............'.yellow);
    
    // Get user from protect middleware
    const userId = req.user.id;
    
    // Update last login history entry with logout time
    try {
      await LoginHistory.update(
        { loggedOutAt: new Date() },
        { 
          where: { 
            userId,
            loggedOutAt: null 
          },
          order: [['createdAt', 'DESC']],
          limit: 1
        }
      );
    } catch (historyError) {
      console.error('⚠️ Failed to update login history:', historyError.message);
      // Continue with logout even if history update fails
    }

    // Log logout activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'logout',
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Clear the auth_token cookie on logout
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    console.log('✅ Logout successful....................'.green);
    res.status(200).json({
      status: 'success',
      message: '👋 Logged out successfully'
    });
  } catch (error) {
    console.error('❌ Logout error:'.red, error.message);
    res.status(500).json({
      status: 'error',
      message: '🔥 Internal server error during logout'
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide an email address'
      });
    }
    
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'No user found with that email address'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    await user.update({
      passwordResetToken: hashedToken,
      passwordResetExpires: Date.now() + 10 * 60 * 1000 // 10 minutes
    });
    
    // In production, send email with reset token
    // For now, just return token in response
    res.status(200).json({
      status: 'success',
      message: 'Password reset token generated',
      resetToken // In production, remove this
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error processing forgot password request'
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide token and new password'
      });
    }
    
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const user = await User.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { [Op.gt]: Date.now() }
      }
    });
    
    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is invalid or has expired'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    await user.update({
      password: hashedPassword,
      lastPasswordChangedAt: new Date(),
      passwordResetToken: null,
      passwordResetExpires: null
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error resetting password'
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Remove sensitive data
    const userData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      department: user.department,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    res.status(200).json({
      status: 'success',
      data: { user: userData }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user profile'
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    // Fields that are allowed to be updated by user
    const allowedFields = ['firstName', 'lastName', 'phoneNumber'];
    const updateData = {};
    
    // Filter only allowed fields
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields to update'
      });
    }
    
    await User.update(updateData, {
      where: { id: req.user.id }
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating user profile'
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
    });
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users'
    });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
    });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user'
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Admin can update more fields
    const allowedFields = ['firstName', 'lastName', 'email', 'phoneNumber', 'role', 'department', 'status'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields to update'
      });
    }
    
    await user.update(updateData);
    
    // Log user update
    await ActivityLog.create({
      userId: req.user.id,
      action: 'user_updated',
      status: 'success',
      details: { 
        updatedUserId: user.id,
        changes: updateData 
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: { 
        user: {
          ...user.toJSON(),
          password: undefined,
          passwordResetToken: undefined,
          passwordResetExpires: undefined
        }
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating user'
    });
  }
};

exports.deleteUser = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const userId = req.params.id;
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    console.log(`Deleting user ID: ${userId}`);
    
    // Handle all related tables - we'll delete records in the right order
    // to avoid foreign key constraint issues
    
    // 1. Handle tables with notifications first
    try {
      const { Notification } = require('../models');
      if (Notification) {
        console.log('Deleting related Notification records...');
        await Notification.destroy({ where: { userId }, transaction: t });
      }
    } catch (error) {
      console.log('No Notification model or error:', error.message);
    }
    
    // 2. Handle security questions
    try {
      const { SecurityQuestion } = require('../models');
      if (SecurityQuestion) {
        console.log('Deleting related SecurityQuestion records...');
        await SecurityQuestion.destroy({ where: { userId }, transaction: t });
      }
    } catch (error) {
      console.log('No SecurityQuestion model or error:', error.message);
    }
    
    // 3. Handle leave requests
    try {
      const { Leave } = require('../models');
      if (Leave) {
        console.log('Deleting related Leave records...');
        await Leave.destroy({ where: { userId }, transaction: t });
      }
    } catch (error) {
      console.log('No Leave model or error:', error.message);
    }
    
    // 4. Handle expense requests
    try {
      const { ExpenseRequest } = require('../models');
      if (ExpenseRequest) {
        console.log('Deleting related ExpenseRequest records...');
        await ExpenseRequest.destroy({ where: { userId }, transaction: t });
      }
    } catch (error) {
      console.log('No ExpenseRequest model or error:', error.message);
    }
    
    // 5. Handle activity logs
    try {
      console.log('Deleting related ActivityLog records...');
      await ActivityLog.destroy({ where: { userId }, transaction: t });
    } catch (error) {
      console.log('Error deleting ActivityLog records:', error.message);
    }
    
    // 6. Handle login history
    try {
      console.log('Deleting related LoginHistory records...');
      await LoginHistory.destroy({ where: { userId }, transaction: t });
    } catch (error) {
      console.log('Error deleting LoginHistory records:', error.message);
    }
    
    // 7. Finally delete the user itself
    console.log('Deleting the user record...');
    await user.destroy({ transaction: t });
    
    // Commit the transaction
    await t.commit();
    console.log('Transaction committed successfully');
    
    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    // Rollback transaction if there's an error
    await t.rollback();
    console.error('Delete user error:', error);
    
    // Send appropriate error based on the error type
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      const constraintTable = error.original?.table || 'unknown table';
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete user because of foreign key constraint with ${constraintTable}. Please contact an administrator.`,
        details: error.original?.detail || 'No details available'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Error deleting user'
    });
  }
};

exports.getLockedAccounts = async (req, res) => {
  try {
    console.log('⏳ Fetching locked accounts...............'.cyan);
    
    const currentDate = new Date();
    
    const lockedAccounts = await User.findAll({
      where: {
        [Op.and]: [
          {
            failedLoginAttempts: {
              [Op.gte]: 5  // 5 or more failed attempts
            }
          },
          {
            lockoutUntil: {
              [Op.gt]: currentDate  // Lock time is in the future (still locked)
            }
          }
        ]
      },
      attributes: [
        'id', 
        'firstName', 
        'lastName', 
        'email', 
        'failedLoginAttempts',
        'lockoutUntil',
        'status'
      ],
      order: [['lockoutUntil', 'DESC']]  // Most recently locked first
    });

    console.log(`✅ Found ${lockedAccounts.length} locked accounts`.green);
    
    // Transform dates to ISO strings for consistent formatting
    const formattedAccounts = lockedAccounts.map(account => ({
      ...account.toJSON(),
      lockoutUntil: account.lockoutUntil.toISOString()
    }));

    res.status(200).json({
      status: 'success',
      data: {
        lockedAccounts: formattedAccounts
      }
    });
  } catch (error) {
    console.error('❌ Error fetching locked accounts:'.red, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch locked accounts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.unlockAccount = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    await user.update({
      failedLoginAttempts: 0,
      lockoutUntil: null
    });

    res.status(200).json({
      status: 'success',
      message: 'Account unlocked successfully'
    });
  } catch (error) {
    console.error('Error unlocking account:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to unlock account'
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    // Add direct flag for forcing password change that doesn't rely on virtual property calculation
    const userData = {
      ...req.body,
      // Direct flag that will be checked in authController.login
      forcePasswordChange: true,
      // Set password expiration to NOW to force password change
      passwordExpiresAt: new Date(),
      // Set the last password change to yesterday
      lastPasswordChangedAt: new Date(Date.now() - 86400000)
    };
    
    const newUser = await User.create(userData);
    const creator = await User.findByPk(req.user.id);

    // Log user creation with correct actor details
    await ActivityLog.create({
      userId: creator.id, // ID of the user performing the action
      action: 'USER_CREATED',
      status: 'success',
      details: { 
        actor: {
          id: creator.id,
          fullName: `${creator.firstName} ${creator.lastName}`,
          email: creator.email,
          role: creator.role
        },
        createdUser: {
          id: newUser.id,
          fullName: `${newUser.firstName} ${newUser.lastName}`,
          email: newUser.email,
          role: newUser.role
        }
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({ 
      status: 'success', 
      data: { user: newUser } 
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create user'
    });
  }
}; 