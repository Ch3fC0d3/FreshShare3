const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../models');
const User = db.user;

// Environment variables for email (should be set in .env)
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const EMAIL_USER = process.env.EMAIL_USER || 'your-email@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'your-password';
const EMAIL_FROM = process.env.EMAIL_FROM || 'FreshShare <noreply@freshshare.com>';
const APP_URL = process.env.APP_URL || 'http://localhost:3001';

// Create nodemailer transporter or use mock implementation
let transporter;

// Check if email configuration is valid
const isEmailConfigValid = () => {
  return EMAIL_HOST !== 'smtp.example.com' && 
         EMAIL_USER !== 'user@example.com' && 
         EMAIL_PASS !== 'your_email_password' &&
         EMAIL_PASS !== 'your-password';
};

if (isEmailConfigValid()) {
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465, // true for 465, false for other ports
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
} else {
  console.warn('Email configuration not properly set up. Using mock email implementation.');
  // Mock implementation that just logs emails instead of sending them
  transporter = {
    sendMail: (mailOptions) => {
      console.log('MOCK EMAIL SENDING:', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text || 'Email body hidden for brevity'
      });
      return Promise.resolve({ messageId: 'mock-email-id-' + Date.now() });
    }
  };
}

/**
 * Send verification email directly from another controller
 * @param {String} email - User's email address
 * @param {String} token - Verification token
 * @param {String} username - User's username
 * @returns {Promise} - Promise that resolves when email is sent
 */
exports.sendVerificationEmailDirectly = async (email, token, username) => {
  try {
    // Create verification URL
    const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
    
    // Create email
    const mailOptions = {
      from: EMAIL_FROM,
      to: email,
      subject: 'FreshShare - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Verify Your FreshShare Email</h2>
          <p>Hello ${username},</p>
          <p>Thank you for signing up for FreshShare! Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" style="display: inline-block; background-color: #4CAF50; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin: 15px 0;">Verify Email</a>
          <p>If the button doesn't work, you can copy and paste this link in your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't sign up for FreshShare, please ignore this email.</p>
          <p>Best regards,<br>The FreshShare Team</p>
        </div>
      `
    };
    
    // Send email
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Send verification email directly error:', error);
    throw error;
  }
};

/**
 * Generate verification token and save it to user
 * @param {Object} user - User document
 * @returns {String} - Generated token
 */
const generateVerificationToken = async (user) => {
  // Generate random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set token and expiration (24 hours from now)
  user.emailVerificationToken = token;
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  
  // Save user
  await user.save();
  
  return token;
};

/**
 * Send verification email to user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.sendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Skip if already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }
    
    // Generate verification token
    const token = await generateVerificationToken(user);
    
    // Create verification URL
    const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
    
    // Create email
    const mailOptions = {
      from: EMAIL_FROM,
      to: user.email,
      subject: 'FreshShare - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Verify Your FreshShare Email</h2>
          <p>Hello ${user.username},</p>
          <p>Thank you for signing up for FreshShare! Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" style="display: inline-block; background-color: #4CAF50; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin: 15px 0;">Verify Email</a>
          <p>If the button doesn't work, you can copy and paste this link in your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't sign up for FreshShare, please ignore this email.</p>
          <p>Best regards,<br>The FreshShare Team</p>
        </div>
      `
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    
    return res.status(200).json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Send verification email error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while sending verification email',
      error: error.message
    });
  }
};

/**
 * Verify email with token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).render('verify-email', {
        success: false,
        message: 'Verification token is required'
      });
    }
    
    // Find user by token and check if token is still valid
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).render('verify-email', {
        success: false,
        message: 'Invalid or expired verification token'
      });
    }
    
    // Mark email as verified and clear token
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    
    await user.save();
    
    return res.status(200).render('verify-email', {
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).render('verify-email', {
      success: false,
      message: 'An error occurred while verifying email'
    });
  }
};

/**
 * Check if user's email is verified
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.checkEmailVerification = async (req, res) => {
  try {
    const userId = req.userId; // Set by authJwt middleware
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      verified: user.emailVerified
    });
  } catch (error) {
    console.error('Check email verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while checking email verification',
      error: error.message
    });
  }
};

/**
 * Resend verification email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.resendVerificationEmail = async (req, res) => {
  try {
    const userId = req.userId; // Set by authJwt middleware
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Skip if already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }
    
    // Generate verification token
    const token = await generateVerificationToken(user);
    
    // Create verification URL
    const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
    
    // Create email
    const mailOptions = {
      from: EMAIL_FROM,
      to: user.email,
      subject: 'FreshShare - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Verify Your FreshShare Email</h2>
          <p>Hello ${user.username},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" style="display: inline-block; background-color: #4CAF50; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin: 15px 0;">Verify Email</a>
          <p>If the button doesn't work, you can copy and paste this link in your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't sign up for FreshShare, please ignore this email.</p>
          <p>Best regards,<br>The FreshShare Team</p>
        </div>
      `
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    
    return res.status(200).json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification email error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while resending verification email',
      error: error.message
    });
  }
};
