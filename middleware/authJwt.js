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
  // Get token from request headers (case-insensitive) or cookies
  const getHeaderCaseInsensitive = (headers, headerName) => {
    const headerKeys = Object.keys(headers);
    const key = headerKeys.find(k => k.toLowerCase() === headerName.toLowerCase());
    return key ? headers[key] : null;
  };
  
  // Enhanced token extraction with detailed logging
  let token = null;
  
  // Check cookies first (preferred method for web pages)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
    console.log(`Token found in cookies for ${req.method} ${req.originalUrl}`);
  } 
  // Then check authorization header (for API calls)
  else if (getHeaderCaseInsensitive(req.headers, 'authorization')) {
    const authHeader = getHeaderCaseInsensitive(req.headers, 'authorization');
    // Check if it has Bearer prefix and extract token
    token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    console.log(`Token found in Authorization header for ${req.method} ${req.originalUrl}`);
    
    // If token is valid, set it as a cookie for future requests
    try {
      // Verify token before setting cookie
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.id) {
        // Set token as cookie
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
          sameSite: 'lax',
          path: '/'
        });
        console.log(`Set token cookie from Authorization header for user ID: ${decoded.id}`);
      }
    } catch (err) {
      console.error('Error verifying token from Authorization header:', err.message);
      // Continue with normal flow, don't set cookie for invalid token
    }
  } 
  // Finally check x-access-token (legacy support)
  else if (getHeaderCaseInsensitive(req.headers, 'x-access-token')) {
    token = getHeaderCaseInsensitive(req.headers, 'x-access-token');
    console.log(`Token found in x-access-token header for ${req.method} ${req.originalUrl}`);
    
    // If token is valid, set it as a cookie for future requests
    try {
      // Verify token before setting cookie
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.id) {
        // Set token as cookie
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
          sameSite: 'lax',
          path: '/'
        });
        console.log(`Set token cookie from x-access-token header for user ID: ${decoded.id}`);
      }
    } catch (err) {
      console.error('Error verifying token from x-access-token header:', err.message);
      // Continue with normal flow, don't set cookie for invalid token
    }
  }
  
  // Make authentication optional for the groups API
  if (req.originalUrl === '/api/groups' && req.method === 'GET') {
    if (!token) {
      // For public access to groups, continue without setting userId
      return next();
    }
  }
  
  // If no token for protected routes, return error
  if (!token) {
    console.log(`No token found for ${req.method} ${req.originalUrl}`);
    
    // For API routes, return JSON error
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(403).json({
        success: false,
        message: 'No token provided!'
      });
    }
    
    // For web routes, redirect to login
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
  }
  
  // Remove Bearer prefix if present
  const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
  
  try {
    // Verify token
    const decoded = jwt.verify(tokenValue, JWT_SECRET);
    
    // Set userId in request
    req.userId = decoded.id;
    
    // Check if token is close to expiration (less than 24 hours remaining)
    // and renew it if needed
    if (decoded.exp && decoded.exp - (Date.now() / 1000) < 24 * 60 * 60) {
      console.log('Token close to expiration, renewing...');
      
      // Generate new token with fresh expiration
      const newToken = jwt.sign({ id: decoded.id }, JWT_SECRET, {
        expiresIn: 7 * 24 * 60 * 60 // 7 days
      });
      
      // Set new token as cookie
      res.cookie('token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        sameSite: 'lax',
        path: '/'
      });
      
      console.log('Token renewed successfully');
    }
    
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    
    // For public endpoints, continue without authentication
    if (req.originalUrl === '/api/groups' && req.method === 'GET') {
      return next();
    }
    
    // For API routes, return JSON error
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized! Token is invalid or expired.'
      });
    }
    
    // For web routes, clear cookie and redirect to login
    res.clearCookie('token');
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl) + 
                       '&error=' + encodeURIComponent('Your session has expired. Please log in again.'));
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
    // Verify token first
    verifyToken(req, res, async () => {
      // Skip user check for public endpoints
      if (req.originalUrl === '/api/groups' && req.method === 'GET' && !req.userId) {
        return next();
      }
      
      // Check if user exists
      const user = await User.findById(req.userId);
      
      if (!user) {
        console.log(`User not found for ID: ${req.userId}`);
        
        // For API routes, return JSON error
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(404).json({
            success: false,
            message: 'User not found!'
          });
        }
        
        // For web routes, clear cookie and redirect to login
        res.clearCookie('token');
        return res.redirect('/login?error=' + encodeURIComponent('User account not found. Please log in again.'));
      }
      
      next();
    });
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    // For API routes, return JSON error
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(500).json({
        success: false,
        message: 'An error occurred while authenticating user.',
        error: error.message
      });
    }
    
    // For web routes, redirect to error page
    return res.status(500).render('error', {
      title: 'Authentication Error',
      message: 'An error occurred during authentication. Please try again later.'
    });
  }
};

const authJwt = {
  verifyToken,
  isAuthenticated
};

module.exports = authJwt;
