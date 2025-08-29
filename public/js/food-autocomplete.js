/**
 * Food Item Autocomplete
 * Provides autocomplete functionality for food items using the USDA database
 */

class FoodAutocomplete {
  constructor(inputElement, options = {}) {
    this.input = inputElement;
    this.options = {
      minLength: 2,
      debounceTime: 300,
      maxResults: 10,
      ...options
    };
    
    this.resultsContainer = null;
    this.debounceTimer = null;
    this.selectedIndex = -1;
    this.results = [];
    
    this.init();
  }
  
  init() {
    // Create results container
    this.createResultsContainer();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  createResultsContainer() {
    // Create container for autocomplete results
    const parent = this.input.parentElement;
    parent.classList.add('autocomplete-container');
    
    this.resultsContainer = document.createElement('div');
    this.resultsContainer.className = 'autocomplete-results';
    parent.appendChild(this.resultsContainer);
  }
  
  setupEventListeners() {
    // Input event for typing
    this.input.addEventListener('input', () => {
      this.onInput();
    });
    
    // Keyboard navigation
    this.input.addEventListener('keydown', (e) => {
      this.onKeyDown(e);
    });
    
    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!this.input.contains(e.target) && !this.resultsContainer.contains(e.target)) {
        this.hideResults();
      }
    });
  }
  
  onInput() {
    const query = this.input.value.trim();
    
    // Clear any existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Clear results if query is too short
    if (query.length < this.options.minLength) {
      this.hideResults();
      return;
    }
    
    // Set debounce timer
    this.debounceTimer = setTimeout(() => {
      this.fetchResults(query);
    }, this.options.debounceTime);
  }
  
  onKeyDown(e) {
    // If results are not shown, don't handle navigation keys
    if (!this.resultsContainer.classList.contains('show')) {
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectNext();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectPrevious();
        break;
      case 'Enter':
        e.preventDefault();
        this.selectCurrent();
        break;
      case 'Escape':
        e.preventDefault();
        this.hideResults();
        break;
    }
  }
  
  async fetchResults(query) {
    // Show loading indicator
    this.showLoading();
    
    try {
      // Fetch results from API
      const response = await fetch(`/api/marketplace/food-search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        this.results = data.data.slice(0, this.options.maxResults);
        this.renderResults();
      } else {
        this.showNoResults();
      }
    } catch (error) {
      console.error('Error fetching autocomplete results:', error);
      this.showNoResults();
    }
  }
  
  renderResults() {
    // Clear previous results
    this.resultsContainer.innerHTML = '';
    
    // Create result items
    this.results.forEach((item, index) => {
      const resultItem = document.createElement('div');
      resultItem.className = 'autocomplete-item';
      resultItem.innerHTML = `
        <div class="item-description">${item.description}</div>
        ${item.category ? `<div class="item-category">${item.category}</div>` : ''}
      `;
      
      // Add click event
      resultItem.addEventListener('click', () => {
        this.selectItem(index);
      });
      
      this.resultsContainer.appendChild(resultItem);
    });
    
    // Show results
    this.showResults();
    this.selectedIndex = -1;
  }
  
  showResults() {
    this.resultsContainer.classList.add('show');
  }
  
  hideResults() {
    this.resultsContainer.classList.remove('show');
    this.selectedIndex = -1;
  }
  
  showLoading() {
    this.resultsContainer.innerHTML = '<div class="autocomplete-loading">Searching...</div>';
    this.showResults();
  }
  
  showNoResults() {
    this.resultsContainer.innerHTML = '<div class="autocomplete-no-results">No results found</div>';
    this.showResults();
    this.results = [];
  }
  
  selectNext() {
    if (this.results.length === 0) return;
    
    // Remove selected class from current item
    this.clearSelection();
    
    // Select next item
    this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
    this.highlightSelected();
  }
  
  selectPrevious() {
    if (this.results.length === 0) return;
    
    // Remove selected class from current item
    this.clearSelection();
    
    // Select previous item
    this.selectedIndex = (this.selectedIndex - 1 + this.results.length) % this.results.length;
    this.highlightSelected();
  }
  
  selectCurrent() {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.results.length) {
      this.selectItem(this.selectedIndex);
    }
  }
  
  selectItem(index) {
    const item = this.results[index];
    if (item) {
      this.input.value = item.description;
      this.hideResults();
      
      // Trigger change event
      const event = new Event('change', { bubbles: true });
      this.input.dispatchEvent(event);
      
      // If we have a callback, call it
      if (this.options.onSelect) {
        this.options.onSelect(item);
      }
    }
  }
  
  clearSelection() {
    const items = this.resultsContainer.querySelectorAll('.autocomplete-item');
    items.forEach(item => item.classList.remove('selected'));
  }
  
  highlightSelected() {
    const items = this.resultsContainer.querySelectorAll('.autocomplete-item');
    if (this.selectedIndex >= 0 && this.selectedIndex < items.length) {
      items[this.selectedIndex].classList.add('selected');
      
      // Scroll into view if needed
      items[this.selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const itemInput = document.getElementById('title');
  if (itemInput) {
    new FoodAutocomplete(itemInput, {
      onSelect: (item) => {
        // Optionally update other fields based on the selected item
        const descriptionInput = document.getElementById('description');
        if (descriptionInput && item.category) {
          // If description is empty, add the category
          if (!descriptionInput.value.trim()) {
            descriptionInput.value = `Category: ${item.category}\n\nAdd more details about your ${item.description} here.`;
          }
        }
      }
    });
  }
});
