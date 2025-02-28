const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  profileImage: {
    type: String,
    default: "/assets/images/avatar-placeholder.jpg"
  },
  street: {
    type: String,
    default: ""
  },
  city: {
    type: String,
    default: ""
  },
  state: {
    type: String,
    default: ""
  },
  zipCode: {
    type: String,
    default: ""
  },
  phoneNumber: {
    type: String,
    default: ""
  },
  groups: [{
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group"
    },
    role: {
      type: String,
      enum: ["admin", "moderator", "member"],
      default: "member"
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  roles: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role"
    }
  ]
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Add indexes for searchable fields
userSchema.index({ street: 1 });
userSchema.index({ city: 1 });
userSchema.index({ state: 1 });
userSchema.index({ zipCode: 1 });

const User = mongoose.model("User", userSchema);

module.exports = User;
