const mongoose = require('mongoose');

/**
 * Review Schema
 * Supports ratings and reviews for users, listings, and groups
 */
const ReviewSchema = new mongoose.Schema({
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // The entity being reviewed (user, listing, or group)
  reviewedEntity: {
    entityType: {
      type: String,
      enum: ['user', 'listing', 'group'],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'reviewedEntity.entityType'
    }
  },
  // Optional reference to a transaction that prompted this review
  relatedTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  // Specific aspects of the review
  aspects: {
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    quality: {
      type: Number,
      min: 1,
      max: 5
    },
    reliability: {
      type: Number,
      min: 1,
      max: 5
    },
    value: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  // Helpful votes from other users
  helpfulVotes: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      helpful: Boolean,
      votedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  // Response from the reviewed entity
  response: {
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: Date
  },
  // Moderation fields
  isVerified: {
    type: Boolean,
    default: false
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  moderationNotes: String,
  // Timestamps
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

// Create indexes for better query performance
ReviewSchema.index({ reviewer: 1 });
ReviewSchema.index({ 'reviewedEntity.entityId': 1, 'reviewedEntity.entityType': 1 });
ReviewSchema.index({ rating: 1 });
ReviewSchema.index({ createdAt: -1 });

// Virtual for average aspect rating
ReviewSchema.virtual('averageAspectRating').get(function() {
  const aspects = this.aspects;
  let total = 0;
  let count = 0;
  
  if (aspects.communication) { total += aspects.communication; count++; }
  if (aspects.quality) { total += aspects.quality; count++; }
  if (aspects.reliability) { total += aspects.reliability; count++; }
  if (aspects.value) { total += aspects.value; count++; }
  
  return count > 0 ? (total / count).toFixed(1) : null;
});

// Method to calculate helpfulness score
ReviewSchema.methods.getHelpfulnessScore = function() {
  const votes = this.helpfulVotes;
  if (!votes || votes.length === 0) return 0;
  
  const helpfulCount = votes.filter(vote => vote.helpful).length;
  return (helpfulCount / votes.length).toFixed(2);
};

const Review = mongoose.model('Review', ReviewSchema);

module.exports = Review;
