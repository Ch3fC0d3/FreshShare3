/**
 * Ultra-minimal test server to verify port 3002 is accessible
 */
const http = require('http');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Test server is running on port 3002');
});

// Start the server with detailed error handling
const PORT = 3002;

server.on('error', (error) => {
  console.error('Server error occurred:');
  console.error(error);
  
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please free the port and try again.`);
  }
});

server.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Try accessing http://localhost:${PORT} in your browser`);
});
