const mongoose = require('mongoose');

const QuickOrderItemSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: false },
  title: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  pieces: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const QuickOrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  contact: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: String }
  },
  items: { type: [QuickOrderItemSchema], required: true, default: [] },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['new', 'submitted', 'cancelled'], default: 'submitted' }
}, { timestamps: true });

module.exports = mongoose.model('QuickOrder', QuickOrderSchema);
