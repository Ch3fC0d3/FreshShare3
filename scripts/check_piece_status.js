const fetch = require('node-fetch');

(async () => {
  try {
    const base = 'http://localhost:3002';
    const r = await fetch(`${base}/api/marketplace?limit=10`);
    const j = await r.json();
    if (!j || !j.success) {
      console.log('Failed to load listings payload');
      process.exit(1);
    }
    const listings = (j.data && j.data.listings) || [];
    console.log(`Found ${listings.length} listings`);
    for (const l of listings) {
      try {
        const id = l._id;
        const stRes = await fetch(`${base}/api/marketplace/${id}/pieces/status`);
        const st = await stRes.json();
        console.log(`${id} | title=${l.title} | enabled=${st && st.data && st.data.enabled} | caseSize=${st && st.data && st.data.caseSize} | remaining=${st && st.data && st.data.currentCaseRemaining}`);
      } catch (e) {
        console.log(`Error status for ${l && l._id}:`, e && e.message);
      }
    }
  } catch (e) {
    console.error('Error:', e && e.message);
    process.exit(1);
  }
})();
