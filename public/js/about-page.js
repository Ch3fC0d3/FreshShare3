// public/js/about-page.js
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    try {
      function animateOnScroll(){
        const elements = document.querySelectorAll('.value-card, .team-member, .founder-content, .mission-content');
        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          const isVisible = rect.top <= window.innerHeight * 0.8;
          if (isVisible){
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          }
        });
      }
      const elementsToAnimate = document.querySelectorAll('.value-card, .team-member, .founder-content, .mission-content');
      elementsToAnimate.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      });
      setTimeout(animateOnScroll, 300);
      window.addEventListener('scroll', animateOnScroll);
    } catch (e){ try { console.error('about-page init error', e); } catch(_) {} }
  });
})();
