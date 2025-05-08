const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8, 100] // Minimum 8 characters
      }
    },
    phoneNumber: {
      type: DataTypes.STRING,
      unique: true,
      validate: {
        is: /^\+?[1-9]\d{1,14}$/
      }
    },
    department: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM(
        'admin',
        'manager',
        'loan_officer',
        'accountant',
        'cashier',
        'it',
        'clerk',
        'loan_board',
        'board_director',
        'marketing_officer'
      ),
      defaultValue: 'clerk',
      allowNull: false
    },
    profilePicture: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active'
    },
    lastLogin: {
      type: DataTypes.DATE
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lockoutUntil: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isLocked: {
      type: DataTypes.VIRTUAL,
      get() {
        return Boolean(this.lockoutUntil && new Date(this.lockoutUntil) > new Date());
      }
    },
    lastPasswordChangedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    passwordResetToken: {
      type: DataTypes.STRING
    },
    passwordResetExpires: {
      type: DataTypes.DATE
    },
    passwordHistory: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    passwordExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: () => {
        const date = new Date();
        date.setMonth(date.getMonth() + 3);
        return date;
      },
    },
    forcePasswordChange: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    mustChangePassword: {
      type: DataTypes.VIRTUAL,
      get() {
        // Return true if forcePasswordChange is explicitly set
        if (this.forcePasswordChange) return true;
        
        // Otherwise check password expiration
        if (!this.lastPasswordChangedAt) return true;
        const now = new Date();
        const expiresAt = new Date(this.passwordExpiresAt);
        return now >= expiresAt;
      },
    },
    remainingLockoutTime: {
      type: DataTypes.VIRTUAL,
      get() {
        if (!this.lockoutUntil) return 0;
        const now = new Date();
        const lockoutTime = new Date(this.lockoutUntil);
        return Math.max(0, Math.ceil((lockoutTime - now) / 1000 / 60)); // Returns minutes
      }
    },
    securityQuestions: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    preferences: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('password')) {
          // Hash password
          user.password = await bcrypt.hash(user.password, 12);
          
          // Update password history (keep last 5)
          if (user.passwordHistory) {
            user.passwordHistory = [...user.passwordHistory, user.password].slice(-5);
          } else {
            user.passwordHistory = [user.password];
          }
          
          // Update password change timestamp and expiration
          user.lastPasswordChangedAt = new Date();
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 3);
          user.passwordExpiresAt = expiresAt;
        }
      }
    }
  });

  // Add associations
  User.associate = (models) => {
    if (models.LoginHistory) {
      User.hasMany(models.LoginHistory, {
        foreignKey: 'userId',
        as: 'loginHistory'
      });
    }
  };

  // Instance method to check passwords
  User.prototype.correctPassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  // Instance method to create password reset token
  User.prototype.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    return resetToken;
  };

  // Add method to check password history
  User.prototype.isPasswordPreviouslyUsed = async function(password) {
    for (const historicPassword of this.passwordHistory) {
      if (await bcrypt.compare(password, historicPassword)) {
        return true;
      }
    }
    return false;
  };

  return User;
}; 