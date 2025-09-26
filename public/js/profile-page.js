// public/js/profile-page.js
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    try {
      console.log('Profile page loaded');
      const urlParams = new URLSearchParams(window.location.search);
      const errorMsg = urlParams.get('error');
      if (errorMsg){
        const errorContainer = document.createElement('div');
        errorContainer.className = 'alert alert-danger mt-3';
        errorContainer.textContent = decodeURIComponent(errorMsg);
        const root = document.querySelector('.profile-container');
        if (root) root.prepend(errorContainer);
      }

      function handleMissingData(){
        const username = document.querySelector('.text-muted')?.textContent;
        if (!username || username === '@'){
          console.error('Missing user data - authentication may have failed');
          window.location.href = '/login?redirect=/profile&error=' + encodeURIComponent('Please log in to view your profile');
          return;
        }
        const originalFetch = window.fetch;
        window.fetch = async function(url, options){
          try {
            const response = await originalFetch(url, options);
            if (response.status === 403){
              console.error('403 Forbidden error detected');
              const errorContainer = document.createElement('div');
              errorContainer.className = 'alert alert-danger mt-3';
              errorContainer.textContent = 'Authentication error: Your session may have expired. Please log in again.';
              const root = document.querySelector('.profile-container');
              if (root) root.prepend(errorContainer);
              setTimeout(() => {
                window.location.href = '/login?redirect=/profile&error=' + encodeURIComponent('Your session has expired. Please log in again.');
              }, 2000);
            }
            return response;
          } catch (error){
            console.error('Fetch error:', error);
            const errorContainer = document.createElement('div');
            errorContainer.className = 'alert alert-danger mt-3';
            errorContainer.textContent = 'Network error: Could not connect to the server. Please try again later.';
            const root = document.querySelector('.profile-container');
            if (root) root.prepend(errorContainer);
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
          }
        };
      }
      setTimeout(handleMissingData, 500);
    } catch (e){ try { console.error('profile-page init error', e); } catch(_) {} }
  });
})();
