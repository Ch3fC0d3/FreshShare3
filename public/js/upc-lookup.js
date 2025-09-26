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
    // Auto-initialize the scanner on page load only if feature flag is enabled
    try {
      if (window.FeatureFlags && window.FeatureFlags.scannerAutoStart) {
        this.setupUpcScanner();
      } else {
        console.log('Scanner auto-start on page load is disabled by feature flag');
      }
    } catch (e) {
      console.warn('Scanner init on load failed:', e);
    }
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
    
    // Initialize Quagga with improved camera constraints and locator settings
    Quagga.init({
      inputStream: {
        name: 'Live',
        type: 'LiveStream',
        target: scannerContainer,
        willReadFrequently: true, // Optimize canvas performance
        constraints: {
          facingMode: { ideal: 'environment' }, // back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 1.7777777778 },
          frameRate: { ideal: 30, max: 60 },
          // Request continuous focus when supported
          advanced: [{ focusMode: 'continuous' }]
        }
      },
      locator: {
        patchSize: 'large', // larger search window helps at higher resolution
        halfSample: false
      },
      numOfWorkers: 2,
      frequency: 15,
      decoder: {
        readers: ['upc_reader', 'upc_e_reader', 'ean_reader', 'ean_8_reader']
      },
      // Enable locating to improve real-world detection stability
      locate: true
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

      // Try to improve focus/UX on supported browsers
      try {
        const video = scannerContainer.querySelector('video');
        if (video) {
          video.setAttribute('playsinline', 'true');
          video.setAttribute('autoplay', 'true');
          // iOS Safari often requires muted autoplay
          video.muted = true;
        }

        const stream = video && video.srcObject;
        const track = stream && stream.getVideoTracks && stream.getVideoTracks()[0];
        if (track) {
          const caps = (track.getCapabilities && track.getCapabilities()) || {};
          const settings = (track.getSettings && track.getSettings()) || {};

          // Prefer continuous focus if available, else single-shot
          if (caps.focusMode) {
            const modes = Array.isArray(caps.focusMode) ? caps.focusMode : [caps.focusMode];
            if (modes.includes('continuous')) {
              track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(()=>{});
            } else if (modes.includes('single-shot')) {
              track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] }).catch(()=>{});
            }
          }

          // Tap to refocus (where supported)
          scannerContainer.addEventListener('click', () => {
            if (!track) return;
            const caps2 = (track.getCapabilities && track.getCapabilities()) || {};
            if (caps2.focusMode) {
              const modes2 = Array.isArray(caps2.focusMode) ? caps2.focusMode : [caps2.focusMode];
              const desired = modes2.includes('single-shot') ? 'single-shot' : (modes2.includes('continuous') ? 'continuous' : null);
              if (desired) track.applyConstraints({ advanced: [{ focusMode: desired }] }).catch(()=>{});
            }
          });

          // Optional: maintain some zoom if device supports it (no UI, just keep current)
          if (caps.zoom && typeof settings.zoom === 'number') {
            track.applyConstraints({ advanced: [{ zoom: settings.zoom }] }).catch(()=>{});
          }

          // Torch (flash) toggle support
          const torchBtn = document.getElementById('toggle-torch-btn');
          let torchOn = false;
          const hasTorch = !!(caps.torch || (Array.isArray(caps.fillLightMode) && caps.fillLightMode.includes('flash')));
          if (torchBtn) {
            if (hasTorch) {
              torchBtn.style.display = '';
              torchBtn.addEventListener('click', async () => {
                torchOn = !torchOn;
                try {
                  await track.applyConstraints({ advanced: [{ torch: torchOn }] });
                } catch (_) {
                  // Some browsers expose fillLightMode instead of torch; ignore failures silently
                }
                torchBtn.classList.toggle('active', torchOn);
              });
            } else {
              torchBtn.style.display = 'none';
            }
          }

          // Zoom slider support
          const zoomCtl = document.getElementById('zoom-control');
          const zoomSlider = document.getElementById('zoom-slider');
          if (zoomCtl && zoomSlider && caps.zoom) {
            try {
              const min = typeof caps.zoom.min === 'number' ? caps.zoom.min : 1;
              const max = typeof caps.zoom.max === 'number' ? caps.zoom.max : 5;
              const step = typeof caps.zoom.step === 'number' ? caps.zoom.step : 0.1;
              zoomSlider.min = String(min);
              zoomSlider.max = String(max);
              zoomSlider.step = String(step);
              zoomSlider.value = String(typeof settings.zoom === 'number' ? settings.zoom : min);
              zoomCtl.style.display = '';
              zoomSlider.addEventListener('input', () => {
                const z = Number(zoomSlider.value);
                track.applyConstraints({ advanced: [{ zoom: z }] }).catch(()=>{});
              });
            } catch (_) {
              zoomCtl.style.display = 'none';
            }
          } else if (zoomCtl) {
            zoomCtl.style.display = 'none';
          }
        }
      } catch (_) {}

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
      const rawCode = result.codeResult.code;
      const format = result.codeResult.format || 'unknown';
      console.log('Barcode detected:', rawCode, 'format:', format);

      // Normalize code to the most likely UPC-A/EAN-13 form
      const candidates = this.generateUpcVariants(rawCode);
      // Prefer 12-digit UPC-A, else 13-digit EAN with leading 0, else longest candidate
      let best = candidates.find(c => /^\d{12}$/.test(c))
              || candidates.find(c => /^0\d{12}$/.test(c))
              || candidates.sort((a,b)=>b.length-a.length)[0]
              || rawCode;
      console.log('Normalized UPC candidate selected:', best, 'from', candidates);
      
      // Stop scanner after successful detection
      Quagga.stop();
      
      // Look up the UPC code
      this.lookupUpc(best);
    }
  },

  // --- UPC normalization helpers (client-side) ---
  generateUpcVariants(input) {
    try {
      const raw = String(input || '').replace(/\D/g, '');
      const set = new Set();
      if (!raw) return [];
      set.add(raw);
      if (raw.length === 11) set.add(raw + this.calculateUpcACheckDigit(raw));
      if (raw.length === 8) {
        const expanded = this.expandUpcEToUpcA(raw);
        if (expanded) set.add(expanded);
      }
      if (raw.length === 12) set.add('0' + raw);
      if (raw.length === 13 && raw.startsWith('0')) set.add(raw.substring(1));
      if (raw.length < 12) set.add(raw.padStart(12, '0'));
      if (raw.length < 13) set.add(raw.padStart(13, '0'));
      return Array.from(set);
    } catch (e) {
      return [String(input || '')];
    }
  },
  expandUpcEToUpcA(upcE) {
    const s = String(upcE || '').replace(/\D/g, '');
    if (s.length !== 8) return null;
    const ns = s[0];
    const x1 = s[1], x2 = s[2], x3 = s[3], x4 = s[4], x5 = s[5], x6 = s[6];
    let manufacturer, product;
    if (x6 >= '0' && x6 <= '2') {
      manufacturer = `${x1}${x2}${x6}`;
      product = `00000${x3}${x4}${x5}`;
    } else if (x6 === '3') {
      manufacturer = `${x1}${x2}${x3}`;
      product = `00000${x4}${x5}`;
      product = product.padStart(6, '0');
    } else if (x6 === '4') {
      manufacturer = `${x1}${x2}${x3}${x4}`;
      product = `0000${x5}`;
      product = product.padStart(6, '0');
    } else {
      manufacturer = `${x1}${x2}${x3}${x4}${x5}`;
      product = `0000${x6}`;
    }
    const eleven = `${ns}${manufacturer}${product}`;
    if (eleven.length !== 11) return null;
    const check = this.calculateUpcACheckDigit(eleven);
    return eleven + check;
  },
  calculateUpcACheckDigit(eleven) {
    const s = String(eleven || '').replace(/\D/g, '');
    if (s.length !== 11) return '';
    let odd = 0, even = 0;
    for (let i = 0; i < 11; i++) {
      const d = parseInt(s[i], 10) || 0;
      if ((i % 2) === 0) odd += d; else even += d;
    }
    const total = odd * 3 + even;
    const mod = total % 10;
    return String((10 - mod) % 10);
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
    // Set hidden imageUrl field if available
    try {
      const imageUrlField = document.getElementById('imageUrl');
      if (imageUrlField) {
        const url = productData && typeof productData.imageUrl === 'string' ? productData.imageUrl : '';
        imageUrlField.value = url || '';
      }
    } catch (_) {}
    
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
      // Ensure hidden imageUrl field is set when user applies UPC data
      try {
        const imageUrlField = document.getElementById('imageUrl');
        if (imageUrlField) {
          const url = productInfo && typeof productInfo.imageUrl === 'string' ? productInfo.imageUrl : '';
          imageUrlField.value = url || '';
        }
      } catch (_) {}
      
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
