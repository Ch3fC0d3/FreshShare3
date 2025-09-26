// public/js/toast.js
// Lightweight global toast notifications. Usage: window.showToast('Message')
(function(){
  function ensureContainer(){
    let c = document.getElementById('toast-container');
    if (!c){
      c = document.createElement('div');
      c.id = 'toast-container';
      c.setAttribute('aria-live','polite');
      c.setAttribute('aria-atomic','true');
      c.style.position = 'fixed';
      c.style.left = '50%';
      c.style.bottom = '24px';
      c.style.transform = 'translateX(-50%)';
      c.style.zIndex = '2147483647';
      c.style.display = 'flex';
      c.style.flexDirection = 'column';
      c.style.alignItems = 'center';
      c.style.gap = '8px';
      document.body.appendChild(c);
    }
    return c;
  }
  function showToast(message, opts){
    try{
      const container = ensureContainer();
      const el = document.createElement('div');
      el.role = 'status';
      el.textContent = String(message || '');
      el.style.background = 'rgba(0,0,0,0.85)';
      el.style.color = '#fff';
      el.style.padding = '10px 14px';
      el.style.borderRadius = '6px';
      el.style.fontSize = '14px';
      el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
      el.style.maxWidth = '80vw';
      el.style.whiteSpace = 'pre-line';
      el.style.pointerEvents = 'auto';
      container.appendChild(el);
      const ttl = (opts && opts.ttl) || 2200;
      setTimeout(() => {
        try { el.style.transition = 'opacity 200ms ease'; el.style.opacity = '0'; } catch(_) {}
        setTimeout(() => { try { container.removeChild(el); } catch(_) {} }, 220);
      }, ttl);
    }catch(_){ /* no-op */ }
  }
  window.showToast = showToast;
})();
