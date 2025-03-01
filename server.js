const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const cors = require('cors');
require('dotenv').config();

// Database connection
const db = require('./models');
const dbConfig = require('./config/db.config');

// Connect to MongoDB
db.mongoose
  .connect(`mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Successfully connected to MongoDB.");
  })
  .catch(err => {
    console.error("Connection error", err);
    process.exit();
  });

// Initialize app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads directory exists
const fs = require('fs');
const uploadDir = path.join(__dirname, 'public/uploads/marketplace');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/layout');

// API Routes
app.use('/api/marketplace', require('./routes/marketplace.routes'));
app.use('/api/groups', require('./routes/groups.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/orders', require('./routes/orders.routes'));

// Page Routes
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

app.get('/groups/:id', (req, res) => {
  res.render('pages/group_card', { 
    title: 'FreshShare - Group Details',
    groupId: req.params.id
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

app.get('/login', (req, res) => {
  res.render('pages/login', { 
    title: 'FreshShare - Login'
  });
});

app.get('/signup', (req, res) => {
  res.render('pages/signup', { 
    title: 'FreshShare - Sign Up'
  });
});

app.get('/contact', (req, res) => {
  res.render('pages/contact', { 
    title: 'FreshShare - Contact'
  });
});

app.get('/profile', (req, res) => {
  res.render('pages/group_card', { 
    title: 'FreshShare - Profile'
  });
});

app.get('/profile-edit', (req, res) => {
  res.render('pages/profile-edit', { 
    title: 'FreshShare - Edit Profile'
  });
});

app.get('/dashboard', (req, res) => {
  res.render('pages/dashboard', { 
    title: 'FreshShare - Dashboard'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
