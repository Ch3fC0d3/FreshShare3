/**
 * Simplified FreshShare server focused on dashboard functionality
 */
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');

// Create Express app
const app = express();
const PORT = 3002;

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/freshshare_db')
  .then(() => {
    console.log('Connected to MongoDB successfully');
    startServer();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Starting server without MongoDB...');
    startServer();
  });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Set up EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/layout');

// Load routes
const dashboardRoutes = require('./routes/dashboard.routes');
app.use('/api/dashboard', dashboardRoutes);

// Dashboard page route
app.get('/dashboard', (req, res) => {
  res.render('pages/dashboard', { 
    title: 'FreshShare Dashboard',
    user: { name: 'Demo User' }
  });
});

// Home route for testing
app.get('/', (req, res) => {
  res.send(`
    <h1>FreshShare Server is Running!</h1>
    <p>The server is running successfully on port ${PORT}.</p>
    <p>Visit the <a href="/dashboard">Dashboard</a> to see your FreshShare dashboard.</p>
  `);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: err.message
  });
});

// Start server function
function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`Dashboard server is running on http://localhost:${PORT}`);
    console.log(`Visit http://localhost:${PORT}/dashboard to view the dashboard`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`ERROR: Port ${PORT} is already in use!`);
      console.log(`Trying alternative port ${PORT + 1}...`);
      
      app.listen(PORT + 1, () => {
        console.log(`Server is running on http://localhost:${PORT + 1}`);
        console.log(`Visit http://localhost:${PORT + 1}/dashboard to view the dashboard`);
      });
    } else {
      console.error('Server error:', err);
    }
  });
}
