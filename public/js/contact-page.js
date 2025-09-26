// public/js/contact-page.js
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    try {
      const form = document.getElementById('contactForm');
      if (form){
        form.addEventListener('submit', function(e){
          e.preventDefault();
          const submitButton = form.querySelector('button[type="submit"]');
          if (submitButton){
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Sending...';
            submitButton.disabled = true;
          }
          setTimeout(function(){
            const formCard = document.querySelector('.form-card');
            if (formCard) formCard.style.display = 'none';
            const conf = document.getElementById('confirmationMessage');
            if (conf) {
              conf.style.display = 'block';
              conf.scrollIntoView({ behavior: 'smooth' });
            }
          }, 1500);
        });
      }

      function animateOnScroll(){
        const elements = document.querySelectorAll('.info-card, .form-card, .social-section');
        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          const isVisible = rect.top <= window.innerHeight * 0.8;
          if (isVisible){
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          }
        });
      }
      const elementsToAnimate = document.querySelectorAll('.info-card, .form-card, .social-section');
      elementsToAnimate.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      });
      setTimeout(animateOnScroll, 300);
      window.addEventListener('scroll', animateOnScroll);
    } catch (e){ try { console.error('contact-page init error', e); } catch(_) {} }
  });
})();
