const mongoose = require('mongoose');

/**
 * Order Schema
 * Represents a bulk order placed by a group
 */
const OrderSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  products: [{
    productName: {
      type: String,
      required: true
    },
    vendor: String,
    casePrice: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    totalUnits: Number,
    totalPrice: Number
  }],
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    items: [{
      productId: String, // Reference to the product in the products array
      quantity: Number,
      cost: Number
    }],
    totalCost: {
      type: Number,
      default: 0
    },
    hasPaid: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliveryDate: {
    type: Date,
    required: true
  },
  deliveryLocation: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  totalOrderCost: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'complete'],
    default: 'pending'
  },
  notes: String,
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

// Calculate total price before saving
OrderSchema.pre('save', function(next) {
  // Calculate total price for each product
  this.products.forEach(product => {
    product.totalPrice = product.casePrice * product.quantity;
  });
  
  // Calculate total order cost
  this.totalOrderCost = this.products.reduce((total, product) => {
    return total + (product.totalPrice || 0);
  }, 0);
  
  // Determine payment status
  const totalPaid = this.participants.reduce((total, participant) => {
    return total + (participant.hasPaid ? participant.totalCost : 0);
  }, 0);
  
  if (totalPaid === 0) {
    this.paymentStatus = 'pending';
  } else if (totalPaid < this.totalOrderCost) {
    this.paymentStatus = 'partial';
  } else {
    this.paymentStatus = 'complete';
  }
  
  next();
});

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;
