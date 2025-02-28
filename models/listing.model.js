const mongoose = require('mongoose');

/**
 * Marketplace listing schema
 * Represents a product or service listing in the marketplace
 */
const ListingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  priceUnit: {
    type: String,
    default: 'each',
    enum: ['each', 'lb', 'kg', 'oz', 'bunch', 'hour']
  },
  category: {
    type: String,
    required: true,
    enum: ['vegetables', 'fruits', 'herbs', 'seeds', 'tools', 'services', 'other']
  },
  condition: {
    type: String,
    enum: ['new', 'like-new', 'good', 'fair', 'poor', 'not-applicable'],
    default: 'not-applicable'
  },
  images: [{
    type: String,
    required: false
  }],
  location: {
    address: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isOrganic: {
    type: Boolean,
    default: false
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create text index for search functionality
ListingSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text',
  category: 'text'
});

const Listing = mongoose.model('Listing', ListingSchema);

module.exports = Listing;
