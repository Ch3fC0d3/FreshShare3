/**
 * Marketplace API Routes
 * Handles API requests for marketplace functionality
 */
const express = require('express');
const router = express.Router();
const marketplaceController = require('../../controllers/marketplace.controller');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/uploads/marketplace');
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Create upload middleware
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    
    cb(new Error('Only image files are allowed!'));
  }
});

// Create a new listing (wrap upload to handle errors as JSON)
router.post('/', (req, res, next) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err) {
      const status = err.message && err.message.includes('Only image files are allowed') ? 400 : 500;
      return res.status(status).json({ success: false, message: err.message || 'Upload error' });
    }
    next();
  });
}, marketplaceController.createListing);

// Get all listings with optional filtering
router.get('/', marketplaceController.getListings);

// Search listings by keyword
router.get('/search', marketplaceController.searchListings);

// Look up product information by UPC code
router.get('/upc/:upc', (req, res, next) => {
  console.log('UPC LOOKUP ROUTE ACCESSED with UPC:', req.params.upc);
  console.log('Request path:', req.path);
  console.log('Full URL:', req.originalUrl);
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  
  // Add error handling wrapper
  try {
    // Call the controller with error handling
    marketplaceController.lookupUpc(req, res, next);
  } catch (error) {
    console.error('Error in UPC lookup route handler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error in UPC lookup route',
      error: error.message
    });
  }
});

// Test endpoint for UPC lookup
router.get('/upc-test/:upc', (req, res) => {
  const { upc } = req.params;
  console.log('UPC test endpoint called with UPC:', upc);
  console.log('Request path:', req.path);
  console.log('Full URL:', req.originalUrl);
  res.status(200).json({
    success: true,
    message: 'UPC test endpoint working',
    upc: upc
  });
});

// Search food items for autocomplete
router.get('/food-search', marketplaceController.searchFoodItems);

// Saved vendors for current user
router.get('/vendors', marketplaceController.getMyVendors);
router.post('/vendors', express.json(), marketplaceController.createVendor);
router.put('/vendors/:id', express.json(), marketplaceController.updateVendor);
router.delete('/vendors/:id', marketplaceController.deleteVendor);

// Listing templates (previous listings) for prefill
router.get('/my-templates', marketplaceController.getMyListingTemplates);

// Group buy endpoints
router.get('/:id/groupbuy/status', marketplaceController.groupBuyStatus);
router.post('/:id/groupbuy/commit', express.json(), marketplaceController.groupBuyCommit);
router.delete('/:id/groupbuy/commit', marketplaceController.groupBuyCancel);

// Per-piece ordering endpoints
router.get('/:id/pieces/status', marketplaceController.pieceStatus);
router.post('/:id/pieces', express.json(), marketplaceController.pieceSet);
router.delete('/:id/pieces', marketplaceController.pieceCancel);
router.get('/pieces/my', marketplaceController.myPieceReservations);

// Get a single listing by ID
router.get('/:id', marketplaceController.getListingById);

// Update a listing
router.put('/:id', marketplaceController.updateListing);

// Delete a listing
router.delete('/:id', marketplaceController.deleteListing);

// Fallback for unknown marketplace API routes: ensure JSON response (prevents HTML 404 pages)
router.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found', path: req.originalUrl });
});

module.exports = router;
