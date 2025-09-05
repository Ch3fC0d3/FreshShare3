/**
 * Local development authentication override
 * This file ensures all API requests go to the local server
 */

// Store the original fetch function
const originalFetch = window.fetch;

// Override the fetch function to redirect API requests to the local server
window.fetch = function(url, options) {
  // Check if this is an API request
  if (typeof url === 'string' && url.includes('/api/')) {
    // If the URL is absolute (starts with http or https), replace the domain with localhost
    if (url.startsWith('http')) {
      const urlObj = new URL(url);
      urlObj.host = 'localhost:3002';
      urlObj.protocol = 'http:';
      url = urlObj.toString();
    } else {
      // If the URL is relative, ensure it's pointing to the local server
      // This is already handled correctly with relative URLs
    }
    
    console.log('Local development: Redirecting API request to local server:', url);
  }
  
  // Call the original fetch with the potentially modified URL
  return originalFetch.call(this, url, options);
};

console.log('Local development: API requests will be redirected to the local server');
