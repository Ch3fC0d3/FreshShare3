#!/usr/bin/env node
/*
 Backfill Listing.group for legacy listings that are missing it.

 Usage:
   node scripts/backfill-listing-group.js --list
     - Lists groups and shows how many listings are missing a group.

   node scripts/backfill-listing-group.js <GROUP_ID> [--apply]
     - If --apply is omitted, runs in DRY-RUN mode and prints what would change.
     - If --apply is provided, updates all listings with missing group to the given GROUP_ID.

 Notes:
   - This script attempts to reuse the app's DB connection settings.
   - Ensure the server is stopped or OK with concurrent connections.
*/

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// Try to use app's DB config if URI not provided
let mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  try {
    const dbCfg = require('../config/db.config');
    const host = process.env.DB_HOST || dbCfg.HOST || '127.0.0.1';
    const port = process.env.DB_PORT || dbCfg.PORT || 27017;
    const name = process.env.DB_NAME || dbCfg.DB || 'freshshare_db';
    mongoUri = `mongodb://${host}:${port}/${name}`;
  } catch (_) {
    mongoUri = 'mongodb://127.0.0.1:27017/freshshare_db';
  }
}

const Listing = require('../models/listing.model');
const Group = require('../models/group.model');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { list: false, apply: false, groupId: null };
  args.forEach((a) => {
    if (a === '--list') opts.list = true;
    else if (a === '--apply') opts.apply = true;
    else if (!opts.groupId) opts.groupId = a;
  });
  return opts;
}

async function main() {
  const opts = parseArgs();
  await mongoose.connect(mongoUri, {
    autoIndex: true,
  });

  try {
    const missingQuery = { $or: [{ group: { $exists: false } }, { group: null }] };
    const missingCount = await Listing.countDocuments(missingQuery);

    if (opts.list || !opts.groupId) {
      const groups = await Group.find({}).select('_id name').limit(50);
      console.log('Groups (first 50):');
      groups.forEach(g => console.log(`- ${g._id} :: ${g.name}`));
      console.log(`\nListings missing group: ${missingCount}`);
      if (!opts.groupId) {
        console.log('\nProvide a GROUP_ID to backfill, e.g.:');
        console.log('  node scripts/backfill-listing-group.js <GROUP_ID> --apply');
        return;
      }
    }

    // Validate group
    const g = await Group.findById(opts.groupId);
    if (!g) {
      console.error(`ERROR: Group ${opts.groupId} not found.`);
      process.exitCode = 1;
      return;
    }

    if (!opts.apply) {
      console.log(`[DRY RUN] Would update ${missingCount} listing(s) to group ${g._id} (${g.name}).`);
      console.log('Run with --apply to perform the update.');
      return;
    }

    if (missingCount === 0) {
      console.log('No listings require backfill.');
      return;
    }

    const res = await Listing.updateMany(
      missingQuery,
      { $set: { group: g._id } }
    );
    console.log(`Updated ${res.modifiedCount || res.nModified || 0} listing(s) to group ${g._id} (${g.name}).`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(err => {
  console.error('Backfill failed:', err);
  process.exitCode = 1;
});
