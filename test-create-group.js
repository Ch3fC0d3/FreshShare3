const http = require('http');

const data = JSON.stringify({
  name: 'Test Group',
  description: 'This is a test group',
  category: 'neighborhood',
  location: {
    street: '123 Main St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345'
  },
  rules: 'Be nice',
  isPrivate: false,
  deliveryDays: ['monday', 'wednesday']
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/groups',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response data:', responseData);
    try {
      const parsedData = JSON.parse(responseData);
      console.log('Parsed data:', parsedData);
    } catch (e) {
      console.error('Error parsing response:', e);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
