// routes/api/forum.js
const express = require('express');
const router = express.Router();
const forum = require('../../controllers/forum.controller');

router.get('/posts', forum.listPosts);
router.post('/posts', express.json(), forum.createPost);

// Comments for a post
router.get('/posts/:id/comments', forum.listComments);
router.post('/posts/:id/comments', express.json(), forum.addComment);

// Like toggle for a post (requires auth token)
router.post('/posts/:id/like', forum.toggleLike);

// JSON 404 fallback
router.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found', path: req.originalUrl });
});

module.exports = router;
