const db = require('../models');
const Listing = db.listing;
const Vendor = db.vendor;
const usdaApi = require('../utils/usdaApi');
const jwt = require('jsonwebtoken');

// Helper to extract user ID from request (JWT or req.user)
function getUserId(req) {
  if (req.user && (req.user.id || req.user._id)) return req.user.id || req.user._id;
  try {
    const tokenFromCookie = req.cookies && req.cookies.token;
    const authHeader = req.headers && req.headers.authorization;
    const rawToken = tokenFromCookie || (authHeader ? (authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader) : null);
    if (rawToken) {
      const decoded = jwt.verify(rawToken, process.env.JWT_SECRET || 'bezkoder-secret-key');
      if (decoded && decoded.id) return decoded.id;
    }
  } catch (e) {}
  return null;
}

// Normalize URL to ensure it includes a scheme
function normalizeUrl(url) {
  try {
    if (!url || typeof url !== 'string') return url;
    const trimmed = url.trim();
    if (trimmed === '') return '';
    // If already has a scheme, return as-is
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    // If it looks like a domain or path, prefix https://
    return `https://${trimmed}`;
  } catch (_) {
    return url;
  }
}

/**
 * Create a new marketplace listing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createListing = async (req, res) => {
  try {
    console.log('➡️  createListing called');
    try {
      console.log('Content-Type:', req.headers && req.headers['content-type']);
      console.log('Body keys:', Object.keys(req.body || {}));
      console.log('Sample fields:', {
        title: req.body && req.body.title,
        price: req.body && req.body.price,
        category: req.body && req.body.category,
        caseSize: req.body && req.body.caseSize
      });
      console.log('Files count:', req.files ? req.files.length : 0);
    } catch (logErr) {
      console.error('Logging error in createListing:', logErr);
    }
    // Coerce and sanitize incoming fields (multer + FormData yields strings)
    const body = req.body || {};
    // Support bracket-style keys coming from the form (e.g., location[city])
    const getField = (key, fallback = undefined) => (key in body ? body[key] : fallback);

    // Build location from bracketed fields if present
    const address = getField('location[address]');
    const city = getField('location[city]');
    const state = getField('location[state]');
    const zipCode = getField('location[zipCode]');
    const latStr = getField('location[coordinates][lat]') || getField('latitude');
    const lngStr = getField('location[coordinates][lng]') || getField('longitude');
    const lat = latStr !== undefined ? parseFloat(latStr) : undefined;
    const lng = lngStr !== undefined ? parseFloat(lngStr) : undefined;

    let location;
    if (address || city || state || zipCode || (!Number.isNaN(lat) && !Number.isNaN(lng))) {
      location = {
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        zipCode: zipCode || undefined
      };
      if (typeof lat === 'number' && !Number.isNaN(lat) && typeof lng === 'number' && !Number.isNaN(lng)) {
        location.coordinates = {
          type: 'Point',
          coordinates: [lng, lat]
        };
      }
    }

    // Vendor info (optional)
    const vendorName = getField('vendor[name]');
    const vendorEmail = getField('vendor[contactEmail]');
    const vendorPhone = getField('vendor[contactPhone]');
    const vendorWebsite = normalizeUrl(getField('vendor[website]'));
    const vendorNotes = getField('vendor[notes]');
    let vendor;
    if (vendorName || vendorEmail || vendorPhone || vendorWebsite || vendorNotes) {
      vendor = {
        name: vendorName || undefined,
        contactEmail: vendorEmail || undefined,
        contactPhone: vendorPhone || undefined,
        website: vendorWebsite || undefined,
        notes: vendorNotes || undefined
      };
    }
    const vendorIdRaw = getField('vendorId');
    const saveVendorFlag = getField('saveVendor') === 'true' || getField('saveVendor') === true || getField('saveVendor') === 'on';

    // Coerce numeric fields
    const price = body.price !== undefined ? Number(body.price) : undefined;
    const quantity = body.quantity !== undefined ? Number(body.quantity) : undefined;
    const caseSize = body.caseSize !== undefined ? Number(body.caseSize) : undefined;
    const isOrganic = body.isOrganic === 'true' || body.isOrganic === true;

    // Normalize tags (may come as a single string or multiple entries)
    let tags = [];
    if (Array.isArray(body.tags)) tags = body.tags;
    else if (typeof body.tags === 'string' && body.tags.trim() !== '') tags = [body.tags];

    // Determine seller from auth if available; try JWT cookie/Authorization as fallback
    let sellerId = (req.user && (req.user.id || req.user._id)) || body.userId;
    if (!sellerId) {
      try {
        const tokenFromCookie = req.cookies && req.cookies.token;
        const authHeader = req.headers && req.headers.authorization;
        const rawToken = tokenFromCookie || (authHeader ? (authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader) : null);
        if (rawToken) {
          const decoded = jwt.verify(rawToken, process.env.JWT_SECRET || 'bezkoder-secret-key');
          if (decoded && decoded.id) sellerId = decoded.id;
        }
      } catch (e) {
        // ignore decode errors; will fall back to 401 below
      }
    }
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to create a listing. Please log in.'
      });
    }

    // Basic validation to prevent 500s due to Mongoose required fields
    const errors = [];
    if (!body.title || !body.title.trim()) errors.push('Title is required');
    if (!body.description || !body.description.trim()) errors.push('Description is required');
    if (price === undefined || Number.isNaN(price) || price < 0) errors.push('Price must be a non-negative number');
    if (!body.category) errors.push('Category is required');
    if (caseSize !== undefined && (Number.isNaN(caseSize) || caseSize < 1)) errors.push('Case size must be at least 1');
    if (errors.length) {
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }

    // If vendorId is provided, try to fetch and snapshot vendor
    let vendorId;
    if (vendorIdRaw) {
      try {
        const fetchedVendor = await Vendor.findOne({ _id: vendorIdRaw, owner: sellerId });
        if (fetchedVendor) {
          vendorId = fetchedVendor._id;
          // Snapshot vendor data if vendor snapshot not already provided
          if (!vendor) {
            vendor = {
              name: fetchedVendor.name,
              contactEmail: fetchedVendor.contactEmail,
              contactPhone: fetchedVendor.contactPhone,
              website: fetchedVendor.website,
              notes: fetchedVendor.notes
            };
          }
        }
      } catch (e) {
        console.warn('Invalid vendorId provided or not found for user');
      }
    }

    // Optionally save vendor from provided fields
    if (!vendorId && saveVendorFlag && vendor && vendor.name) {
      try {
        const newVendor = await Vendor.create({ owner: sellerId, ...vendor });
        vendorId = newVendor._id;
      } catch (e) {
        console.error('Failed to save vendor:', e.message);
      }
    }

    // Create a new listing object
    const listing = new Listing({
      title: body.title,
      description: body.description,
      price,
      priceUnit: body.priceUnit,
      category: body.category,
      location, // optional; includes GeoJSON only if lat/lng provided
      seller: sellerId,
      isOrganic,
      quantity,
      caseSize,
      tags,
      vendor,
      vendorId,
      upcCode: body.upcCode
    });

    // If UPC code is provided, fetch nutritional information
    if (body.upcCode) {
      try {
        const productInfo = await usdaApi.getProductByUpc(body.upcCode);
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
          if (!body.title || body.title.trim() === '') {
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
      message: 'Listing created successfully',
      data: savedListing
    });
  } catch (error) {
    console.error('❌ createListing error:', error && error.message);
    console.error('Error name:', error && error.name);
    if (error && error.stack) console.error(error.stack);
    if (error && error.name === 'ValidationError') {
      const errors = Object.values(error.errors || {}).map(e => e.message || String(e));
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create listing',
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
    
    // Secure ownership check using authenticated user
    const currentUserId = (req.user && (req.user.id || req.user._id)) || (function(){
      try {
        const tokenFromCookie = req.cookies && req.cookies.token;
        const authHeader = req.headers && req.headers.authorization;
        const rawToken = tokenFromCookie || (authHeader ? (authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader) : null);
        if (rawToken) {
          const decoded = jwt.verify(rawToken, process.env.JWT_SECRET || 'bezkoder-secret-key');
          if (decoded && decoded.id) return decoded.id;
        }
      } catch (e) {}
      return null;
    })();

    if (!currentUserId || listing.seller.toString() !== String(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this listing"
      });
    }
    
    // Prepare update object
    const body = req.body || {};
    const updateData = {
      title: body.title,
      description: body.description,
      price: body.price,
      priceUnit: body.priceUnit,
      category: body.category,
      location: body.location,
      isOrganic: body.isOrganic,
      isAvailable: body.isAvailable,
      quantity: body.quantity,
      caseSize: body.caseSize,
      tags: body.tags,
      updatedAt: Date.now()
    };

    // Handle vendor updates: accept bracketed fields like createListing
    const getField = (key, fallback = undefined) => (key in body ? body[key] : fallback);
    const vendorName = getField('vendor[name]');
    const vendorEmail = getField('vendor[contactEmail]');
    const vendorPhone = getField('vendor[contactPhone]');
    const vendorWebsite = normalizeUrl(getField('vendor[website]'));
    const vendorNotes = getField('vendor[notes]');
    const vendorIdRaw = getField('vendorId');
    const saveVendorFlag = getField('saveVendor') === 'true' || getField('saveVendor') === true || getField('saveVendor') === 'on';

    let vendorSnapshot;
    if (vendorName || vendorEmail || vendorPhone || vendorWebsite || vendorNotes) {
      vendorSnapshot = {
        name: vendorName || undefined,
        contactEmail: vendorEmail || undefined,
        contactPhone: vendorPhone || undefined,
        website: vendorWebsite || undefined,
        notes: vendorNotes || undefined
      };
    }

    // Resolve vendorId and snapshot similar to createListing
    let vendorId;
    if (vendorIdRaw) {
      try {
        const fetchedVendor = await Vendor.findOne({ _id: vendorIdRaw, owner: currentUserId });
        if (fetchedVendor) {
          vendorId = fetchedVendor._id;
          if (!vendorSnapshot) {
            vendorSnapshot = {
              name: fetchedVendor.name,
              contactEmail: fetchedVendor.contactEmail,
              contactPhone: fetchedVendor.contactPhone,
              website: fetchedVendor.website,
              notes: fetchedVendor.notes
            };
          }
        }
      } catch (e) {
        console.warn('Invalid vendorId for update or not owned by user');
      }
    }

    if (!vendorId && saveVendorFlag && vendorSnapshot && vendorSnapshot.name) {
      try {
        const newVendor = await Vendor.create({ owner: currentUserId, ...vendorSnapshot });
        vendorId = newVendor._id;
      } catch (e) {
        console.error('Failed to save vendor during update:', e.message);
      }
    }

    if (vendorSnapshot) updateData.vendor = vendorSnapshot;
    if (vendorId) updateData.vendorId = vendorId;
    
    // If UPC code is updated, fetch new nutritional information
    if (body.upcCode && body.upcCode !== listing.upcCode) {
      updateData.upcCode = body.upcCode;
      
      try {
        const productInfo = await usdaApi.getProductByUpc(body.upcCode);
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
    const isDebug = !!(req.query && (req.query.debug === '1' || req.query.debug === 'true' || req.query.debug === 'yes'));
    
    try {
      const productInfo = await usdaApi.getProductByUpc(upc);
      console.log('Server: USDA API response received');
      console.log('Response success:', productInfo && productInfo.success);
      console.log('Response data (raw):', JSON.stringify(productInfo, null, 2));

      // Normalize payload to guarantee non-empty consistent shape for frontend
      const incoming = productInfo && productInfo.data ? productInfo.data : {};
      const base = incoming && typeof incoming === 'object' ? (incoming.product || incoming) : {};
      const normalized = {
        description: base.description || incoming.description || `Product (UPC: ${upc})`,
        brandName: base.brandName || incoming.brandName || 'Unknown Brand',
        ingredients: base.ingredients || incoming.ingredients || 'No ingredients information available',
        upc: base.upc || incoming.upc || upc,
        isGenericFallback: Boolean((incoming && incoming.isGenericFallback) || (base && base.isGenericFallback))
      };
      if (Array.isArray(base.foodNutrients) || Array.isArray(incoming.foodNutrients)) {
        normalized.foodNutrients = base.foodNutrients || incoming.foodNutrients;
      }
      if (Array.isArray(base.nutrients) || Array.isArray(incoming.nutrients)) {
        normalized.nutrients = base.nutrients || incoming.nutrients;
      }

      if (normalized.isGenericFallback) {
        console.log('Server: Returning normalized generic fallback data for UPC:', upc);
      }

      console.log('Server: Sending normalized response');
      const out = { success: true, data: normalized };
      if (isDebug && productInfo && productInfo.debugDetails) {
        out.debug = productInfo.debugDetails;
      }
      return res.status(200).json(out);
    } catch (apiError) {
      console.error('USDA API error:', apiError);
      // Return a fallback response with generic product data
      const debugInfo = isDebug ? {
        upstreamError: apiError && (apiError.response && apiError.response.data ? (typeof apiError.response.data === 'object' ? apiError.response.data : String(apiError.response.data)) : String(apiError.message || apiError)),
        hasApiKey: !!process.env.USDA_API_KEY,
        nodeEnv: process.env.NODE_ENV || 'development'
      } : undefined;
      return res.status(200).json({
        success: true,
        message: "Created generic product info due to API error",
        data: {
          description: `Product (UPC: ${upc})`,
          brandName: 'Unknown Brand',
          ingredients: 'No ingredients information available',
          upc: upc,
          isGenericFallback: true
        },
        ...(debugInfo ? { debug: debugInfo } : {})
      });
    }
  } catch (error) {
    console.error('UPC lookup controller error:', error);
    console.error('Error stack:', error.stack);
    
    // Even on controller error, return a successful response with generic data
    const isDebug = !!(req.query && (req.query.debug === '1' || req.query.debug === 'true' || req.query.debug === 'yes'));
    const debugInfo = isDebug ? {
      controllerError: String(error && (error.message || error)),
      hasApiKey: !!process.env.USDA_API_KEY,
      nodeEnv: process.env.NODE_ENV || 'development'
    } : undefined;
    res.status(200).json({
      success: true,
      message: "Created generic product info due to server error",
      data: {
        description: `Product (UPC code: ${req.params.upc || 'unknown'})`,
        brandName: 'Unknown Brand',
        ingredients: 'No ingredients information available',
        upc: req.params.upc || 'unknown',
        isGenericFallback: true
      },
      ...(debugInfo ? { debug: debugInfo } : {})
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

// List saved vendors for current user
exports.getMyVendors = async (req, res) => {
  try {
    const userId = getUserId(req);
    console.log('[getMyVendors] userId:', userId);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const vendors = await Vendor.find({ owner: userId }).sort({ updatedAt: -1 });
    console.log('[getMyVendors] found vendors:', Array.isArray(vendors) ? vendors.length : 0);
    res.status(200).json({ success: true, data: vendors });
  } catch (error) {
    console.error('[getMyVendors] error:', error && error.name, error && error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch vendors', error: error.message });
  }
};

// Create a saved vendor for current user
exports.createVendor = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    let { name, contactEmail, contactPhone, website, notes } = req.body || {};
    website = normalizeUrl(website);
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Vendor name is required' });
    const vendor = await Vendor.create({ owner: userId, name: name.trim(), contactEmail, contactPhone, website, notes });
    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create vendor', error: error.message });
  }
};

// Get prior listings for current user (templates for prefill)
exports.getMyListingTemplates = async (req, res) => {
  try {
    const userId = getUserId(req);
    console.log('[getMyListingTemplates] userId:', userId);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const listings = await Listing.find({ seller: userId })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('title description price priceUnit category quantity caseSize isOrganic vendor vendorId upcCode');
    console.log('[getMyListingTemplates] found templates:', Array.isArray(listings) ? listings.length : 0);
    res.status(200).json({ success: true, data: listings });
  } catch (error) {
    console.error('[getMyListingTemplates] error:', error && error.name, error && error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch templates', error: error.message });
  }
};

// Update a saved vendor (owner only)
exports.updateVendor = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { id } = req.params;
    let { name, contactEmail, contactPhone, website, notes } = req.body || {};
    if (website !== undefined) website = normalizeUrl(website);
    const vendor = await Vendor.findOne({ _id: id, owner: userId });
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    if (name !== undefined) vendor.name = name;
    if (contactEmail !== undefined) vendor.contactEmail = contactEmail;
    if (contactPhone !== undefined) vendor.contactPhone = contactPhone;
    if (website !== undefined) vendor.website = website;
    if (notes !== undefined) vendor.notes = notes;
    await vendor.save();
    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update vendor', error: error.message });
  }
};

// Delete a saved vendor (owner only)
exports.deleteVendor = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { id } = req.params;
    const vendor = await Vendor.findOneAndDelete({ _id: id, owner: userId });
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.status(200).json({ success: true, message: 'Vendor deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete vendor', error: error.message });
  }
};
