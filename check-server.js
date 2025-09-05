/**
 * Simple script to check if the server is running on port 3002
 */
const http = require('http');

// Try to connect to the server
const req = http.request({
  hostname: 'localhost',
  port: 3002,
  path: '/',
  method: 'GET',
  timeout: 3000
}, (res) => {
  console.log(`Server is running on port 3002. Status code: ${res.statusCode}`);
  
  // Check if we can access the UPC test endpoint
  const upcReq = http.request({
    hostname: 'localhost',
    port: 3002,
    path: '/api/marketplace/upc-test/12345678901',
    method: 'GET',
    timeout: 3000
  }, (upcRes) => {
    console.log(`UPC test endpoint accessible. Status code: ${upcRes.statusCode}`);
    
    let data = '';
    upcRes.on('data', (chunk) => {
      data += chunk;
    });
    
    upcRes.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log('UPC test endpoint response:', JSON.stringify(jsonData, null, 2));
      } catch (e) {
        console.log('Response is not JSON:', data);
      }
    });
  });
  
  upcReq.on('error', (error) => {
    console.error(`Error accessing UPC test endpoint: ${error.message}`);
  });
  
  upcReq.end();
});

req.on('error', (error) => {
  console.error(`Server is not running on port 3002: ${error.message}`);
  console.log('Please start the server with: node server.js');
});

req.on('timeout', () => {
  console.error('Connection timed out. Server might be starting up or not responding.');
  req.destroy();
});

req.end();

console.log('Checking if server is running on port 3002...');
