const mongoose = require('mongoose');

const ForumCommentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', required: true, index: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  authorName: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('ForumComment', ForumCommentSchema);
