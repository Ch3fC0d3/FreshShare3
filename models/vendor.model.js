const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  contactEmail: { type: String, trim: true },
  contactPhone: { type: String, trim: true },
  website: { type: String, trim: true },
  notes: { type: String, trim: true, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);
