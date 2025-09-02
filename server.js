const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const config = require('./config/auth.config');
const fs = require('fs');

// Load environment variables from .env file
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '.env');
console.log('Loading environment variables from:', envPath);
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('Error loading .env file:', result.error);
  } else {
    console.log('Successfully loaded environment variables');
  }
} else {
  console.error('.env file not found at path:', envPath);
  dotenv.config(); // Fallback to default dotenv behavior
}

const app = express();
const PORT = process.env.PORT || 3001;

// Database configuration
const dbConfig = require('./config/db.config.js');

// Connect to MongoDB with retry logic
console.log('Connecting to MongoDB...');
    
const connectWithRetry = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Successfully connected to MongoDB!');
    console.log('Connection details:', {
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    });
    
    // Initialize database and start server
    initializeDatabase();
    startServer();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error('Connection details:', {
      code: err.code,
      name: err.name,
      message: err.message
    });
    
    // Retry connection after 5 seconds
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

// Start server function
function startServer() {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

// Add event listeners for MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  console.error('Error details:', {
    name: err.name,
    message: err.message,
    code: err.code,
    stack: err.stack
  });
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB connection disconnected');
});

// Add a process exit handler to close MongoDB connection
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error while closing MongoDB connection:', err);
    process.exit(1);
  }
});

// Initialize database with roles if needed
async function initializeDatabase() {
  try {
    const db = require('./models');
    const Role = db.role;
    
    const count = await Role.estimatedDocumentCount();
    
    if (count === 0) {
      await Promise.all([
        new Role({ name: "user" }).save(),
        new Role({ name: "moderator" }).save(),
        new Role({ name: "admin" }).save()
      ]);
      console.log('Added roles to database');
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Token synchronization middleware - ensures tokens in Authorization headers are set as cookies
app.use((req, res, next) => {
  try {
    // Check if there's an Authorization header but no token cookie
    if (req.headers.authorization && (!req.cookies.token || req.cookies.token === 'undefined')) {
      const authHeader = req.headers.authorization;
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      
      if (token && token !== 'undefined' && token !== 'null') {
        // Try to verify the token before setting it as a cookie
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || "bezkoder-secret-key");
          if (decoded && decoded.id) {
            // Set the token as a cookie
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
        }
      }
    }
    next();
  } catch (err) {
    console.error('Token sync middleware error:', err);
    next();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'public/uploads/marketplace');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/layout');

// Authentication middleware for views
app.use(async (req, res, next) => {
  try {
    // Get token from various sources with better error handling
    let token = null;
    
    // Check cookies first (most common for web pages)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } 
    // Then check authorization header (for API requests)
    else if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        token = authHeader;
      }
    } 
    // Finally check query parameter (for special cases like redirects)
    else if (req.query && req.query.token) {
      token = req.query.token;
      
      // If token is in query, set it as a cookie for persistence
      // This helps with redirects that include the token
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        sameSite: 'lax',
        path: '/'
      });
    }

    if (token) {
      try {
        // Verify token using the same secret as in auth.config.js
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "bezkoder-secret-key");
        const User = require('./models/user.model');
        const user = await User.findById(decoded.id).select('-password');
        
        if (user) {
          // Add user data to locals for all views
          res.locals.user = user;
          console.log('User authenticated:', user.username, 'ID:', user._id); // Enhanced debug log
          
          // Check if token is close to expiration (less than 24 hours remaining)
          // and renew it if needed
          if (decoded.exp && decoded.exp - (Date.now() / 1000) < 24 * 60 * 60) {
            console.log('Token close to expiration, renewing for user:', user.username);
            
            // Generate new token with fresh expiration (7 days)
            const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "bezkoder-secret-key", {
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
            
            console.log('Token renewed successfully for user:', user.username);
          }
        } else {
          console.log('Token valid but user not found in database');
          res.clearCookie('token'); // Clear token if user doesn't exist
        }
      } catch (err) {
        console.error('Token verification failed:', err);
        res.clearCookie('token'); // Clear invalid token
      }
    } else {
      console.log('No authentication token found');
    }
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    next();
  }
});

// API Routes with error handling
const wrapAsync = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Auth routes (both pages and API)
const authRoutes = require('./routes/auth.routes');

// Marketplace API routes
const marketplaceApiRoutes = require('./routes/api/marketplace');
app.use('/', authRoutes); // Mount at root for pages

// Other API routes
app.use('/api/marketplace', marketplaceApiRoutes);
app.use('/api/groups', require('./routes/groups.routes'));
app.use('/api/orders', require('./routes/orders.routes'));

// Page Routes
app.get('/', (req, res) => {
  res.render('pages/index', { 
    title: 'FreshShare - Home'
  });
});

app.get('/marketplace', async (req, res) => {
  try {
    // Fetch listings from the database
    const db = require('./models');
    const Listing = db.listing;
    
    // Get query parameters for filtering
    const { 
      category, 
      minPrice, 
      maxPrice, 
      isOrganic, 
      sortBy = 'latest',
      search
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (category) filter.category = category;
    if (isOrganic) filter.isOrganic = isOrganic === 'true';
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    
    // Add text search if search parameter is provided
    if (search) {
      filter.$text = { $search: search };
    }
    
    // Build sort object
    let sort = { createdAt: -1 }; // Default sort by newest
    
    if (sortBy === 'price-asc') sort = { price: 1 };
    if (sortBy === 'price-desc') sort = { price: -1 };
    
    // Execute query
    const listings = await Listing.find(filter)
      .sort(sort)
      .limit(12) // Limit to 12 listings for the page
      .populate('seller', 'username profileImage');
    
    // Render the marketplace page with the listings
    res.render('pages/marketplace', { 
      title: 'FreshShare - Marketplace',
      listings: listings || [],
      filters: {
        category,
        minPrice,
        maxPrice,
        isOrganic,
        sortBy,
        search
      }
    });
  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    // Render the page with an empty listings array if there's an error
    res.render('pages/marketplace', { 
      title: 'FreshShare - Marketplace',
      listings: [],
      filters: {},
      error: 'Failed to load marketplace listings'
    });
  }
});

app.get('/create-listing', (req, res) => {
  res.render('pages/create-listing', { 
    title: 'FreshShare - Create Listing'
  });
});

app.get('/forum', (req, res) => {
  res.render('pages/forum', { 
    title: 'FreshShare - Forum'
  });
});

app.get('/groups', (req, res) => {
  res.render('pages/groups', { 
    title: 'FreshShare - Groups'
  });
});

app.get('/create-group', (req, res) => {
  res.render('pages/create-group', { 
    title: 'FreshShare - Create New Group'
  });
});

app.get('/group-details', (req, res) => {
  res.render('pages/group-details', { 
    title: 'FreshShare - Group Details',
    groupId: req.query.id
  });
});

app.get('/groups/:id/shopping', (req, res) => {
  res.render('pages/group_shopping', { 
    title: 'FreshShare - Group Shopping',
    groupId: req.params.id
  });
});

app.get('/groups/:id/orders', (req, res) => {
  res.render('pages/group_orders', { 
    title: 'FreshShare - Group Orders',
    groupId: req.params.id
  });
});

app.get('/orders/:id', (req, res) => {
  res.render('pages/order_details', { 
    title: 'FreshShare - Order Details',
    orderId: req.params.id
  });
});

app.get('/about', (req, res) => {
  res.render('pages/about', { 
    title: 'FreshShare - About'
  });
});

app.get('/contact', (req, res) => {
  res.render('pages/contact', { 
    title: 'FreshShare - Contact'
  });
});

app.get('/profile', async (req, res) => {
  try {
    // Check if user is logged in
    if (!res.locals.user) {
      console.log('Profile access attempted without authentication, redirecting to login');
      return res.redirect('/login?redirect=/profile&error=' + encodeURIComponent('Please log in to view your profile'));
    }

    // User is logged in, use their data
    const userData = res.locals.user;
    console.log(`Rendering profile page for user: ${userData.username} (${userData._id})`);

    // Add debug information
    console.log('User data available:', {
      id: userData._id,
      username: userData.username,
      email: userData.email
    });

    // Ensure userData is properly formatted for the template
    const formattedUserData = {
      _id: userData._id,
      username: userData.username,
      email: userData.email,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      profileImage: userData.profileImage || '/assets/images/avatar-placeholder.jpg',
      location: {
        street: userData.location?.street || '',
        city: userData.location?.city || '',
        state: userData.location?.state || '',
        zipCode: userData.location?.zipCode || ''
      },
      phoneNumber: userData.phoneNumber || ''
    };

    // Render the profile page with the user data
    res.render('pages/profile', {
      title: 'FreshShare - Profile',
      user: formattedUserData
    });
  } catch (error) {
    console.error('Profile page error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load profile page: ' + error.message
    });
  }
});

app.get('/profile-edit', async (req, res) => {
  try {
    // Check if user is logged in
    if (!res.locals.user) {
      return res.redirect('/login');
    }
    
    // Use the user data from locals
    const userData = res.locals.user;

    res.render('pages/profile-edit', {
      title: 'FreshShare - Edit Profile',
      user: userData
    });
  } catch (error) {
    console.error('Profile edit page error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load profile edit page'
    });
  }
});

app.get('/dashboard', (req, res) => {
  // Check if user is logged in
  if (!res.locals.user) {
    console.log('User not authenticated, redirecting to login with noRedirect flag');
    return res.redirect('/login?noRedirect=true');
  }
  
  console.log('User authenticated, rendering dashboard');
  res.render('pages/dashboard', { 
    title: 'FreshShare - Dashboard'
  });
});

app.get('/login', (req, res) => {
  // COMPLETELY DISABLE REDIRECTS to break the infinite loop
  console.log('Rendering login page without any redirects');
  
  // Always render the login page regardless of authentication status
  res.render('pages/login', { 
    title: 'FreshShare - Login'
  });
});

app.get('/signup', (req, res) => {
  if (res.locals.user) {
    return res.redirect('/dashboard');
  }
  res.render('pages/signup', { 
    title: 'FreshShare - Sign Up'
  });
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});
