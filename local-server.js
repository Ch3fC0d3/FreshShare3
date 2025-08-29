// Load environment variables from .env.local file
require('dotenv').config({ path: '.env.local' });

const express = require('express');
const path = require('path');
const fs = require('fs');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

// Import actual controllers and middleware
const authController = require('./controllers/auth.controller');
const { authJwt } = require('./middleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser()); // Add cookie parser for JWT tokens

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'public/uploads/marketplace');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up EJS with layouts
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/layout');

// Mock group data for testing
const mockGroups = [
  {
    _id: '1',
    name: 'Neighborhood Food Share',
    description: 'A community group for sharing fresh produce in our neighborhood.',
    category: 'neighborhood',
    location: {
      city: 'Your City',
      state: 'Your State',
      zipCode: '12345'
    },
    members: 45,
    createdAt: new Date()
  },
  {
    _id: '2',
    name: 'Community Garden',
    description: 'Join our community garden and share your harvest with others!',
    category: 'community_garden',
    location: {
      city: 'Your City',
      state: 'Your State',
      zipCode: '12345'
    },
    members: 32,
    createdAt: new Date()
  }
];

// Mock group controller
const groupController = {
  getAllGroups: (req, res) => {
    console.log('Returning mock groups data');
    res.json({
      success: true,
      groups: mockGroups
    });
  }
};

// Add mock group routes
app.get('/api/groups', (req, res) => {
  console.log('Returning mock groups data');
  res.json({
    success: true,
    groups: mockGroups
  });
});

// Check if user is authenticated based on JWT token in cookies
app.use((req, res, next) => {
  const token = req.cookies.token;
  
  if (token) {
    try {
      // Verify token and extract user ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.id;
      
      // For now, just set a mock user
      res.locals.user = {
        id: req.userId,
        username: 'testuser',
        email: 'test@example.com'
      };
      res.locals.isAuthenticated = true;
      console.log(`User authenticated: testuser`);
    } catch (err) {
      res.locals.isAuthenticated = false;
      res.locals.user = null;
      console.log('Invalid token:', err.message);
    }
  } else {
    res.locals.isAuthenticated = false;
    res.locals.user = null;
    console.log('No authentication token found');
  }
  
  next();
});

// Authentication routes
app.get('/login', (req, res) => {
  // Check if user is already logged in
  if (res.locals.isAuthenticated) {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect');
    return res.redirect(redirectUrl || '/dashboard');
  }
  
  res.render('pages/login', { 
    title: 'FreshShare - Login'
  });
});

app.get('/signup', (req, res) => {
  res.render('pages/signup', { 
    title: 'FreshShare - Sign Up'
  });
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

// API authentication routes using real controllers
app.post('/api/auth/signup', authController.signup);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/profile', [authJwt.verifyToken], authController.getUserProfile);
app.put('/api/auth/profile', [authJwt.verifyToken], authController.updateUserProfile);

// Protected routes - redirect to login if not authenticated
app.get('/dashboard', (req, res) => {
  if (!res.locals.isAuthenticated) {
    const redirectUrl = '/dashboard';
    return res.redirect(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
  }
  res.render('pages/dashboard', { 
    title: 'FreshShare - Dashboard'
  });
});

app.get('/profile', (req, res) => {
  if (!res.locals.isAuthenticated) {
    const redirectUrl = '/profile';
    return res.redirect(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
  }
  res.render('pages/profile', { 
    title: 'FreshShare - Profile'
  });
});

// Public routes
app.get('/', (req, res) => {
  res.render('pages/index', { 
    title: 'FreshShare - Home'
  });
});

app.get('/marketplace', (req, res) => {
  res.render('pages/marketplace', { 
    title: 'FreshShare - Marketplace'
  });
});

app.get('/groups', (req, res) => {
  res.render('pages/groups', { 
    title: 'FreshShare - Groups'
  });
});

app.get('/forum', (req, res) => {
  res.render('pages/forum', { 
    title: 'FreshShare - Forum'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Local test server is running on http://localhost:${PORT}`);
  console.log(`Visit http://localhost:${PORT}/marketplace to see the marketplace page`);
});
