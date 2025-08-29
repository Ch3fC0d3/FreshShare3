// Synchronize token between cookies and localStorage
function synchronizeToken() {
    // Check if token exists in cookies but not in localStorage
    if (document.cookie.includes('token') && !localStorage.getItem('token')) {
        // Extract token from cookies
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith('token=')) {
                const token = cookie.substring('token='.length);
                // Store in localStorage
                localStorage.setItem('token', token);
                console.log('Token synchronized from cookies to localStorage');
                break;
            }
        }
    }
    // Check if token exists in localStorage but not in cookies
    else if (!document.cookie.includes('token') && localStorage.getItem('token')) {
        // We can't set httpOnly cookies from JavaScript, but we can redirect to a server endpoint
        // that would set the cookie. For now, we'll just log this situation.
        console.log('Token exists in localStorage but not in cookies');
    }
}

// Check if user is authenticated
function isAuthenticated() {
    // Synchronize token first
    synchronizeToken();
    
    // Check for token in cookies or localStorage
    const hasTokenInCookie = document.cookie.includes('token');
    const hasTokenInLocalStorage = !!localStorage.getItem('token');
    
    // If we have no token in either place, user is definitely not authenticated
    if (!hasTokenInCookie && !hasTokenInLocalStorage) {
        console.log('No authentication token found');
        return false;
    }
    
    // If we have a token, we'll consider the user authenticated for client-side purposes
    // The server will validate the token properly and redirect if needed
    console.log('Authentication token found, considering user authenticated');
    return true;
}

// Redirect to login if not authenticated
function requireAuth(redirectUrl) {
    if (!isAuthenticated()) {
        window.location.href = redirectUrl ? 
            `/login?redirect=${encodeURIComponent(redirectUrl)}` : 
            '/login';
        return false;
    }
    return true;
}

// Redirect to dashboard if already authenticated
function redirectIfAuthenticated() {
    // Only redirect if we're confident the user is authenticated
    if (isAuthenticated()) {
        // Add a timestamp to prevent infinite redirects
        const timestamp = new Date().getTime();
        const redirectUrl = `/dashboard?t=${timestamp}`;
        console.log('User authenticated, redirecting to dashboard');
        window.location.href = redirectUrl;
        return true;
    }
    return false;
}

// Handle logout
function logout() {
    // Clear token cookie by making a request to the logout endpoint
    fetch('/logout', {
        method: 'GET',
        credentials: 'same-origin'
    }).then(() => {
        window.location.href = '/login';
    }).catch(error => {
        console.error('Logout error:', error);
        // Fallback: redirect anyway
        window.location.href = '/login';
    });
}

// Fetch user profile
async function fetchUserProfile() {
    try {
        const response = await fetch('/api/auth/profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin' // Include cookies in the request
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Token is invalid or expired
                logout();
                throw new Error('Session expired. Please login again.');
            }
            throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error('Error fetching profile:', error);
        throw error;
    }
}

// Update user profile
async function updateUserProfile(profileData) {
    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin', // Include cookies in the request
            body: JSON.stringify(profileData)
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Token is invalid or expired
                logout();
                throw new Error('Session expired. Please login again.');
            }
            
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update profile');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
}
