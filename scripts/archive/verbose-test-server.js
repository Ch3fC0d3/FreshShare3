/**
 * Verbose test server to debug port 3002 issues
 */
const express = require('express');
const http = require('http');
const app = express();

// Add basic middleware with logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add CORS support
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Add a simple test route
app.get('/', (req, res) => {
  console.log('Root endpoint accessed');
  res.json({ message: 'Verbose test server is running on port 3002' });
});

// Add a test UPC lookup route
app.get('/api/test/upc/:code', (req, res) => {
  const upcCode = req.params.code;
  console.log(`UPC lookup requested for: ${upcCode}`);
  res.json({
    success: true,
    upc: upcCode,
    product: {
      name: `Test Product (${upcCode})`,
      description: 'This is a test product',
      price: 9.99,
      isFallback: true
    }
  });
});

// Create HTTP server with detailed error handling
const server = http.createServer(app);

server.on('error', (error) => {
  console.error('Server error occurred:');
  console.error(error);
  
  if (error.code === 'EADDRINUSE') {
    console.error(`Port 3002 is already in use. Please free the port and try again.`);
    console.error(`You can use: taskkill /F /IM node.exe to kill all Node processes`);
  }
  
  if (error.code === 'EACCES') {
    console.error(`Permission denied to bind to port 3002. Try running as administrator.`);
  }
});

// Start the server with explicit host binding and error handling
const PORT = 3002;
try {
  console.log(`Attempting to start server on port ${PORT}...`);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Verbose test server running on port ${PORT}`);
    console.log(`Test UPC endpoint: http://localhost:${PORT}/api/test/upc/123456789`);
    console.log(`Server is listening on all network interfaces (0.0.0.0:${PORT})`);
  });
} catch (error) {
  console.error('Failed to start server:');
  console.error(error);
}
