/**
 * Debug version of server.js with enhanced error logging
 */

// Global error handlers to catch any uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error('Error details:', err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error('Error details:', err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');

// Create Express app
const app = express();
const PORT = 3002;

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Simple test route
app.get('/', (req, res) => {
  res.json({ message: 'Debug server is running' });
});

// Register marketplace API routes
try {
  console.log('Attempting to register marketplace API routes...');
  const marketplaceApiRoutes = require('./routes/api/marketplace');
  app.use('/api/marketplace', marketplaceApiRoutes);
  console.log('Successfully registered marketplace API routes');
} catch (error) {
  console.error('Failed to register marketplace API routes:', error);
}

// Create HTTP server with detailed error handling
const server = http.createServer(app);

server.on('error', (error) => {
  console.error('Server error occurred:');
  console.error(error);
  
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please free the port and try again.`);
    console.error(`You can use: taskkill /F /IM node.exe to kill all Node processes`);
  }
  
  if (error.code === 'EACCES') {
    console.error(`Permission denied to bind to port ${PORT}. Try running as administrator.`);
  }
});

// Start the server with explicit host binding and error handling
try {
  console.log(`Attempting to start server on port ${PORT}...`);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ SUCCESS: Debug server is running on port ${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api/`);
    console.log(`UPC lookup endpoint: http://localhost:${PORT}/api/marketplace/upc/:upc`);
    console.log('=========================================');
  });
} catch (error) {
  console.error('Failed to start server:');
  console.error(error);
}
