const db = require('../models');
const Listing = db.listing;
const usdaApi = require('../utils/usdaApi');

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
      tags: req.body.tags,
      upcCode: req.body.upcCode
    });
    
    // If UPC code is provided, fetch nutritional information
    if (req.body.upcCode) {
      try {
        const productInfo = await usdaApi.getProductByUpc(req.body.upcCode);
        if (productInfo.success) {
          listing.nutritionalInfo = {
            fdcId: productInfo.data.fdcId,
            brandName: productInfo.data.brandName,
            ingredients: productInfo.data.ingredients,
            servingSize: productInfo.data.servingSize,
            servingSizeUnit: productInfo.data.servingSizeUnit,
            foodNutrients: productInfo.data.foodNutrients
          };
          
          // If no title was provided, use the product description
          if (!req.body.title || req.body.title.trim() === '') {
            listing.title = productInfo.data.description;
          }
        }
      } catch (upcError) {
        console.error('Error fetching UPC data:', upcError);
        // Continue with listing creation even if UPC lookup fails
      }
    }

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
    
    // Prepare update object
    const updateData = {
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
    };
    
    // If UPC code is updated, fetch new nutritional information
    if (req.body.upcCode && req.body.upcCode !== listing.upcCode) {
      updateData.upcCode = req.body.upcCode;
      
      try {
        const productInfo = await usdaApi.getProductByUpc(req.body.upcCode);
        if (productInfo.success) {
          updateData.nutritionalInfo = {
            fdcId: productInfo.data.fdcId,
            brandName: productInfo.data.brandName,
            ingredients: productInfo.data.ingredients,
            servingSize: productInfo.data.servingSize,
            servingSizeUnit: productInfo.data.servingSizeUnit,
            foodNutrients: productInfo.data.foodNutrients
          };
        }
      } catch (upcError) {
        console.error('Error fetching UPC data:', upcError);
        // Continue with listing update even if UPC lookup fails
      }
    }
    
    // Update the listing
    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
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

/**
 * Look up product information by UPC code
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.lookupUpc = async (req, res) => {
  console.log('\n==== UPC LOOKUP CONTROLLER CALLED ====');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    const { upc } = req.params;
    console.log('Server: Received UPC lookup request for:', upc);
    console.log('Request IP:', req.ip);
    console.log('Request method:', req.method);
    
    if (!upc) {
      console.log('Server: UPC code is missing');
      return res.status(400).json({
        success: false,
        message: "UPC code is required"
      });
    }
    
    // Validate UPC code format
    if (!/^\d+$/.test(upc)) {
      console.log('Server: Invalid UPC code format:', upc);
      return res.status(400).json({
        success: false,
        message: "Invalid UPC code format. UPC must contain only digits."
      });
    }
    
    // Call USDA API to get product information
    console.log('Server: Calling USDA API for UPC:', upc);
    console.log('USDA API key exists:', !!process.env.USDA_API_KEY);
    
    try {
      const productInfo = await usdaApi.getProductByUpc(upc);
      console.log('Server: USDA API response received');
      console.log('Response success:', productInfo.success);
      console.log('Response data:', JSON.stringify(productInfo, null, 2));
      
      // Always return a 200 status code since our API now always returns success=true
      // with either real data or fallback data
      console.log('Server: Sending response');
      
      // Check if this is fallback data and log it
      if (productInfo.data && productInfo.data.isGenericFallback) {
        console.log('Server: Returning generic fallback data for UPC:', upc);
      }
      
      res.status(200).json(productInfo);
    } catch (apiError) {
      console.error('USDA API error:', apiError);
      // Return a fallback response with generic product data
      return res.status(200).json({
        success: true,
        message: "Created generic product info due to API error",
        data: {
          description: `Product (UPC: ${upc})`,
          brandName: 'Unknown Brand',
          ingredients: 'No ingredients information available',
          upc: upc,
          isGenericFallback: true
        }
      });
    }
  } catch (error) {
    console.error('UPC lookup controller error:', error);
    console.error('Error stack:', error.stack);
    
    // Even on controller error, return a successful response with generic data
    res.status(200).json({
      success: true,
      message: "Created generic product info due to server error",
      data: {
        description: `Product (UPC code: ${req.params.upc || 'unknown'})`,
        brandName: 'Unknown Brand',
        ingredients: 'No ingredients information available',
        upc: req.params.upc || 'unknown',
        isGenericFallback: true
      }
    });
  } finally {
    console.log('==== UPC LOOKUP CONTROLLER FINISHED ====\n');
  }
};

/**
 * Search for food items by name using USDA API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.searchFoodItems = async (req, res) => {
  console.log(' API ENDPOINT CALLED: /api/marketplace/food-search');
  try {
    // Log request details
    console.log('Request query parameters:', req.query);
    const { query } = req.query;
    console.log('Search query:', query);
    
    // Check if environment variables are properly loaded
    console.log('USDA_API_KEY exists:', !!process.env.USDA_API_KEY);
    if (process.env.USDA_API_KEY) {
      const keyLength = process.env.USDA_API_KEY.length;
      console.log('API Key Length:', keyLength);
      console.log('API Key Preview:', `${process.env.USDA_API_KEY.substring(0, 3)}...${process.env.USDA_API_KEY.substring(keyLength - 3)}`);
    }
    
    // Validate query
    if (!query || query.trim().length < 2) {
      console.log('Invalid query - too short');
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }
    
    console.log('Calling USDA API service...');
    // Call USDA API to search for food items
    const result = await usdaApi.searchFoodItems(query);
    console.log('USDA API service returned with success:', result.success);
    console.log('Result contains mock data:', !!result.isMockData);
    console.log('Number of results:', result.data ? result.data.length : 0);
    
    // Log a sample of the results
    if (result.data && result.data.length > 0) {
      console.log('Sample result:', JSON.stringify(result.data[0], null, 2));
    }
    
    // Format response to match what the frontend expects
    const responseData = {
      success: result.success,
      data: result.data || [],
      // Pass through the isMockData flag from the API result
      // Only set it to true if explicitly set in the result
      isMockData: result.isMockData || false,
      items: result.data || [] // Adding this for compatibility with the test-usda-api.html page
    };
    
    // Add detailed logging about the response we're sending
    console.log('Sending response to client with format:', Object.keys(responseData));
    console.log('Response contains mock data flag:', responseData.isMockData);
    console.log('Response data length:', responseData.data.length);
    
    res.status(200).json(responseData);
  } catch (error) {
    console.error(' ERROR searching food items:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to search food items',
      error: error.message
    });
  }
};
