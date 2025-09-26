(function(){
  'use strict';
  document.addEventListener('DOMContentLoaded', function(){
    try { localStorage.setItem('orderJustPlaced','1'); } catch(_) {}
    var btn = document.getElementById('printReceiptBtn');
    if (btn) btn.addEventListener('click', function(e){ e.preventDefault(); try { window.print(); } catch(_) {} });
  });
})();
