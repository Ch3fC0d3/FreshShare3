// Check if user is authenticated
function isAuthenticated() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return token && user;
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// Fetch user profile
async function fetchUserProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No token found');
        }

        const response = await fetch('/api/auth/profile', {
            method: 'GET',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
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
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No token found');
        }

        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
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
        
        // Update user in localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        
        return data;
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
}
