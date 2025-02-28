const db = require('../models');
const Listing = db.listing;

/**
 * Create a new marketplace listing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createListing = async (req, res) => {
  try {
    // Create a new listing object
    const listing = new Listing({
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      priceUnit: req.body.priceUnit,
      category: req.body.category,
      condition: req.body.condition,
      location: req.body.location,
      seller: req.body.userId, // This will be replaced with actual user ID from auth middleware
      isOrganic: req.body.isOrganic,
      quantity: req.body.quantity,
      tags: req.body.tags
    });

    // If images were uploaded, add them to the listing
    if (req.files && req.files.length > 0) {
      listing.images = req.files.map(file => file.path);
    }

    // Save the listing to the database
    const savedListing = await listing.save();
    
    res.status(201).json({
      success: true,
      message: "Listing created successfully",
      data: savedListing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create listing",
      error: error.message
    });
  }
};

/**
 * Get all marketplace listings with optional filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getListings = async (req, res) => {
  try {
    const { 
      category, 
      minPrice, 
      maxPrice, 
      isOrganic, 
      sortBy, 
      limit = 10, 
      page = 1,
      search
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (category) filter.category = category;
    if (isOrganic) filter.isOrganic = isOrganic === 'true';
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    
    // Add text search if search parameter is provided
    if (search) {
      filter.$text = { $search: search };
    }
    
    // Build sort object
    let sort = { createdAt: -1 }; // Default sort by newest
    
    if (sortBy === 'price-asc') sort = { price: 1 };
    if (sortBy === 'price-desc') sort = { price: -1 };
    
    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Execute query
    const listings = await Listing.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .populate('seller', 'username profileImage');
    
    // Get total count for pagination
    const total = await Listing.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: {
        listings,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch listings",
      error: error.message
    });
  }
};

/**
 * Get a single listing by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('seller', 'username profileImage');
    
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found"
      });
    }
    
    res.status(200).json({
      success: true,
      data: listing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch listing",
      error: error.message
    });
  }
};

/**
 * Update a listing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found"
      });
    }
    
    // Check if the user is the owner of the listing
    // This will be replaced with actual user ID from auth middleware
    if (listing.seller.toString() !== req.body.userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this listing"
      });
    }
    
    // Update the listing
    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      { 
        $set: {
          title: req.body.title,
          description: req.body.description,
          price: req.body.price,
          priceUnit: req.body.priceUnit,
          category: req.body.category,
          condition: req.body.condition,
          location: req.body.location,
          isOrganic: req.body.isOrganic,
          isAvailable: req.body.isAvailable,
          quantity: req.body.quantity,
          tags: req.body.tags,
          updatedAt: Date.now()
        } 
      },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      message: "Listing updated successfully",
      data: updatedListing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update listing",
      error: error.message
    });
  }
};

/**
 * Delete a listing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found"
      });
    }
    
    // Check if the user is the owner of the listing
    // This will be replaced with actual user ID from auth middleware
    if (listing.seller.toString() !== req.body.userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this listing"
      });
    }
    
    await Listing.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: "Listing deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete listing",
      error: error.message
    });
  }
};

/**
 * Search listings by keyword
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.searchListings = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }
    
    const listings = await Listing.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" } })
    .limit(10)
    .populate('seller', 'username profileImage');
    
    res.status(200).json({
      success: true,
      data: listings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to search listings",
      error: error.message
    });
  }
};
