const mongoose = require('mongoose');

const ForumPostSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true, trim: true, maxlength: 10000 },
  category: { 
    type: String, 
    enum: ['Questions', 'Discussion', 'Tips & Tricks', 'Recipes', 'Success Stories'],
    default: 'Discussion'
  },
  images: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  authorName: { type: String, default: '' },
  likesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('ForumPost', ForumPostSchema);
