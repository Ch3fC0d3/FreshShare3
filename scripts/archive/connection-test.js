/**
 * Connection test utility for FreshShare
 * This file helps diagnose API connection issues
 */

// Check which port the API is running on
async function checkApiConnections() {
  const portsToCheck = [3001, 3002, 3003];
  const resultsContainer = document.getElementById('connection-results') || document.createElement('div');
  
  if (!document.body.contains(resultsContainer)) {
    resultsContainer.id = 'connection-results';
    resultsContainer.style.padding = '10px';
    resultsContainer.style.margin = '10px 0';
    resultsContainer.style.border = '1px solid #ccc';
    document.body.appendChild(resultsContainer);
  }
  
  resultsContainer.innerHTML = '<h3>Testing API connections...</h3>';
  let results = '';
  
  for (const port of portsToCheck) {
    try {
      const startTime = Date.now();
      const response = await fetch(`http://localhost:${port}/api/test`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(2000)
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        results += `
          <div style="color: green; margin-bottom: 10px;">
            ✓ Port ${port}: Connection successful (${responseTime}ms)
            <br>Response: ${JSON.stringify(data)}
          </div>
        `;
        console.log(`API connection to port ${port} successful:`, data);
      } else {
        results += `
          <div style="color: orange; margin-bottom: 10px;">
            ⚠ Port ${port}: Server responded with status ${response.status}
          </div>
        `;
        console.warn(`API on port ${port} responded with status ${response.status}`);
      }
    } catch (error) {
      results += `
        <div style="color: red; margin-bottom: 10px;">
          ✗ Port ${port}: Connection failed - ${error.message}
        </div>
      `;
      console.error(`API connection to port ${port} failed:`, error);
    }
  }
  
  resultsContainer.innerHTML = `
    <h3>API Connection Results</h3>
    ${results}
    <button onclick="checkApiConnections()" style="padding: 5px 10px;">Test Again</button>
  `;
}

// Execute the connection test when the script loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('Connection test script loaded, running tests...');
  checkApiConnections();
});
