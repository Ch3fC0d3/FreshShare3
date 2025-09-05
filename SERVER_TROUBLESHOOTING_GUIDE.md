# FreshShare UPC Lookup Server Troubleshooting Guide

This guide provides comprehensive instructions for troubleshooting and resolving common issues with the FreshShare UPC lookup server.

## Quick Start

1. **Start the server using the PowerShell script:**
   ```powershell
   .\manage-server.ps1 -Action start
   ```

2. **Check server status:**
   ```powershell
   .\manage-server.ps1 -Action status
   ```

3. **Run diagnostics:**
   ```powershell
   .\manage-server.ps1 -Action diagnose
   ```

4. **Restart the server:**
   ```powershell
   .\manage-server.ps1 -Action restart
   ```

5. **Stop the server:**
   ```powershell
   .\manage-server.ps1 -Action stop
   ```

## Common Issues and Solutions

### 1. Server Won't Start

#### Symptoms:
- No response when trying to access the API
- No error messages in the console
- Server process exits immediately

#### Troubleshooting Steps:

1. **Check if port 3002 is already in use:**
   ```powershell
   netstat -ano | findstr :3002
   ```
   If a process is using the port, terminate it:
   ```powershell
   taskkill /F /PID <process_id>
   ```

2. **Check for Node.js installation issues:**
   ```powershell
   node --version
   ```
   Ensure you're using a compatible version (v14+ recommended).

3. **Verify dependencies are installed:**
   ```powershell
   npm list --depth=0
   ```
   If dependencies are missing, run:
   ```powershell
   npm install
   ```

4. **Try the simplified server:**
   ```powershell
   node simplified-server.js
   ```
   This minimal server has fewer dependencies and can help isolate issues.

5. **Check for syntax errors:**
   Run the server-syntax-check.js script:
   ```powershell
   node server-syntax-check.js
   ```

### 2. Server Starts But API Endpoints Return 404

#### Symptoms:
- Server starts without errors
- API endpoints return 404 Not Found

#### Troubleshooting Steps:

1. **Verify route registration:**
   Check that routes are properly registered in server.js before the server starts listening.

2. **Check for route order issues:**
   Ensure middleware is registered before routes.

3. **Verify controller implementation:**
   Check that the marketplace controller properly implements the UPC lookup endpoint.

4. **Test with a simplified endpoint:**
   Use the browser-based test page at `/public/simple-test.html` to test the API.

### 3. CORS Issues

#### Symptoms:
- API works when tested directly but fails when called from the frontend
- Browser console shows CORS errors

#### Troubleshooting Steps:

1. **Verify CORS middleware:**
   Ensure the CORS middleware is properly configured in server.js:
   ```javascript
   app.use(cors());
   ```

2. **Check for specific CORS configuration:**
   If needed, configure CORS with specific options:
   ```javascript
   app.use(cors({
     origin: 'http://localhost:3000',
     methods: ['GET', 'POST'],
     allowedHeaders: ['Content-Type', 'Authorization']
   }));
   ```

3. **Test with browser extensions:**
   Temporarily disable CORS in the browser for testing (not for production).

### 4. Database Connection Issues

#### Symptoms:
- Server starts but database operations fail
- Error messages related to MongoDB connection

#### Troubleshooting Steps:

1. **Check MongoDB connection string:**
   Verify the connection string in db.config.js.

2. **Test MongoDB connection:**
   Run a simple script to test the connection:
   ```javascript
   const mongoose = require('mongoose');
   mongoose.connect('your_connection_string')
     .then(() => console.log('Connected to MongoDB'))
     .catch(err => console.error('MongoDB connection error:', err));
   ```

3. **Verify MongoDB service:**
   Ensure MongoDB is running:
   ```powershell
   sc query MongoDB
   ```

### 5. Silent Failures

#### Symptoms:
- Server appears to start but doesn't respond
- No error messages

#### Troubleshooting Steps:

1. **Enable detailed logging:**
   Add more console.log statements to track execution flow.

2. **Check for unhandled promise rejections:**
   Add a global handler:
   ```javascript
   process.on('unhandledRejection', (reason, promise) => {
     console.error('Unhandled Rejection at:', promise, 'reason:', reason);
   });
   ```

3. **Use the batch file to capture output:**
   Run the server using start-server.bat to capture output to a log file.

## Testing the UPC Lookup API

1. **Using curl:**
   ```powershell
   curl -X GET http://localhost:3002/api/marketplace/upc/123456789
   ```

2. **Using the browser test page:**
   Open http://localhost:3002/simple-test.html in your browser.

3. **Using a dedicated test script:**
   ```powershell
   node verify-upc-api.js
   ```

## Server Management Scripts

### PowerShell Script (manage-server.ps1)

This script provides comprehensive management for the UPC lookup server:
- Starting and stopping the server
- Checking server status
- Running diagnostics
- Identifying and resolving port conflicts

### Batch File (start-server.bat)

A simple batch file for starting the server with output logging:
- Automatically terminates any processes using port 3002
- Starts the server with output redirected to a log file

## Simplified Server Options

If the main server.js is having issues, try these alternatives:

1. **simplified-server.js:**
   A streamlined version of the main server with only essential components.

2. **ultra-minimal-server.js:**
   The most basic server implementation with just the UPC lookup endpoint.

3. **test-api-only.js:**
   A script that tests the API functionality without starting a full server.

## Deployment Considerations

When deploying to production:

1. **Set environment variables:**
   ```
   NODE_ENV=production
   PORT=3002
   ```

2. **Use a process manager:**
   Consider using PM2 to keep the server running:
   ```
   npm install -g pm2
   pm2 start server.js --name "upc-lookup-server"
   ```

3. **Configure proper error handling:**
   Ensure all errors are logged but not exposed to clients.

4. **Set up monitoring:**
   Implement health checks and monitoring to detect issues early.

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Connection Issues](https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/)
- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
