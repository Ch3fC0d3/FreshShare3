const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.user;
const crypto = require('crypto');
const emailController = require('./email.controller');

// Retrieve JWT secret from environment or use a default (in production, always use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || "bezkoder-secret-key";

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - JSON response with status and message
 */
exports.signup = async (req, res) => {
  try {
    console.log('Signup request received:', req.body);
    
    // Validate request body
    const { username, email, password, firstName, lastName, address, city, zipCode } = req.body;
    
    if (!username || !email || !password) {
      console.log('Signup validation failed - missing required fields:', { 
        hasUsername: !!username, 
        hasEmail: !!email, 
        hasPassword: !!password 
      });
      return res.status(400).json({ 
        success: false, 
        message: "Username, email, and password are required!" 
      });
    }

    console.log('Checking for existing user with username or email:', { username, email });
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username: username },
        { email: email }
      ] 
    });

    if (existingUser) {
      console.log('User already exists:', { 
        existingUsername: existingUser.username, 
        existingEmail: existingUser.email 
      });
      return res.status(400).json({
        success: false,
        message: "Username or email is already in use!"
      });
    }

    // Create new user
    const hashedPassword = bcrypt.hashSync(password, 8);
    
    console.log('Creating new user:', { 
      username, 
      email, 
      hasFirstName: !!firstName, 
      hasLastName: !!lastName,
      hasAddress: !!address,
      hasCity: !!city,
      hasZipCode: !!zipCode
    });
    
    const user = new User({
      username: username,
      email: email,
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      location: {
        street: address || '',
        city: city || '',
        zipCode: zipCode || ''
      }
    });

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = token;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Save user to database
    console.log('Attempting to save user to database...');
    await user.save();
    console.log('User saved successfully with ID:', user._id);

    // Try to send verification email
    try {
      // Create verification URL
      const APP_URL = process.env.APP_URL || 'http://localhost:3001';
      const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
      
      // Create email options object for email controller
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'FreshShare <noreply@freshshare.com>',
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

      // Send email using the transporter from email controller
      await emailController.sendVerificationEmailDirectly(user.email, token, user.username);
      console.log('Verification email sent successfully to:', user.email);
    } catch (emailError) {
      // Log the error but don't fail the registration
      console.error('Failed to send verification email:', emailError);
    }

    // Return success response
    return res.status(201).json({
      success: true,
      message: "User registered successfully! Please check your email to verify your account."
    });
  } catch (error) {
    console.error("Registration error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "An error occurred during registration.",
      error: error.message
    });
  }
};

/**
 * Authenticate a user and generate JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - JSON response with token and user info
 */
exports.login = async (req, res) => {
  try {
    // Validate request body
    const { username, password, rememberMe } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Username and password are required!" 
      });
    }
    
    // Set expiration based on rememberMe option
    const tokenExpiration = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60; // 30 days or 7 days
    const cookieExpiration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000; // in milliseconds

    // Find user by username
    const user = await User.findOne({ username: username });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found!"
      });
    }

    // Check password
    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid password!"
      });
    }

    // Generate JWT token with expiration based on rememberMe
    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: tokenExpiration // either 30 or 7 days depending on rememberMe
    });

    // Set token as cookie with expiration based on rememberMe
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: cookieExpiration, // either 30 or 7 days in milliseconds
      sameSite: 'lax', // Changed from 'strict' to 'lax' to work better across pages
      path: '/' // Ensure cookie is available on all paths
    });

    // Create user object without password
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImage: user.profileImage,
      location: {
        street: user.location.street,
        city: user.location.city,
        state: user.state,
        zipCode: user.location.zipCode
      },
      phoneNumber: user.phoneNumber,
      privacy: user.privacy || {},
      notifications: user.notifications || {}
    };

    // Return token and user info
    return res.status(200).json({
      success: true,
      message: "Login successful!",
      token: token,
      user: userResponse
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during login.",
      error: error.message
    });
  }
};

/**
 * Get current user profile information
 * @param {Object} req - Express request object (with user attached from middleware)
 * @param {Object} res - Express response object
 * @returns {Object} - JSON response with user info
 */
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.userId; // Set by authJwt middleware
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found!"
      });
    }
    
    // Return user info without password
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        nickname: user.nickname,
        profileImage: user.profileImage,
        phoneNumber: user.phoneNumber,
        street: user.location.street,
        city: user.location.city,
        state: user.state,
        zipCode: user.location.zipCode,
        privacy: user.privacy || {},
        notifications: user.notifications || {}
      }
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving user profile.",
      error: error.message
    });
  }
};

/**
 * Update user profile information
 * @param {Object} req - Express request object (with user attached from middleware)
 * @param {Object} res - Express response object
 * @returns {Object} - JSON response with updated user info
 */
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId; // Set by authJwt middleware
    
    // Get fields to update
    const { 
      username, 
      email, 
      street, 
      city, 
      state, 
      zipCode, 
      phoneNumber 
    } = req.body;
    
    // Check if username or email already in use by another user
    if (username || email) {
      const existingUser = await User.findOne({
        _id: { $ne: userId },
        $or: [
          { username: username },
          { email: email }
        ]
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username or email is already in use by another user!"
        });
      }
    }
    
    // Create update object
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (street) updateData.location.street = street;
    if (city) updateData.location.city = city;
    if (state) updateData.state = state;
    if (zipCode) updateData.location.zipCode = zipCode;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true } // Return updated user
    );
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found!"
      });
    }
    
    // Return updated user info without password
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully!",
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        profileImage: updatedUser.profileImage,
        street: updatedUser.location.street,
        city: updatedUser.location.city,
        state: updatedUser.state,
        zipCode: updatedUser.location.zipCode,
        phoneNumber: updatedUser.phoneNumber
      }
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating user profile.",
      error: error.message
    });
  }
};
