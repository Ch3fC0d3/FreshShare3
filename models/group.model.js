const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    minlength: [3, 'Group name must be at least 3 characters long'],
    maxlength: [50, 'Group name cannot exceed 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Group description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Group category is required'],
    enum: {
      values: ['neighborhood', 'community_garden', 'food_bank', 'cooking_club', 'other'],
      message: '{VALUE} is not a valid category'
    }
  },
  location: {
    street: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      trim: true,
      default: ''
    },
    zipCode: {
      type: String,
      required: [true, 'Zip code is required'],
      trim: true
    }
  },
  rules: {
    type: String,
    trim: true,
    default: '',
    maxlength: [1000, 'Rules cannot exceed 1000 characters']
  },
  deliveryDays: {
    type: [{
      type: String,
      enum: {
        values: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        message: '{VALUE} is not a valid day'
      }
    }],
    required: [true, 'At least one delivery day is required'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one delivery day is required'
    }
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Group creator is required']
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Create indexes for better query performance
groupSchema.index({ name: 1 });
groupSchema.index({ category: 1 });
groupSchema.index({ createdBy: 1 });
groupSchema.index({ members: 1 });
groupSchema.index({ admins: 1 });

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
