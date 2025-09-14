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
    enum: ['each', 'lb', 'kg', 'oz', 'bunch', 'hour', 'case']
  },
  category: {
    type: String,
    required: true,
    lowercase: true,
    enum: [
      // Food-focused categories used in UI
      'produce', 'dairy', 'meat', 'seafood', 'bakery', 'pantry', 'beverages', 'frozen', 'prepared',
      'grains', 'baked_goods', 'prepared_foods',
      // Backward-compatible catch-alls
      'vegetables', 'fruits', 'herbs', 'seeds', 'tools', 'services', 'other'
    ]
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
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: false
      }
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
  isArchived: {
    type: Boolean,
    default: false
  },
  expiryDate: {
    type: Date,
    default: function() {
      // Default expiry date is 30 days from creation
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    }
  },
  autoArchiveAfter: {
    type: Number,
    default: 30, // Days
    min: 1,
    max: 90
  },
  versionHistory: [{
    title: String,
    description: String,
    price: Number,
    priceUnit: String,
    quantity: Number,
    images: [String],
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  quantity: {
    type: Number,
    default: 1,
    min: 0
  },
  caseSize: {
    type: Number,
    min: 1,
    default: 1
  },
  tags: [{
    type: String,
    trim: true
  }],
  vendor: {
    name: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    website: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  upcCode: {
    type: String,
    trim: true,
    index: true
  },
  nutritionalInfo: {
    fdcId: String,
    brandName: String,
    ingredients: String,
    servingSize: String,
    servingSizeUnit: String,
    foodNutrients: [{
      nutrientId: Number,
      nutrientName: String,
      nutrientNumber: String,
      unitName: String,
      value: Number
    }]
  },
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
  category: 'text',
  upcCode: 'text',
  'nutritionalInfo.brandName': 'text',
  'nutritionalInfo.ingredients': 'text'
});

// Create geospatial index for location-based queries
ListingSchema.index({ 'location.coordinates': '2dsphere' });

const Listing = mongoose.model('Listing', ListingSchema);

module.exports = Listing;
