// Simplified version of server.js with only essential components
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3002;

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API is working' });
});

// UPC lookup route
app.get('/api/marketplace/upc/:upc', (req, res) => {
  const upc = req.params.upc;
  console.log(`UPC lookup requested for: ${upc}`);
  
  res.json({
    success: true,
    upc: upc,
    product: {
      name: `Test Product (${upc})`,
      description: 'This is a test product',
      price: 9.99,
      isFallback: true
    }
  });
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Start server
try {
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  
  server.on('error', (error) => {
    console.error(`SERVER ERROR: ${error.message}`);
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Try running: taskkill /F /IM node.exe`);
    }
  });
} catch (error) {
  console.error(`CRITICAL ERROR: ${error.message}`);
}
