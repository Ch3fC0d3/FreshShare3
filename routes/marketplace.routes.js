const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplace.controller');
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

// Create a new listing
router.post('/', upload.array('images', 5), marketplaceController.createListing);

// Get all listings with optional filtering
router.get('/', marketplaceController.getListings);

// Search listings by keyword
router.get('/search', marketplaceController.searchListings);

// Get a single listing by ID
router.get('/:id', marketplaceController.getListingById);

// Update a listing
router.put('/:id', marketplaceController.updateListing);

// Delete a listing
router.delete('/:id', marketplaceController.deleteListing);

module.exports = router;
