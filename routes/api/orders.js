// routes/api/orders.js
const express = require('express');
const router = express.Router();
const quickOrder = require('../../controllers/quickOrder.controller');
const authJwt = require('../../middleware/authJwt');

// Clarify method expectations: GET -> 405 with JSON
router.get('/quick', (req, res) => {
  res.status(405).json({ success: false, message: 'Method Not Allowed. Use POST /api/orders/quick' });
});

// Accept quick checkout submissions (auth optional)
router.post('/quick', express.json(), quickOrder.quickCheckout);

// Recreate per-piece reservations from a past QuickOrder (auth required)
router.post('/:id/reorder', authJwt.verifyToken, quickOrder.reorderFromPast);

// Fallback for unknown orders API routes: ensure JSON response
router.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found', path: req.originalUrl });
});

module.exports = router;
