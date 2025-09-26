// public/js/verify-email-page.js
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    try {
      const resendEmailForm = document.getElementById('resendEmailForm');
      const submitResendBtn = document.getElementById('submitResendBtn');
      const resendSuccessAlert = document.getElementById('resendSuccessAlert');
      const resendErrorAlert = document.getElementById('resendErrorAlert');

      if (!submitResendBtn) return;
      submitResendBtn.addEventListener('click', async function(){
        const emailEl = document.getElementById('email');
        const email = emailEl ? emailEl.value : '';
        if (!email) return;
        try {
          if (resendSuccessAlert) resendSuccessAlert.classList.add('d-none');
          if (resendErrorAlert) resendErrorAlert.classList.add('d-none');
          submitResendBtn.disabled = true;
          submitResendBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
          const response = await fetch('/api/email/send-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await response.json().catch(() => ({}));
          if (data && data.success){
            if (resendSuccessAlert) resendSuccessAlert.classList.remove('d-none');
            if (emailEl) emailEl.value = '';
          } else {
            if (resendErrorAlert){
              resendErrorAlert.textContent = (data && data.message) || 'Failed to send verification email. Please try again.';
              resendErrorAlert.classList.remove('d-none');
            }
          }
        } catch (error){
          if (resendErrorAlert){
            resendErrorAlert.textContent = 'An error occurred. Please try again later.';
            resendErrorAlert.classList.remove('d-none');
          }
          try { console.error('Resend verification error:', error); } catch(_) {}
        } finally {
          submitResendBtn.disabled = false;
          submitResendBtn.innerHTML = 'Send';
        }
      });
    } catch (e){ try { console.error('verify-email-page init error', e); } catch(_) {} }
  });
})();
