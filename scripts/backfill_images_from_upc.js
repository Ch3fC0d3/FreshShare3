/**
 * Backfill listing images using UPC lookups.
 * Priority: Open Food Facts (free) -> UPCitemdb (if API key present)
 * Only updates listings with missing/empty images and a specified upcCode.
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const db = require('../models');
const dbConfig = require('../config/db.config');

const MONGODB_URI = process.env.MONGODB_URI || `mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`;
const MONGO_OPTS = dbConfig.options || {};

// Paid UPC APIs are disabled by policy
// const UPCITEMDB_KEY = process.env.UPCITEMDB_KEY || process.env.UPCITEMDB_API_KEY || '';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function httpGetJson(url, { headers = {}, timeoutMs = 5000 } = {}) {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    const status = res.status;
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_) {}
    return { ok: res.ok, status, data: json };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  } finally {
    clearTimeout(to);
  }
}

async function tryOpenFoodFacts(code) {
  const url = `https://world.openfoodfacts.org/api/v0/product/${code}.json`;
  const resp = await httpGetJson(url, { headers: { 'Accept': 'application/json' }, timeoutMs: 6000 });
  const d = resp && resp.data;
  if (!d || !d.product || d.status !== 1) return null;
  const p = d.product;
  const imageUrl = p.image_url
    || (p.selected_images && p.selected_images.front && p.selected_images.front.display && (p.selected_images.front.display.en || p.selected_images.front.display.en_GB))
    || p.image_small_url
    || null;
  if (imageUrl && /^https?:\/\//i.test(imageUrl)) return { source: 'openfoodfacts', imageUrl };
  return null;
}

// Disabled: UPCitemdb (paid) is not used
async function tryUpcItemDb(code) { return null; }

function normalizeUpc(input) {
  const raw = String(input || '').replace(/\D/g, '');
  if (!raw) return [];
  const out = new Set();
  out.add(raw);
  if (raw.length === 12) out.add('0' + raw);
  if (raw.length === 13 && raw.startsWith('0')) out.add(raw.substring(1));
  return Array.from(out);
}

async function findImageForUpc(upc) {
  const variants = normalizeUpc(upc);
  for (const code of variants) {
    const off = await tryOpenFoodFacts(code);
    if (off) return off;
    await sleep(120);
  }
  return null;
}

async function tryOpenFoodFactsByName(name) {
  try {
    const q = encodeURIComponent(String(name || '').trim());
    if (!q) return null;
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=1`;
    const resp = await httpGetJson(url, { headers: { 'Accept': 'application/json' }, timeoutMs: 6000 });
    const d = resp && resp.data;
    const prod = d && Array.isArray(d.products) && d.products[0];
    if (!prod) return null;
    const imageUrl = prod.image_url
      || (prod.selected_images && prod.selected_images.front && prod.selected_images.front.display && (prod.selected_images.front.display.en || prod.selected_images.front.display.en_GB))
      || prod.image_small_url
      || null;
    if (imageUrl && /^https?:\/\//i.test(imageUrl)) return { source: 'openfoodfacts-search', imageUrl };
    return null;
  } catch (_) { return null; }
}

// Disabled: UPCitemdb search (paid) is not used
async function tryUpcItemDbSearch(name) { return null; }

async function findImageForTitle(title) {
  const off = await tryOpenFoodFactsByName(title);
  if (off) return off;
  return null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { limit: 50, force: false, overwriteMissingFile: false };
  for (const a of args) {
    if (a.startsWith('--limit=')) out.limit = parseInt(a.split('=')[1], 10) || 50;
    if (a === '--force') out.force = true;
    if (a === '--overwrite-missing-file') out.overwriteMissingFile = true;
  }
  return out;
}

function stripPublicPrefix(p) {
  const s = String(p || '').replace(/\\/g, '/');
  const i = s.indexOf('public/');
  return i >= 0 ? s.slice(i + 'public/'.length) : s.replace(/^\//, '');
}

function localFileExists(imgPath) {
  try {
    const rel = stripPublicPrefix(imgPath);
    const full = path.join(__dirname, '..', 'public', rel);
    return fs.existsSync(full);
  } catch (_) { return false; }
}

function hasUsableImage(listing) {
  const imgs = Array.isArray(listing.images) ? listing.images : [];
  const first = imgs.find(x => x && String(x).trim() !== '');
  if (!first) return false;
  const s = String(first).trim();
  if (/^https?:\/\//i.test(s)) return true;
  return localFileExists(s);
}

async function main() {
  const { limit, force, overwriteMissingFile } = parseArgs();

  console.log('[Backfill] Connecting to Mongo:', MONGODB_URI);
  await db.mongoose.connect(MONGODB_URI, MONGO_OPTS);
  const Listing = db.listing;

  // Base candidate set: include a wider set so flags work (force/overwrite)
  const base = await Listing.find({})
    .select('_id upcCode images title')
    .limit(Math.max(limit * 10, limit));

  const items = base.filter(lst => {
    if (force) return true;
    const usable = hasUsableImage(lst);
    if (!usable) return true; // no image or invalid path
    if (overwriteMissingFile) {
      const imgs = Array.isArray(lst.images) ? lst.images : [];
      const first = imgs.find(x => x && String(x).trim() !== '');
      if (!first) return true; // empty value -> treat as missing
      const isHttp = /^https?:\/\//i.test(String(first));
      if (isHttp) return false; // remote URLs considered fine unless forcing
      return !localFileExists(first); // local path but file missing
    }
    return false;
  }).slice(0, limit);

  console.log(`[Backfill] Candidates: base=${base.length}, selected=${items.length} (limit ${limit}). flags: force=${force}, overwriteMissingFile=${overwriteMissingFile}`);

  let updated = 0, skipped = 0;
  for (const lst of items) {
    const id = String(lst._id);
    const upc = lst.upcCode;
    const title = lst.title || '';
    console.log(`[Backfill] Looking up image for ${id} UPC=${upc || 'N/A'} TITLE="${title}"`);
    try {
      let hit = null;
      if (upc) {
        hit = await findImageForUpc(upc);
      }
      if (!hit && title) {
        hit = await findImageForTitle(title);
      }
      if (!hit) {
        console.log(`[Backfill] No image found for ${id}`);
        skipped++;
        continue;
      }
      await Listing.updateOne({ _id: lst._id }, { $set: { images: [hit.imageUrl] } });
      console.log(`[Backfill] Set image for ${id} from ${hit.source}`);
      updated++;
      await sleep(200);
    } catch (e) {
      console.warn(`[Backfill] Error for ${id}:`, e && e.message);
    }
  }

  console.log(`[Backfill] Done. Updated ${updated}, skipped ${skipped}.`);
  await db.mongoose.disconnect();
}

main().catch(err => {
  console.error('[Backfill] Fatal error:', err);
  process.exit(1);
});
