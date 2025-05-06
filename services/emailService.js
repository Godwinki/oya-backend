const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const { User } = require('../models');

// Create a testing account for development
let transporter;

// Setup email transporter
async function setupTransporter() {
  // For production, use actual SMTP configuration
  if (process.env.NODE_ENV === 'production') {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else {
    // For development, use Ethereal (fake SMTP service)
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    console.log('Development email credentials:', {
      user: testAccount.user,
      pass: testAccount.pass,
      preview: 'https://ethereal.email'
    });
  }
}

// Get email template
function getTemplate(templateName) {
  const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
  
  if (!fs.existsSync(templatePath)) {
    console.error(`Email template not found: ${templatePath}`);
    return null;
  }
  
  const source = fs.readFileSync(templatePath, 'utf8');
  return handlebars.compile(source);
}

// Send an email notification
async function sendEmail(to, subject, templateName, context) {
  if (!transporter) {
    await setupTransporter();
  }
  
  // Get the template
  const template = getTemplate(templateName);
  if (!template) {
    throw new Error(`Template ${templateName} not found`);
  }
  
  // Add current year to context for footer
  const fullContext = {
    ...context,
    year: new Date().getFullYear(),
    title: subject
  };
  
  // Render the HTML with the context data
  const html = template(fullContext);
  
  // Send the email
  const info = await transporter.sendMail({
    from: `"WealthGuard" <${process.env.EMAIL_FROM || 'noreply@wealthguard.com'}>`,
    to,
    subject,
    html
  });
  
  console.log('Email notification sent:', info.messageId);
  
  // For development, log the preview URL
  if (process.env.NODE_ENV !== 'production') {
    console.log('Email preview URL:', nodemailer.getTestMessageUrl(info));
  }
  
  return info;
}

// Send notification to user based on user's preferences
async function notifyUser(userId, subject, templateName, context) {
  try {
    // Find user with preferences
    const user = await User.findByPk(userId);
    
    if (!user) {
      console.error(`User not found: ${userId}`);
      return;
    }
    
    // Check user preferences
    const preferences = user.preferences || {};
    
    // Send email notification if enabled
    if (preferences.emailNotifications !== false) {
      await sendEmail(user.email, subject, templateName, {
        ...context,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        }
      });
    }
    
    // Log the notification attempt
    console.log(`Notification sent to user ${userId} via email`);
    
    return true;
  } catch (error) {
    console.error('Error sending notification to user:', error);
    throw error;
  }
}

// Send notification to multiple users based on their preferences
async function notifyUsers(userIds, subject, templateName, context) {
  try {
    // For each user, check preferences and send notification
    const results = await Promise.allSettled(
      userIds.map(userId => notifyUser(userId, subject, templateName, context))
    );
    
    // Log results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Notifications sent to ${successful} users, ${failed} failed`);
    
    return results;
  } catch (error) {
    console.error('Error sending notifications to users:', error);
    throw error;
  }
}

module.exports = {
  setupTransporter,
  sendEmail,
  notifyUser,
  notifyUsers
};
