/**
 * Minimal test server to verify port 3002 is accessible
 */
const express = require('express');
const app = express();

// Add basic middleware
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
  res.json({ message: 'Test server is running on port 3002' });
});

// Add a test UPC lookup route
app.get('/api/test/upc/:code', (req, res) => {
  const upcCode = req.params.code;
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

// Start the server with explicit host binding
const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Test UPC endpoint: http://localhost:${PORT}/api/test/upc/123456789`);
});
