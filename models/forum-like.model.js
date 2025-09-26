const mongoose = require('mongoose');

const ForumLikeSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }
}, { timestamps: true });

ForumLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ForumLike', ForumLikeSchema);
