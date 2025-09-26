// public/js/groupbuy-init.js
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    function getAuthHeaders(){
      try {
        const t = localStorage.getItem('token') || localStorage.getItem('authToken');
        return t ? { 'Authorization': `Bearer ${t}` } : {};
      } catch(_) { return {}; }
    }
    async function fetchJson(url, opts = {}){
      try {
        const merged = Object.assign({}, opts);
        merged.headers = Object.assign({}, (opts && opts.headers) || {}, getAuthHeaders());
        const res = await fetch(url, merged);
        let data = null;
        try { data = await res.json(); } catch(_) {}
        return { ok: res.ok, status: res.status, data };
      } catch(e){ return { ok:false, status:0, data:{ message:'Network error' } }; }
    }
    function clampNumber(n, min, max){
      let v = Number(n);
      if (Number.isNaN(v)) v = 0;
      if (min !== undefined) v = Math.max(min, v);
      if (max !== undefined) v = Math.min(max, v);
      return v;
    }

    async function initQuickGB(container){
      try {
        if (!container) return;
        const id = container.dataset.listingId;
        if (!id) return;
        const statusEl = container.querySelector('.quick-gb-status');
        const qtyEl = container.querySelector('.quick-gb-qty');
        const cancelBtn = container.querySelector('.quick-gb-cancel');
        if (statusEl) statusEl.textContent = 'Loading...';
        const st = await fetchJson(`/api/marketplace/${id}/groupbuy/status`);
        if (st.status === 401) { return; }
        if (!st.ok || !st.data || !st.data.data){
          if (statusEl) statusEl.textContent = 'Group Buy unavailable.';
          if (qtyEl) { qtyEl.disabled = true; }
          if (cancelBtn) cancelBtn.style.display = 'none';
          return;
        }
        const s = st.data.data || {};
        const committed = Number(s.committedCases || 0);
        const target = Number(s.targetCases || 0);
        const userCommit = Number(s.userCommit || 0);
        const deadline = s.deadline ? new Date(s.deadline) : null;
        const pieces = Number(s.caseSize || 0);
        const bits = [];
        bits.push(`Committed: ${committed}${target ? ' / ' + target : ''} cases`);
        if (typeof pieces === 'number' && pieces > 0) bits.push(`Case size: ${pieces}`);
        if (deadline) bits.push(`Deadline: ${deadline.toLocaleString()}`);
        if (userCommit > 0) bits.push(`Your commitment: ${userCommit} case${userCommit === 1 ? '' : 's'}`);
        if (statusEl) statusEl.textContent = bits.join(' • ');
        // Update progress UI if present
        try {
          const prog = container.querySelector('.quick-gb-progress');
          const progText = container.querySelector('.quick-gb-progress-text');
          const pct = (target && target > 0) ? Math.max(0, Math.min(100, Math.round((committed / target) * 100))) : 0;
          if (prog){ prog.style.width = pct + '%'; prog.setAttribute('aria-valuenow', String(pct)); }
          if (progText){ progText.textContent = target > 0 ? `${committed} / ${target} cases (${pct}%)` : `${committed} cases committed`; }
        } catch(_) {}
        if (qtyEl){ qtyEl.disabled = false; qtyEl.min = '1'; if (!qtyEl.value) qtyEl.value = '1'; }
        if (cancelBtn) cancelBtn.style.display = userCommit > 0 ? '' : 'none';
      } catch(_) {}
    }

    // Initialize quick-gb on page load
    document.querySelectorAll('.quick-gb[data-listing-id]').forEach(initQuickGB);

    // Delegate events for quick-gb controls
    document.addEventListener('click', async (e) => {
      const commit = e.target && e.target.closest && e.target.closest('.quick-gb-commit');
      const cancel = e.target && e.target.closest && e.target.closest('.quick-gb-cancel');
      if (commit || cancel){
        try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
        const wrapper = (commit||cancel).closest('.quick-gb');
        if (!wrapper) return;
        const id = wrapper.dataset.listingId;
        if (commit){
          const qtyEl = wrapper.querySelector('.quick-gb-qty');
          const n = clampNumber(qtyEl && qtyEl.value, 1, Number.MAX_SAFE_INTEGER);
          const btnEl = commit;
          const prev = btnEl.textContent;
          if (btnEl.dataset && btnEl.dataset.loading === '1') return;
          btnEl.dataset.loading = '1';
          const prevPe = btnEl.style.pointerEvents, prevOp = btnEl.style.opacity;
          btnEl.disabled = true; btnEl.textContent = 'Saving…'; btnEl.setAttribute('aria-busy','true');
          btnEl.style.pointerEvents = 'none'; btnEl.style.opacity = '0.6';
          const res = await fetchJson(`/api/marketplace/${id}/groupbuy/commit`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ cases: n }) });
          if (res.status === 401) { window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`; return; }
          if (!res.ok){
            const err = (res && res.data && res.data.message) || 'Failed to commit';
            if (typeof window !== 'undefined' && typeof window.showToast === 'function') try{ window.showToast(err); }catch(_){ }
          } else {
            if (typeof window !== 'undefined' && typeof window.showToast === 'function') try{ window.showToast('Committed to group buy'); }catch(_){ }
            initQuickGB(wrapper);
          }
          btnEl.dataset.loading = '';
          btnEl.disabled = false; btnEl.textContent = prev || 'Commit'; btnEl.removeAttribute('aria-busy');
          btnEl.style.pointerEvents = prevPe || ''; btnEl.style.opacity = prevOp || '';
        }
        if (cancel){
          const btnEl = cancel;
          const prev = btnEl.textContent;
          if (btnEl.dataset && btnEl.dataset.loading === '1') return;
          btnEl.dataset.loading = '1';
          const prevPe = btnEl.style.pointerEvents, prevOp = btnEl.style.opacity;
          btnEl.disabled = true; btnEl.textContent = 'Canceling…'; btnEl.setAttribute('aria-busy','true');
          btnEl.style.pointerEvents = 'none'; btnEl.style.opacity = '0.6';
          const res = await fetchJson(`/api/marketplace/${id}/groupbuy/commit`, { method:'DELETE' });
          if (res.status === 401) { window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`; return; }
          if (!res.ok){
            const err = (res && res.data && res.data.message) || 'Failed to cancel commitment';
            if (typeof window !== 'undefined' && typeof window.showToast === 'function') try{ window.showToast(err); }catch(_){ }
          } else {
            if (typeof window !== 'undefined' && typeof window.showToast === 'function') try{ window.showToast('Commitment canceled'); }catch(_){ }
            initQuickGB(wrapper);
          }
          btnEl.dataset.loading = '';
          btnEl.disabled = false; btnEl.textContent = prev || 'Cancel my commitment'; btnEl.removeAttribute('aria-busy');
          btnEl.style.pointerEvents = prevPe || ''; btnEl.style.opacity = prevOp || '';
        }
      }
    });

    document.addEventListener('input', (e) => {
      const qty = e.target && e.target.matches && e.target.matches('.quick-gb-qty') ? e.target : null;
      if (!qty) return;
      qty.value = String(clampNumber(qty.value, 1, Number.MAX_SAFE_INTEGER));
    });
  });
})();
