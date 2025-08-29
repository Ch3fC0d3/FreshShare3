/**
 * Token Synchronization Script
 * This script ensures that authentication tokens are properly synchronized
 * between localStorage and cookies
 */

(function() {
    console.log('Token synchronization script running...');
    
    // Function to get cookie by name
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }
    
    // Function to set cookie
    function setCookie(name, value, days) {
        let expires = '';
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = `; expires=${date.toUTCString()}`;
        }
        document.cookie = `${name}=${value}${expires}; path=/`;
    }
    
    // Get token from localStorage
    const localToken = localStorage.getItem('token');
    
    // Get token from cookie
    const cookieToken = getCookie('token');
    
    console.log('Token status:', {
        hasLocalToken: !!localToken,
        hasCookieToken: !!cookieToken
    });
    
    // If token exists in localStorage but not in cookie, make a request to set the cookie
    if (localToken && !cookieToken) {
        console.log('Token exists in localStorage but not in cookie. Setting cookie via API...');
        
        // Make a request to the server to set the cookie
        // Use window.location.origin to ensure we're using the correct domain
        console.log('Attempting to sync token with URL:', window.location.origin + '/api/auth/sync-token');
        
        fetch(window.location.origin + '/api/auth/sync-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localToken}`
            },
            credentials: 'same-origin', // Include cookies in the request
            body: JSON.stringify({ token: localToken })
        })
        .then(response => {
            if (response.ok) {
                console.log('Token cookie set successfully via API');
                // Reload the page to ensure the cookie is used
                window.location.reload();
            } else {
                console.error('Failed to set token cookie via API');
            }
        })
        .catch(error => {
            console.error('Error setting token cookie via API:', error);
        });
    }
    
    // If token exists in cookie but not in localStorage, set it in localStorage
    if (cookieToken && !localToken) {
        console.log('Token exists in cookie but not in localStorage. Setting in localStorage...');
        localStorage.setItem('token', cookieToken);
    }
})();
