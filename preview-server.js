// Simple HTTP server for previewing the FreshShare website
const express = require('express');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();
const PORT = 3002; // Using a different port to avoid conflicts

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the simple preview HTML for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'simple-preview.html'));
});

// Serve the EJS views if available
app.get('/views/:page', (req, res) => {
  const pagePath = path.join(__dirname, 'views', 'pages', `${req.params.page}.ejs`);
  
  // Check if the requested page exists
  if (fs.existsSync(pagePath)) {
    res.sendFile(pagePath);
  } else {
    res.status(404).send('Page not found');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Preview server is running on http://localhost:${PORT}`);
  console.log('This is a simple preview server that does not require MongoDB');
});
