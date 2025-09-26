const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  contactEmail: { type: String, trim: true },
  contactPhone: { type: String, trim: true },
  website: { type: String, trim: true },
  notes: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },
  state: { type: String, trim: true, default: '' },
  zipCode: { type: String, trim: true, default: '' },
  coordinates: {
    type: { type: String, enum: ['Point'], default: undefined },
    coordinates: { type: [Number], default: undefined } // [lng, lat]
  }
}, { timestamps: true });

vendorSchema.index({ owner: 1, name: 1 });
vendorSchema.index({ city: 1, state: 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
