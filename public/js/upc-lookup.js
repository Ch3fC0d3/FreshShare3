/**
 * UPC Lookup Functionality
 * Provides client-side functionality for UPC code lookup using the USDA API
 */

const UpcLookup = {
  /**
   * Initialize UPC lookup functionality
   */
  init() {
    this.setupEventListeners();
    // We no longer auto-initialize the scanner
    // It will be initialized when the user clicks the Start Camera button
  },

  /**
   * Set up event listeners for UPC lookup
   */
  setupEventListeners() {
    // UPC lookup form submission
    const upcForm = document.getElementById('upc-lookup-form');
    if (upcForm) {
      upcForm.addEventListener('submit', this.handleUpcLookup.bind(this));
    }

    // Start Camera button
    const startCameraBtn = document.getElementById('start-camera-btn');
    if (startCameraBtn) {
      startCameraBtn.addEventListener('click', () => {
        // Hide the camera placeholder
        const cameraPlaceholder = document.getElementById('camera-placeholder');
        if (cameraPlaceholder) {
          cameraPlaceholder.style.display = 'none';
        }
        // Initialize the scanner
        this.setupUpcScanner();
      });
    }

    // Manual UPC entry button
    const manualUpcBtn = document.getElementById('manual-upc-btn');
    if (manualUpcBtn) {
      manualUpcBtn.addEventListener('click', this.showManualUpcEntry.bind(this));
    }

    // Close UPC modal button
    const closeUpcModalBtn = document.getElementById('close-upc-modal');
    if (closeUpcModalBtn) {
      closeUpcModalBtn.addEventListener('click', this.closeUpcModal.bind(this));
    }

    // Use UPC data button
    const useUpcDataBtn = document.getElementById('use-upc-data');
    if (useUpcDataBtn) {
      useUpcDataBtn.addEventListener('click', this.useUpcData.bind(this));
    }
  },

  /**
   * Set up UPC scanner using QuaggaJS (if available)
   */
  setupUpcScanner() {
    // Check if Quagga is available
    if (typeof Quagga === 'undefined') {
      console.warn('Quagga.js is not loaded. Barcode scanning will not be available.');
      return;
    }

    const scannerContainer = document.getElementById('scanner-container');
    if (!scannerContainer) return;
    
    // Stop any existing scanner
    if (typeof Quagga !== 'undefined') {
      Quagga.stop();
    }
    
    // Clear any existing content except the scanner overlay
    const scannerOverlay = scannerContainer.querySelector('.scanner-overlay');
    const placeholder = scannerContainer.querySelector('#camera-placeholder');
    
    // Hide the camera placeholder
    if (placeholder) {
      placeholder.style.display = 'none';
    }
    
    // Initialize Quagga with proper configuration
    Quagga.init({
      inputStream: {
        name: 'Live',
        type: 'LiveStream',
        target: scannerContainer,
        willReadFrequently: true, // Optimize canvas performance
        constraints: {
          width: 480,
          height: 320,
          facingMode: 'environment' // Use back camera on mobile devices
        }
      },
      locator: {
        patchSize: 'medium',
        halfSample: true
      },
      numOfWorkers: 2,
      frequency: 10,
      decoder: {
        readers: ['upc_reader', 'upc_e_reader', 'ean_reader', 'ean_8_reader']
      },
      locate: false // Disable Quagga's built-in targeting box
    }, (err) => {
      if (err) {
        console.error('Failed to initialize barcode scanner:', err);
        alert('Camera error: ' + err.message);
        return;
      }
      
      // Make sure the scanner overlay is on top
      if (scannerOverlay) {
        scannerContainer.appendChild(scannerOverlay);
      }
      
      // Start Quagga once initialized
      Quagga.start();
      
      // Listen for barcode detection
      Quagga.onDetected(this.onBarcodeDetected.bind(this));
    });
  },

  /**
   * Handle barcode detection
   * @param {Object} result - Barcode detection result
   */
  onBarcodeDetected(result) {
    if (result && result.codeResult) {
      const upcCode = result.codeResult.code;
      console.log('Barcode detected:', upcCode);
      
      // Stop scanner after successful detection
      Quagga.stop();
      
      // Look up the UPC code
      this.lookupUpc(upcCode);
    }
  },

  /**
   * Handle UPC lookup form submission
   * @param {Event} event - Form submission event
   */
  handleUpcLookup(event) {
    event.preventDefault();
    const upcInput = document.getElementById('upc-input');
    if (upcInput && upcInput.value.trim()) {
      this.lookupUpc(upcInput.value.trim());
    }
  },

  /**
   * Look up UPC code using the API
   * @param {String} upcCode - UPC code to look up
   */
  async lookupUpc(upcCode) {
    try {
      this.showLoadingState();
      
      // Close the scanner modal
      const modal = document.getElementById('upc-modal');
      if (modal) {
        modal.style.display = 'none';
      }
      
      console.log('Looking up UPC code:', upcCode);
      
      // Make the UPC lookup request
      console.log('Making UPC lookup request for:', upcCode);
      const response = await fetch(`/api/marketplace/upc/${upcCode}`);
      const data = await response.json();
      console.log('UPC lookup response:', data);
      
      if (data.success) {
        // Populate form fields with product info
        this.populateProductInfo(data.data || data.product);
        
        // Check if this is fallback data and show a notification
        const productData = data.data || data.product;
        if (productData && productData.isGenericFallback) {
          console.log('Received generic fallback data for UPC:', upcCode);
          // Show a notification that this is generic data
          this.displayNotification('Product not found in database. Using generic information that you can edit.');
        }
      } else {
        // This should rarely happen now with our fallback mechanism
        this.displayError(data.message || 'Product not found');
      }
    } catch (error) {
      console.error('Error looking up UPC:', error);
      this.displayError('Failed to look up UPC code: ' + error.message);
    } finally {
      this.hideLoadingState();
    }
  },

  /**
   * Populate product information in the form fields
   * @param {Object} product - Product information from API
   */
  populateProductInfo(product) {
    console.log('Populating product info:', product);
    
    // Get form fields using both possible IDs
    const titleField = document.getElementById('listing-title') || document.getElementById('title') || document.getElementById('name');
    const descriptionField = document.getElementById('listing-description') || document.getElementById('description');
    const upcField = document.getElementById('listing-upc') || document.getElementById('upc');
    
    // Handle different response formats
    const productData = product.product || product;
    console.log('Processed product data:', productData);
    
    // Check if this is fallback data
    const isFallback = productData.isGenericFallback === true;
    console.log('Is fallback data:', isFallback);
    
    // Populate fields if they exist
    if (titleField && productData.description) {
      titleField.value = productData.description;
      console.log('Set title to:', productData.description);
      
      // If this is fallback data, select the text so user can easily replace it
      if (isFallback) {
        setTimeout(() => {
          titleField.select();
          titleField.focus();
        }, 500);
      }
    }
    
    if (descriptionField) {
      let description = '';
      if (productData.brandName) {
        description += `Brand: ${productData.brandName}\n`;
      }
      if (productData.ingredients) {
        description += `Ingredients: ${productData.ingredients}\n`;
      }
      if (productData.description && !titleField) {
        description += `Product: ${productData.description}\n`;
      }
      
      // If this is fallback data, add a note
      if (isFallback) {
        description += '\n(This is generic information. Please edit with actual product details)\n';
      }
      
      descriptionField.value = description.trim() || 'No product details available';
      console.log('Set description to:', description);
    }
    
    if (upcField && productData.upc) {
      upcField.value = productData.upc;
      console.log('Set UPC to:', productData.upc);
    }
    
    // Store the product data for later use
    const resultsEl = document.getElementById('upc-results');
    if (resultsEl) {
      resultsEl.dataset.productInfo = JSON.stringify(productData);
      
      // Add a visual indicator if this is fallback data
      if (isFallback) {
        resultsEl.classList.add('fallback-data');
      } else {
        resultsEl.classList.remove('fallback-data');
      }
    }
    
    // Show success message
    this.displayProductInfo(productData);
  },

  /**
   * Display product information in the UPC modal
   * @param {Object} productInfo - Product information from API
   */
  displayProductInfo(productInfo) {
    const productNameEl = document.getElementById('product-name');
    const productBrandEl = document.getElementById('product-brand');
    const productIngredientsEl = document.getElementById('product-ingredients');
    const productNutrientsEl = document.getElementById('product-nutrients');
    const upcResultsEl = document.getElementById('upc-results');
    
    if (productNameEl) productNameEl.textContent = productInfo.description || 'N/A';
    if (productBrandEl) productBrandEl.textContent = productInfo.brandName || 'N/A';
    if (productIngredientsEl) productIngredientsEl.textContent = productInfo.ingredients || 'Not available';
    
    // Display nutrients if available (support both foodNutrients and nutrients formats)
    if (productNutrientsEl) {
      productNutrientsEl.innerHTML = '';
      const rawNutrients = Array.isArray(productInfo.foodNutrients)
        ? productInfo.foodNutrients
        : (Array.isArray(productInfo.nutrients) ? productInfo.nutrients : []);
      
      const nutrientsToShow = rawNutrients.slice(0, 5);
      
      if (nutrientsToShow.length > 0) {
        const nutrientsList = document.createElement('ul');
        nutrientsToShow.forEach(nutrient => {
          const name = nutrient.nutrientName || nutrient.name || 'Nutrient';
          const value = (nutrient.value !== undefined ? nutrient.value : nutrient.amount) ?? '';
          const unit = nutrient.unitName || nutrient.unit || '';
          const listItem = document.createElement('li');
          listItem.textContent = `${name}: ${value} ${unit}`.trim();
          nutrientsList.appendChild(listItem);
        });
        productNutrientsEl.appendChild(nutrientsList);
      } else {
        productNutrientsEl.textContent = 'No nutritional information available';
      }
    }
    
    // Store the product data for later use
    if (upcResultsEl) {
      upcResultsEl.dataset.productInfo = JSON.stringify(productInfo);
    }
    
    // Show the results section
    this.showUpcResults();
  },

  /**
   * Display error message
   * @param {String} message - Error message to display
   */
  displayError(message) {
    const errorEl = document.getElementById('upc-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
    
    const resultsEl = document.getElementById('upc-results');
    if (resultsEl) {
      resultsEl.style.display = 'none';
    }
  },
  
  /**
   * Display notification message
   * @param {String} message - Notification message to display
   */
  displayNotification(message) {
    // First check if we have a dedicated notification element
    const notificationEl = document.getElementById('upc-notification');
    
    if (notificationEl) {
      // Use the dedicated notification element
      notificationEl.textContent = message;
      notificationEl.style.display = 'block';
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        notificationEl.style.display = 'none';
      }, 5000);
    } else {
      // Fallback to using the error element with a different style
      const errorEl = document.getElementById('upc-error');
      if (errorEl) {
        // Save the original background color
        const originalBackground = errorEl.style.backgroundColor;
        
        // Change to a notification style (yellow background)
        errorEl.style.backgroundColor = '#fff3cd';
        errorEl.style.color = '#856404';
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        
        // Auto-hide after 5 seconds and restore original style
        setTimeout(() => {
          errorEl.style.display = 'none';
          errorEl.style.backgroundColor = originalBackground;
          errorEl.style.color = '';
        }, 5000);
      }
    }
  },

  /**
   * Show loading state during UPC lookup
   */
  showLoadingState() {
    const loaderEl = document.getElementById('upc-loader');
    if (loaderEl) {
      loaderEl.style.display = 'block';
    }
    
    const errorEl = document.getElementById('upc-error');
    if (errorEl) {
      errorEl.style.display = 'none';
    }
    
    const resultsEl = document.getElementById('upc-results');
    if (resultsEl) {
      resultsEl.style.display = 'none';
    }
  },

  /**
   * Hide loading state after UPC lookup
   */
  hideLoadingState() {
    const loaderEl = document.getElementById('upc-loader');
    if (loaderEl) {
      loaderEl.style.display = 'none';
    }
  },

  /**
   * Show UPC results section
   */
  showUpcResults() {
    const resultsEl = document.getElementById('upc-results');
    if (resultsEl) {
      resultsEl.style.display = 'block';
    }
    
    const errorEl = document.getElementById('upc-error');
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  },

  /**
   * Show manual UPC entry form
   */
  showManualUpcEntry() {
    const scannerEl = document.getElementById('scanner-container');
    const manualEntryEl = document.getElementById('manual-entry-container');
    
    if (scannerEl) scannerEl.style.display = 'none';
    if (manualEntryEl) manualEntryEl.style.display = 'block';
    
    // Stop scanner if it's running
    if (typeof Quagga !== 'undefined') {
      Quagga.stop();
    }
  },

  /**
   * Close UPC modal
   */
  closeUpcModal() {
    const modal = document.getElementById('upc-modal');
    if (modal) {
      modal.style.display = 'none';
    }
    
    // Stop scanner if it's running
    if (typeof Quagga !== 'undefined') {
      Quagga.stop();
    }
  },

  /**
   * Use UPC data in the listing form
   */
  useUpcData() {
    const resultsEl = document.getElementById('upc-results');
    if (!resultsEl || !resultsEl.dataset.productInfo) return;
    
    try {
      const productInfo = JSON.parse(resultsEl.dataset.productInfo);
      
      // Fill in the listing form with product information
      const titleInput = document.getElementById('listing-title') || document.getElementById('title');
      const descriptionInput = document.getElementById('listing-description') || document.getElementById('description');
      const upcInput = document.getElementById('listing-upc');
      
      if (titleInput && productInfo.description) {
        titleInput.value = productInfo.description;
      }
      
      if (descriptionInput && productInfo.ingredients) {
        let description = `Brand: ${productInfo.brandName || 'Unknown'}\n`;
        description += `Ingredients: ${productInfo.ingredients || 'Not available'}\n`;
        
        // Add existing description if any
        if (descriptionInput.value) {
          description += `\n${descriptionInput.value}`;
        }
        
        descriptionInput.value = description;
      }
      
      if (upcInput && productInfo.upc) {
        upcInput.value = productInfo.upc;
      }
      
      // Close the modal
      this.closeUpcModal();
    } catch (error) {
      console.error('Error using UPC data:', error);
    }
  }
};

// Initialize UPC lookup when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  UpcLookup.init();
});
