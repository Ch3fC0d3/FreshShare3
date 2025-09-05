/**
 * Enhanced Server Startup Script
 * This script starts the server with detailed logging and error handling
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create log file streams
const date = new Date().toISOString().replace(/:/g, '-');
const serverLogPath = path.join(logsDir, `server-${date}.log`);
const serverLogStream = fs.createWriteStream(serverLogPath, { flags: 'a' });

console.log(`Starting server with logs at: ${serverLogPath}`);

// Start the server process
const serverProcess = spawn('node', ['server.js'], {
  stdio: ['ignore', 'pipe', 'pipe']
});

// Log process ID
console.log(`Server process started with PID: ${serverProcess.pid}`);

// Pipe stdout and stderr to both console and log file
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  serverLogStream.write(output);
});

serverProcess.stderr.on('data', (data) => {
  const output = data.toString();
  process.stderr.write(output);
  serverLogStream.write(`[ERROR] ${output}`);
});

// Handle process exit
serverProcess.on('exit', (code, signal) => {
  const exitMessage = `Server process exited with code ${code} and signal ${signal}`;
  console.log(exitMessage);
  serverLogStream.write(`${exitMessage}\n`);
  serverLogStream.end();
});

// Handle script termination
process.on('SIGINT', () => {
  console.log('Stopping server...');
  serverProcess.kill('SIGINT');
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

console.log('Server startup script is running. Press Ctrl+C to stop.');
