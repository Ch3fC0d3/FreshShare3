// public/js/index-page.js
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    try {
      console.log('FreshShare landing page loaded');

      // Lazy loading visuals for images already present in DOM
      const lazyImages = document.querySelectorAll('img.lazy-load');
      lazyImages.forEach(img => {
        if (img.parentNode && img.parentNode.classList) {
          img.parentNode.classList.add('image-loading');
        }
      });

      if ('IntersectionObserver' in window){
        const imageObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              img.classList.add('loaded');
              if (img.parentNode && img.parentNode.classList){
                img.parentNode.classList.remove('image-loading');
              }
              imageObserver.unobserve(img);
            }
          });
        });
        lazyImages.forEach(img => imageObserver.observe(img));
      } else {
        // Fallback when IntersectionObserver is unavailable
        lazyImages.forEach(img => {
          img.classList.add('loaded');
          if (img.parentNode && img.parentNode.classList){
            img.parentNode.classList.remove('image-loading');
          }
        });
      }

      // Animate elements on scroll
      function animateOnScroll(){
        const elements = document.querySelectorAll('.feature-card, .step-item');
        elements.forEach(element => {
          const position = element.getBoundingClientRect();
          if (position.top < window.innerHeight && position.bottom >= 0) {
            element.style.opacity = '1';
          }
        });
      }
      // Initial check and on-scroll binding
      animateOnScroll();
      window.addEventListener('scroll', animateOnScroll);
    } catch (e){
      try { console.error('index-page init error', e); } catch(_) {}
    }
  });
})();
