// public/js/login-page.js
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    try {
      // Check if we should redirect to a specific page after login
      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = urlParams.get('redirect');
      const errorMsg = urlParams.get('error');

      // Display error message if present in URL
      if (errorMsg) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage){
          errorMessage.textContent = decodeURIComponent(errorMsg);
          errorMessage.classList.remove('d-none');
        }
      }

      // Disable automatic client-side redirects to prevent redirect loops
      console.log('Disabling automatic redirects to prevent login loops');

      // Leave existing tokens untouched; login-helper will overwrite on success

      // Form submission is handled by login-helper.js
    } catch (e) {
      try { console.error('login-page init error', e); } catch(_) {}
    }
  });
})();
