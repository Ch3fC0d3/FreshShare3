/**
 * USDA API Utility Functions
 * Provides functions to interact with the USDA UPC symbol database API
 */
const axios = require('axios');

// Get API key from environment variables
const USDA_API_KEY = process.env.USDA_API_KEY;

// Debug log to check if API key is loaded
console.log('USDA API Key loaded:', USDA_API_KEY ? 'Yes' : 'No');

/**
 * Get product information by UPC code
 * @param {String} upcCode - The UPC code to look up
 * @returns {Promise<Object>} - Product information
 */
async function getProductByUpc(upcCode) {
  try {
    // Validate UPC code format
    if (!upcCode || !/^\d+$/.test(upcCode)) {
      throw new Error('Invalid UPC code format');
    }
    
    console.log('USDA API: Looking up UPC code:', upcCode);
    
    // Check if we have the API key
    if (!USDA_API_KEY) {
      console.warn('USDA API key not found, falling back to mock data');
      return getMockProductData(upcCode);
    }
    
    // Log the environment variables
    console.log('Environment variables:', {
      NODE_ENV: process.env.NODE_ENV,
      USDA_API_KEY_EXISTS: !!process.env.USDA_API_KEY
    });
    
    // Now that we have a valid API key, let's use the real API
    console.log('Using real USDA API for UPC lookup with key:', USDA_API_KEY);
    
    // First try to find by UPC directly
    try {
      console.log('Making USDA API request with UPC:', upcCode);
      
      const params = {
        api_key: USDA_API_KEY,
        query: upcCode,
        dataType: ['Branded'],
        pageSize: 1
      };
      
      console.log('API request parameters:', JSON.stringify(params, null, 2));
      
      const upcResponse = await axios.get(
        `https://api.nal.usda.gov/fdc/v1/foods/search`,
        { params }
      );

      console.log('USDA API response status:', upcResponse.status);
      console.log('USDA API response data foods count:', upcResponse.data.foods?.length || 0);
      
      // If we found an exact UPC match
      const exactMatch = upcResponse.data.foods?.find(f => 
        f.gtinUpc === upcCode || 
        f.gtin_upc === upcCode || 
        f.upc === upcCode
      );

      if (exactMatch) {
        console.log('Found exact UPC match:', exactMatch.description);
        return formatProductResponse(exactMatch, upcCode);
      }
      
      // If we found any results, use the first one
      if (upcResponse.data.foods && upcResponse.data.foods.length > 0) {
        console.log('Using first result:', upcResponse.data.foods[0].description);
        return formatProductResponse(upcResponse.data.foods[0], upcCode);
      }
    } catch (upcError) {
      console.error('Error in UPC-specific search:', upcError);
      console.error('Error details:', upcError.message);
      if (upcError.response) {
        console.error('Error response status:', upcError.response.status);
        console.error('Error response data:', JSON.stringify(upcError.response.data, null, 2));
      }
    }

    console.log('No results found, falling back to mock data');
    return getMockProductData(upcCode);
  } catch (error) {
    console.error('USDA API Error:', error.message);
    // Fall back to mock data on API error
    console.log('API error, falling back to mock data');
    return getMockProductData(upcCode);
  }
}

/**
 * Format product information from USDA API response
 * @param {Object} food - Food item from USDA API
 * @param {String} upcCode - Original UPC code
 * @returns {Object} - Formatted product response
 */
function formatProductResponse(food, upcCode) {
  const product = {
    description: food.description || food.lowercaseDescription || `Product ${upcCode}`,
    brandName: food.brandName || food.brandOwner || 'Unknown Brand',
    ingredients: food.ingredients || 'No ingredients listed',
    nutrients: food.foodNutrients?.map(n => ({
      name: n.nutrientName,
      amount: n.value,
      unit: n.unitName
    })) || []
  };

  return {
    success: true,
    data: {
      product,
      ...product,
      upc: upcCode
    }
  };
}

/**
 * Get mock product data for testing
 * @param {String} upcCode - The UPC code to look up
 * @returns {Object} - Mock product data
 */
function getMockProductData(upcCode) {
  // Mock product data based on UPC code
  const mockProducts = {
    // Some common test UPC codes
    '12345678901': {
      description: 'Test Product 1',
      brandName: 'Test Brand',
      ingredients: 'Test ingredients for product 1'
    },
    '040980317': {
      description: 'Organic Bananas',
      brandName: 'Fresh Produce',
      ingredients: 'Organic Bananas'
    },
    '034421727': {
      description: 'Organic Apples',
      brandName: 'Fresh Produce',
      ingredients: 'Organic Apples'
    },
    '152078211': {
      description: 'Organic Carrots',
      brandName: 'Fresh Produce',
      ingredients: 'Organic Carrots'
    }
  };
  
  // Check if we have mock data for this UPC
  const mockProduct = mockProducts[upcCode] || {
    description: `Product ${upcCode}`,
    brandName: 'Unknown Brand',
    ingredients: 'No ingredients listed'
  };
  
  return {
    success: true,
    data: {
      product: mockProduct,
      ...mockProduct,
      upc: upcCode
    }
  };
}

/**
 * Search for food items by name
 * @param {String} query - The search query
 * @returns {Promise<Object>} - Search results
 */
async function searchFoodItems(query) {
  try {
    // Validate query
    if (!query || query.trim().length < 2) {
      return { success: false, message: 'Search query must be at least 2 characters' };
    }

    // Make request to USDA API
    const response = await axios.get(
      `https://api.nal.usda.gov/fdc/v1/foods/search`, {
        params: {
          api_key: USDA_API_KEY,
          query: query,
          dataType: 'Foundation,SR Legacy,Survey (FNDDS)',
          pageSize: 25
        }
      }
    );

    // Check if any results were found
    if (!response.data.foods || response.data.foods.length === 0) {
      return { success: false, message: 'No food items found' };
    }

    // Extract relevant information
    const foodItems = response.data.foods.map(food => ({
      fdcId: food.fdcId,
      description: food.description,
      brandName: food.brandName || '',
      category: food.foodCategory || ''
    }));
    
    return {
      success: true,
      data: foodItems
    };
  } catch (error) {
    console.error('USDA API Error:', error.message);
    return {
      success: false,
      message: 'Failed to search food items',
      error: error.message
    };
  }
}

module.exports = {
  getProductByUpc,
  searchFoodItems
};
