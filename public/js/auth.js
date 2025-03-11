// Check if user is authenticated
function isAuthenticated() {
    // Check for token in cookies
    return document.cookie.includes('token');
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
    if (isAuthenticated()) {
        window.location.href = '/dashboard';
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
