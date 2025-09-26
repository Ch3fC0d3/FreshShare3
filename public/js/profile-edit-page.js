// public/js/profile-edit-page.js
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    try {
      const profileForm = document.getElementById('profileForm');
      const errorMessage = document.getElementById('errorMessage');
      const successMessage = document.getElementById('successMessage');
      const profileImageInput = document.getElementById('profileImage');
      const profileImagePreview = document.getElementById('profileImagePreview');

      // Check if user is logged in
      let token = '';
      try { token = localStorage.getItem('token') || ''; } catch(_) { token = ''; }
      if (!token) {
        window.location.href = '/login?redirect=/profile-edit';
        return;
      }

      // Load user profile data
      loadUserProfile();

      // Handle profile image change
      if (profileImageInput && profileImagePreview) {
        profileImageInput.addEventListener('change', function(e){
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = function(ev){ profileImagePreview.src = ev.target.result; };
            reader.readAsDataURL(file);
          }
        });
      }

      // Handle form submission
      if (profileForm) {
        profileForm.addEventListener('submit', async function(e){
          e.preventDefault();
          // Hide previous messages
          if (errorMessage) errorMessage.classList.add('d-none');
          if (successMessage) successMessage.classList.add('d-none');

          const username = document.getElementById('username').value;
          const email = document.getElementById('email').value;
          const phoneNumber = document.getElementById('phoneNumber').value;
          const street = document.getElementById('street').value;
          const city = document.getElementById('city').value;
          const state = document.getElementById('state').value;
          const zipCode = document.getElementById('zipCode').value;

          try {
            const response = await fetch('/api/auth/profile', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': token
              },
              body: JSON.stringify({ username, email, phoneNumber, street, city, state, zipCode })
            });
            const data = await response.json();
            if (response.ok) {
              try { localStorage.setItem('user', JSON.stringify(data.user)); } catch(_) {}
              if (successMessage){ successMessage.textContent = 'Profile updated successfully!'; successMessage.classList.remove('d-none'); }
              try { window.scrollTo(0, 0); } catch(_) {}
            } else {
              if (errorMessage){ errorMessage.textContent = (data && data.message) || 'An error occurred while updating profile.'; errorMessage.classList.remove('d-none'); }
            }
          } catch (error){
            console.error('Error updating profile:', error);
            if (errorMessage){ errorMessage.textContent = 'An error occurred while updating profile. Please try again.'; errorMessage.classList.remove('d-none'); }
          }
        });
      }

      async function loadUserProfile(){
        try {
          const response = await fetch('/api/auth/profile', { method: 'GET', headers: { 'Authorization': token } });
          if (response.ok) {
            const data = await response.json();
            const user = data.user || {};
            const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
            setVal('username', user.username);
            setVal('email', user.email);
            setVal('phoneNumber', user.phoneNumber);
            setVal('street', user.street);
            setVal('city', user.city);
            setVal('state', user.state);
            setVal('zipCode', user.zipCode);
            if (user.profileImage && profileImagePreview){ profileImagePreview.src = user.profileImage; }
          } else {
            if (response.status === 401 || response.status === 403) {
              try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch(_) {}
              window.location.href = '/login?redirect=/profile-edit';
            } else {
              const data = await response.json();
              if (errorMessage){ errorMessage.textContent = (data && data.message) || 'Failed to load profile data.'; errorMessage.classList.remove('d-none'); }
            }
          }
        } catch (error){
          console.error('Error loading profile:', error);
          if (errorMessage){ errorMessage.textContent = 'An error occurred while loading profile data.'; errorMessage.classList.remove('d-none'); }
        }
      }
    } catch (e){ try { console.error('profile-edit-page init error', e); } catch(_) {} }
  });
})();
