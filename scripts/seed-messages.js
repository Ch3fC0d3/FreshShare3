#!/usr/bin/env node
/*
  Seed example messages for demo/testing.
  - Finds up to two users
  - If two+ users exist, creates a short conversation between the first two
  - If only one user exists, creates a few messages to self (for UI testing)

  Usage:
    node scripts/seed-messages.js
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
    Message: require(path.join(__dirname, '..', 'models', 'message.model.js')),
  };
}

function delayMinutes(baseDate, mins) {
  const d = new Date(baseDate);
  d.setMinutes(d.getMinutes() + mins);
  return d;
}

async function ensureSeed(User, Message) {
  const users = await User.find({}).select('_id username').sort({ createdAt: 1 }).limit(2).lean();
  if (!users || users.length === 0) {
    return { created: 0, note: 'No users in DB; create a user first.' };
  }

  const now = new Date();
  const seedTag = '[seed-messages]';
  let created = 0;
  if (users.length >= 2) {
    const a = users[0];
    const b = users[1];

    const samples = [
      { sender: a._id, recipient: b._id, content: `${seedTag} Hey ${b.username}, welcome to FreshShare!` , timestamp: delayMinutes(now, -90) },
      { sender: b._id, recipient: a._id, content: `${seedTag} Thanks ${a.username}! Just placed my first order.` , timestamp: delayMinutes(now, -75) },
      { sender: a._id, recipient: b._id, content: `${seedTag} Nice! Pickup is set for Friday 4-6 PM.` , timestamp: delayMinutes(now, -60) },
      { sender: b._id, recipient: a._id, content: `${seedTag} Got it. See you then.` , timestamp: delayMinutes(now, -45) },
    ];

    for (const s of samples) {
      const exists = await Message.findOne({ sender: s.sender, recipient: s.recipient, content: s.content }).lean();
      if (!exists) { await Message.create({ ...s, read: false }); created++; }
    }
    return { created, users: [String(a._id), String(b._id)] };
  } else {
    const u = users[0];
    const samples = [
      { sender: u._id, recipient: u._id, content: `${seedTag} This is a sample message to yourself.`, timestamp: delayMinutes(now, -30) },
      { sender: u._id, recipient: u._id, content: `${seedTag} You can mark messages as read and see the badge update.`, timestamp: delayMinutes(now, -20) },
      { sender: u._id, recipient: u._id, content: `${seedTag} Create a second user to see conversations.`, timestamp: delayMinutes(now, -10) },
    ];
    for (const s of samples) {
      const exists = await Message.findOne({ sender: s.sender, recipient: s.recipient, content: s.content }).lean();
      if (!exists) { await Message.create({ ...s, read: false }); created++; }
    }
    return { created, users: [String(u._id)] };
  }
}

(async function main(){
  try {
    await connect();
    const { User, Message } = await loadModels();
    const result = await ensureSeed(User, Message);
    console.log(JSON.stringify({ success: true, ...result }, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Seed messages failed:', e && e.message);
    process.exit(1);
  } finally {
    try { await mongoose.connection.close(); } catch(_) {}
  }
})();
