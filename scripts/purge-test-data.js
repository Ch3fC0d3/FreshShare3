#!/usr/bin/env node
/*
  Purge test/demo data from MongoDB
  Usage:
    node scripts/purge-test-data.js --dry-run --scope=A
    node scripts/purge-test-data.js --apply --scope=A

  Scope A (safe default): keep users/roles/groups; purge marketplace/order data
    - listings
    - quick orders
    - orders
    - messages
    - reviews
    - vendors
*/

const path = require('path');
const mongoose = require('mongoose');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: false, apply: false, scope: 'A', json: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--apply') opts.apply = true;
    else if (a.startsWith('--scope=')) opts.scope = a.split('=')[1].toUpperCase();
    else if (a === '--json') opts.json = true;
  }
  if (!opts.dryRun && !opts.apply) opts.dryRun = true; // default to dry-run
  return opts;
}

async function connect() {
  const dbConfig = require(path.join(__dirname, '..', 'config', 'db.config.js'));
  const envUri = process.env.MONGODB_URI && process.env.MONGODB_URI.trim();
  const mongoUri = envUri || `mongodb://${dbConfig.HOST || '127.0.0.1'}:${dbConfig.PORT || 27017}/${dbConfig.DB || 'freshshare_db'}`;
  await mongoose.connect(mongoUri, dbConfig.options || { useNewUrlParser: true, useUnifiedTopology: true });
}

async function loadModels() {
  // Require models so mongoose.model() registrations exist
  const models = {};
  models.Listing = require(path.join(__dirname, '..', 'models', 'listing.model.js'));
  models.QuickOrder = require(path.join(__dirname, '..', 'models', 'quick-order.model.js'));
  models.Order = require(path.join(__dirname, '..', 'models', 'order.model.js'));
  models.Message = require(path.join(__dirname, '..', 'models', 'message.model.js'));
  models.Review = require(path.join(__dirname, '..', 'models', 'review.model.js'));
  models.Vendor = require(path.join(__dirname, '..', 'models', 'vendor.model.js'));
  // Keep users, roles, groups for scope A
  models.User = require(path.join(__dirname, '..', 'models', 'user.model.js'));
  models.Role = require(path.join(__dirname, '..', 'models', 'role.model.js'));
  models.Group = require(path.join(__dirname, '..', 'models', 'group.model.js'));
  return models;
}

async function countDocs(models, keys) {
  const out = {};
  for (const k of keys) {
    const m = models[k];
    if (!m) continue;
    try { out[k] = await m.countDocuments({}); } catch (e) { out[k] = -1; }
  }
  return out;
}

async function purgeScopeA(models, apply) {
  const targets = [
    { key: 'Listing', model: models.Listing },
    { key: 'QuickOrder', model: models.QuickOrder },
    { key: 'Order', model: models.Order },
    { key: 'Message', model: models.Message },
    { key: 'Review', model: models.Review },
    { key: 'Vendor', model: models.Vendor },
  ];

  const before = {};
  for (const t of targets) {
    before[t.key] = await t.model.countDocuments({});
  }

  if (apply) {
    for (const t of targets) {
      await t.model.deleteMany({});
    }
  }

  const after = {};
  for (const t of targets) {
    after[t.key] = await t.model.countDocuments({});
  }

  return { before, after };
}

(async function main(){
  const opts = parseArgs();
  if (!opts.json) console.log('Purge Test Data - options:', opts);
  try {
    await connect();
    const models = await loadModels();

    if (opts.scope !== 'A') {
      console.error('Only scope A is implemented in this script version.');
      process.exit(2);
    }

    const keys = ['Listing','QuickOrder','Order','Message','Review','Vendor','User','Role','Group'];
    const counts = await countDocs(models, keys);
    if (opts.json) {
      console.log(JSON.stringify({ mode: opts.dryRun ? 'dry-run' : 'apply', scope: opts.scope, counts }, null, 2));
    } else {
      console.log('Current document counts:', counts);
    }

    if (opts.dryRun) {
      if (!opts.json) console.log('Dry-run: no deletions performed. To apply, run with --apply');
      process.exit(0);
    }

    if (opts.apply) {
      if (!opts.json) console.log('Applying purge for Scope A...');
      const res = await purgeScopeA(models, true);
      if (opts.json) {
        console.log(JSON.stringify({ mode: 'apply', scope: opts.scope, before: res.before, after: res.after }, null, 2));
      } else {
        console.log('Purge completed. Counts before/after:', res);
      }
      process.exit(0);
    }
  } catch (e) {
    console.error('Purge failed:', e && e.message);
    process.exit(1);
  } finally {
    try { await mongoose.connection.close(); } catch(_) {}
  }
})();
