const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.user;

// Retrieve JWT secret from environment or use a default (in production, always use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'freshShare-auth-secret';

/**
 * Verify JWT token from request headers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} - Continues to next middleware or returns error response
 */
const verifyToken = (req, res, next) => {
  // Get token from request headers (case-insensitive)
  const getHeaderCaseInsensitive = (headers, headerName) => {
    const headerKeys = Object.keys(headers);
    const key = headerKeys.find(k => k.toLowerCase() === headerName.toLowerCase());
    return key ? headers[key] : null;
  };
  
  const token = 
    getHeaderCaseInsensitive(req.headers, 'x-access-token') || 
    getHeaderCaseInsensitive(req.headers, 'authorization');
  
  // Make authentication optional for the groups API
  if (req.path === '/api/groups' && req.method === 'GET') {
    if (!token) {
      // For public access to groups, continue without setting userId
      return next();
    }
  } else if (!token) {
    return res.status(403).json({
      success: false,
      message: 'No token provided!'
    });
  }
  
  // If no token and we're on a path that allows public access, continue
  if (!token && req.path === '/api/groups' && req.method === 'GET') {
    return next();
  }
  
  // Remove Bearer prefix if present
  const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
  
  try {
    // Verify token
    const decoded = jwt.verify(tokenValue, JWT_SECRET);
    
    // Set userId in request
    req.userId = decoded.id;
    
    next();
  } catch (error) {
    // For public endpoints, continue without authentication
    if (req.path === '/api/groups' && req.method === 'GET') {
      return next();
    }
    
    return res.status(401).json({
      success: false,
      message: 'Unauthorized! Token is invalid or expired.'
    });
  }
};

/**
 * Check if request is from an authenticated user
 * Creates middleware that verifies token and validates against database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} - Continues to next middleware or returns error response
 */
const isAuthenticated = async (req, res, next) => {
  try {
    // Verify token
    verifyToken(req, res, async () => {
      // Check if user exists
      const user = await User.findById(req.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found!'
        });
      }
      
      next();
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'An error occurred while authenticating user.',
      error: error.message
    });
  }
};

const authJwt = {
  verifyToken,
  isAuthenticated
};

module.exports = authJwt;
