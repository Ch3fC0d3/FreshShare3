#!/usr/bin/env node
/*
  Seed a small set of real-like data for local QA
  - Creates or reuses a Vendor
  - Creates 2 Listings owned by an existing user

  Usage:
    node scripts/seed-real-data.js
*/

const path = require('path');
const mongoose = require('mongoose');

async function connect() {
  const dbConfig = require(path.join(__dirname, '..', 'config', 'db.config.js'));
  const envUri = process.env.MONGODB_URI && process.env.MONGODB_URI.trim();
  const mongoUri = envUri || `mongodb://${dbConfig.HOST || '127.0.0.1'}:${dbConfig.PORT || 27017}/${dbConfig.DB || 'freshshare_db'}`;
  await mongoose.connect(mongoUri, dbConfig.options || { useNewUrlParser: true, useUnifiedTopology: true });
}

async function loadModels() {
  return {
    User: require(path.join(__dirname, '..', 'models', 'user.model.js')),
    Vendor: require(path.join(__dirname, '..', 'models', 'vendor.model.js')),
    Listing: require(path.join(__dirname, '..', 'models', 'listing.model.js')),
  };
}

async function pickSeller(User) {
  // Prefer a non-admin user, fallback to the first available user
  const user = await User.findOne({}).lean();
  if (!user) throw new Error('No users found. Please create a user first to own the sample listings.');
  return user;
}

async function ensureVendor(Vendor, ownerId) {
  const name = 'Green Valley Farms';
  const update = {
    owner: ownerId,
    name,
    contactEmail: 'contact@greenvalley.example',
    contactPhone: '+1 (555) 010-2030',
    website: 'https://greenvalley.example',
    notes: 'Local farm co-op vendor'
  };
  const vendor = await Vendor.findOneAndUpdate(
    { name },
    { $setOnInsert: update },
    { upsert: true, new: true }
  );
  return vendor;
}

function makeListingsPayload(sellerId, vendorId) {
  const now = new Date();
  return [
    {
      title: 'Organic Heirloom Tomatoes',
      description: 'Grown locally and picked at peak ripeness. Perfect for salads and sauces.',
      price: 3.5,
      priceUnit: 'lb',
      category: 'produce',
      condition: 'not-applicable',
      images: [], // UI will fallback to /images/vegetables.jpg
      seller: sellerId,
      vendorId,
      isOrganic: true,
      isAvailable: true,
      casePrice: 50,
      caseSize: 20,
      pieceOrdering: {
        enabled: true,
        currentCaseNumber: 1,
        currentCaseRemaining: 20,
        casesFulfilled: 0,
        reservations: []
      },
      tags: ['tomatoes', 'heirloom', 'organic'],
      createdAt: now,
      updatedAt: now
    },
    {
      title: 'Fresh Sourdough Bread',
      description: 'Naturally leavened, long-fermented sourdough with a crisp crust and tender crumb.',
      price: 6.0,
      priceUnit: 'each',
      category: 'bakery',
      condition: 'not-applicable',
      images: [],
      seller: sellerId,
      vendorId,
      isOrganic: false,
      isAvailable: true,
      casePrice: 36,
      caseSize: 6,
      pieceOrdering: {
        enabled: true,
        currentCaseNumber: 1,
        currentCaseRemaining: 6,
        casesFulfilled: 0,
        reservations: []
      },
      tags: ['bread', 'sourdough', 'bakery'],
      createdAt: now,
      updatedAt: now
    }
  ];
}

async function upsertListings(Listing, payloads) {
  const results = [];
  for (const data of payloads) {
    const existing = await Listing.findOne({ title: data.title, seller: data.seller });
    if (existing) {
      results.push({ title: data.title, status: 'exists', id: existing._id });
      continue;
    }
    const created = await Listing.create(data);
    results.push({ title: data.title, status: 'created', id: created._id });
  }
  return results;
}

(async function main(){
  try {
    await connect();
    const { User, Vendor, Listing } = await loadModels();

    const seller = await pickSeller(User);
    const vendor = await ensureVendor(Vendor, seller._id);

    const payloads = makeListingsPayload(seller._id, vendor._id);
    const results = await upsertListings(Listing, payloads);

    console.log(JSON.stringify({
      seller: { id: String(seller._id), username: seller.username },
      vendor: { id: String(vendor._id), name: vendor.name },
      listings: results
    }, null, 2));
  } catch (e) {
    console.error('Seed failed:', e && e.message);
    process.exit(1);
  } finally {
    try { await mongoose.connection.close(); } catch(_) {}
  }
})();
