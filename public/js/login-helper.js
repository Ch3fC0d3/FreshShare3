/**
 * Login Helper Script
 * This script helps ensure proper authentication by setting both localStorage and cookies
 */

(function() {
    // Wait for the login form to be available
    document.addEventListener('DOMContentLoaded', function() {
        const loginForm = document.getElementById('loginForm');
        
        if (loginForm) {
            console.log('Login helper script attached to login form');
            
            // Override the default form submission
            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const errorMessage = document.getElementById('errorMessage');
                
                try {
                    // Show loading state
                    const submitBtn = this.querySelector('button[type="submit"]');
                    const originalBtnText = submitBtn.innerHTML;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
                    submitBtn.disabled = true;
                    
                    console.log('Sending login request...');
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify({ username, password })
                    });
                    
                    console.log('Login response status:', response.status);
                    const data = await response.json();
                    console.log('Login response data:', data);
                    
                    if (response.ok) {
                        // Store token in localStorage
                        if (data.token) {
                            localStorage.setItem('token', data.token);
                            console.log('Token stored in localStorage');
                            
                            // Check if "Remember me" is checked
                            const rememberMe = document.getElementById('rememberMe').checked;
                            
                            // Set token expiration based on "Remember me" option
                            const maxAge = rememberMe ? (30 * 24 * 60 * 60) : (7 * 24 * 60 * 60); // 30 days : 7 days
                            
                            // Also set as a cookie (as a fallback, the server should already set it)
                            document.cookie = `token=${data.token}; path=/; max-age=${maxAge}; SameSite=Lax`;
                            console.log(`Token stored as a cookie with ${rememberMe ? '30-day' : '7-day'} expiration`);
                            
                            // Store the remember me preference
                            localStorage.setItem('rememberMe', rememberMe);
                        }
                        
                        // Show success message
                        errorMessage.textContent = 'Login successful! Redirecting...';
                        errorMessage.className = 'alert alert-success mb-4';
                        errorMessage.classList.remove('d-none');
                        
                        // Get redirect URL from query parameters
                        const urlParams = new URLSearchParams(window.location.search);
                        const redirectUrl = urlParams.get('redirect');
                        
                        // Redirect to dashboard or the redirect URL
                        console.log('Login successful, redirecting to:', redirectUrl || '/dashboard');
                        setTimeout(() => {
                            window.location.href = redirectUrl || '/dashboard';
                        }, 1000);
                    } else {
                        // Show error message
                        errorMessage.textContent = data.message || 'Login failed. Please check your credentials.';
                        errorMessage.className = 'alert alert-danger mb-4';
                        errorMessage.classList.remove('d-none');
                        
                        // Reset button
                        submitBtn.innerHTML = originalBtnText;
                        submitBtn.disabled = false;
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    errorMessage.textContent = 'An error occurred during login. Please try again.';
                    errorMessage.className = 'alert alert-danger mb-4';
                    errorMessage.classList.remove('d-none');
                    
                    // Reset button
                    const submitBtn = this.querySelector('button[type="submit"]');
                    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Login';
                    submitBtn.disabled = false;
                }
            });
        }
    });
})();
