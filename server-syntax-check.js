// Script to check for syntax errors in server.js
const fs = require('fs');
const path = require('path');

// Path to server.js
const serverPath = path.join(__dirname, 'server.js');

// Read the server.js file
try {
  console.log('Reading server.js...');
  const serverCode = fs.readFileSync(serverPath, 'utf8');
  console.log('Successfully read server.js');
  
  // Try to parse the code (this will catch syntax errors)
  console.log('Checking for syntax errors...');
  try {
    // Use Function constructor to check syntax without executing the code
    new Function(serverCode);
    console.log('No syntax errors found in server.js');
  } catch (syntaxError) {
    console.error('SYNTAX ERROR in server.js:');
    console.error(syntaxError.message);
    
    // Try to identify the line number
    const match = syntaxError.stack.match(/at new Function \(<anonymous>:(\d+):(\d+)\)/);
    if (match) {
      const lineNumber = parseInt(match[1], 10);
      const columnNumber = parseInt(match[2], 10);
      console.error(`Error at line ${lineNumber}, column ${columnNumber}`);
      
      // Show the problematic code
      const lines = serverCode.split('\n');
      const startLine = Math.max(1, lineNumber - 5);
      const endLine = Math.min(lines.length, lineNumber + 5);
      
      console.log('\nCode context:');
      for (let i = startLine; i <= endLine; i++) {
        const indicator = i === lineNumber ? '>>> ' : '    ';
        console.log(`${indicator}${i}: ${lines[i-1]}`);
      }
    }
  }
  
  // Check for common issues
  console.log('\nChecking for common issues...');
  
  // Check for duplicate route declarations
  const routeRegex = /app\.(?:get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
  const routes = [];
  let match;
  
  while ((match = routeRegex.exec(serverCode)) !== null) {
    routes.push(match[1]);
  }
  
  // Find duplicates
  const routeCounts = {};
  routes.forEach(route => {
    routeCounts[route] = (routeCounts[route] || 0) + 1;
  });
  
  const duplicateRoutes = Object.entries(routeCounts)
    .filter(([route, count]) => count > 1)
    .map(([route, count]) => `${route} (${count} times)`);
  
  if (duplicateRoutes.length > 0) {
    console.log('WARNING: Found duplicate route declarations:');
    duplicateRoutes.forEach(route => console.log(`- ${route}`));
  } else {
    console.log('No duplicate route declarations found');
  }
  
  // Check for middleware after routes
  const middlewareAfterRoutes = serverCode.match(/app\.use\([^)]+\).*app\.(get|post|put|delete)/s);
  if (middlewareAfterRoutes) {
    console.log('WARNING: Found middleware declarations after route handlers');
    console.log('Middleware should be declared before routes');
  } else {
    console.log('Middleware declarations appear to be in the correct order');
  }
  
  console.log('\nSyntax check completed');
  
} catch (error) {
  console.error('ERROR reading or processing server.js:');
  console.error(error.message);
}
