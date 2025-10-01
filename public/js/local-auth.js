/**
 * Local development authentication override
 * This file ensures all API requests go to the local server
 */

// Store the original fetch function
const originalFetch = window.fetch;

function getCookie(name) {
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
  } catch (err) {
    console.error('local-auth: failed to read cookie', err);
  }
  return null;
}

function normalizeAuthHeader(headers) {
  if (!headers) {
    return;
  }

  const cookieToken = getCookie('token');

  if (typeof headers.get === 'function' && typeof headers.set === 'function') {
    const existing = headers.get('Authorization') || headers.get('authorization');
    if (!existing) {
      return;
    }
    if (cookieToken) {
      headers.set('Authorization', `Bearer ${cookieToken}`);
    } else {
      headers.delete('Authorization');
    }
    return;
  }

  if (Array.isArray(headers)) {
    const index = headers.findIndex(([key]) => String(key).toLowerCase() === 'authorization');
    if (index === -1) {
      return;
    }
    if (cookieToken) {
      headers[index][1] = `Bearer ${cookieToken}`;
    } else {
      headers.splice(index, 1);
    }
    return;
  }

  const headerKeys = Object.keys(headers);
  const authKey = headerKeys.find(key => key.toLowerCase() === 'authorization');
  if (!authKey) {
    return;
  }

  if (cookieToken) {
    headers[authKey] = `Bearer ${cookieToken}`;
  } else {
    delete headers[authKey];
  }
}

// Override the fetch function to redirect API requests to the local server
window.fetch = function(url, options) {
  // Check if this is an API request
  if (typeof url === 'string' && url.includes('/api/')) {
    // Skip certain API calls on login page to avoid 401 errors
    const isLoginPage = window.location.pathname.includes('/login') || window.location.pathname.includes('/signup');
    const isCartRequest = url.includes('/api/marketplace/pieces/my');
    
    if (isLoginPage && isCartRequest) {
      console.log('Skipping cart API request on login page:', url);
      // Return a mock response for cart requests on login page
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: [] })
      });
    }
    
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
    
    // Special handling for login requests
    if (url.includes('/api/auth/login')) {
      console.log('LOGIN REQUEST DETECTED - Adding special logging');
      
      // Clone options to avoid modifying the original
      const newOptions = { ...options };
      
      // Wrap the original fetch to intercept the response
      return originalFetch.call(this, url, newOptions).then(response => {
        console.log('Login response status:', response.status);
        
        // Clone the response so we can read it multiple times
        return response.clone().text().then(text => {
          try {
            const data = JSON.parse(text);
            console.log('Login response data:', JSON.stringify(data, null, 2));
            if (data.token) {
              console.log('Server provided token (first 15 chars):', data.token.substring(0, 15) + '...');
            }
          } catch (e) {
            console.error('Failed to parse login response:', e);
          }
          return response;
        });
      });
    }
    
    if (options && options.headers) {
      normalizeAuthHeader(options.headers);
      const headerPreview = (() => {
        const token = getCookie('token');
        return token ? token.substring(0, 20) + '...' : '(cookie missing)';
      })();
      console.log('local-auth: normalized Authorization header to match cookie:', headerPreview);
    }
  }
  
  // Call the original fetch with the potentially modified URL
  return originalFetch.call(this, url, options);
};

console.log('Local development: API requests will be redirected to the local server');
