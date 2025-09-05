// Dependency check script
console.log('Starting dependency check...');

try {
  // Check Express
  console.log('Checking Express...');
  const express = require('express');
  console.log('✅ Express version:', require('express/package.json').version);
  
  // Check CORS
  console.log('Checking CORS...');
  const cors = require('cors');
  console.log('✅ CORS loaded successfully');
  
  // Check Mongoose
  console.log('Checking Mongoose...');
  const mongoose = require('mongoose');
  console.log('✅ Mongoose version:', mongoose.version);
  
  // Check other dependencies
  console.log('Checking other dependencies...');
  const bodyParser = require('body-parser');
  console.log('✅ body-parser loaded successfully');
  
  const path = require('path');
  console.log('✅ path loaded successfully');
  
  const fs = require('fs');
  console.log('✅ fs loaded successfully');
  
  // Check Node.js version
  console.log('Node.js version:', process.version);
  console.log('Platform:', process.platform);
  
  // Check if we can create a simple server
  console.log('Testing simple server creation...');
  const app = express();
  const server = app.listen(0, () => {
    const port = server.address().port;
    console.log(`✅ Test server created successfully on random port ${port}`);
    server.close(() => {
      console.log('Test server closed');
      console.log('All dependency checks passed successfully');
    });
  });
  
  server.on('error', (error) => {
    console.error('❌ Error creating test server:', error.message);
  });
  
} catch (error) {
  console.error('❌ DEPENDENCY ERROR:', error.message);
  console.error(error.stack);
}
