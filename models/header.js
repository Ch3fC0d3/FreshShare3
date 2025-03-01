/**
 * FreshShare Header Component
 * This file contains functionality for the FreshShare header including:
 * - Mobile menu toggle
 * - User dropdown menu
 * - Scroll behavior
 */

class FreshShareHeader {
  constructor() {
    // DOM Elements
    this.header = document.querySelector('.fs-header');
    this.mobileToggle = document.querySelector('.fs-mobile-toggle');
    this.nav = document.querySelector('.fs-nav');
    this.navLinks = document.querySelectorAll('.fs-nav-link');
    this.userProfile = document.querySelector('.fs-user-profile');
    this.dropdown = document.querySelector('.fs-dropdown');
    this.bars = document.querySelectorAll('.fs-bar');
    
    // Initialize
    this.init();
  }
  
  init() {
    // Add event listeners
    this.addEventListeners();
    this.setActiveNavLink();
  }
  
  addEventListeners() {
    // Mobile menu toggle
    if (this.mobileToggle) {
      this.mobileToggle.addEventListener('click', () => this.toggleMobileMenu());
    }
    
    // User profile dropdown
    if (this.userProfile) {
      this.userProfile.addEventListener('click', (e) => this.toggleDropdown(e));
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => this.handleOutsideClick(e));
    
    // Scroll event for header shadow
    window.addEventListener('scroll', () => this.handleScroll());
    
    // Add click event to nav links on mobile
    this.navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          this.closeMobileMenu();
        }
      });
    });
  }
  
  toggleMobileMenu() {
    this.nav.classList.toggle('active');
    this.toggleBars();
    document.body.classList.toggle('fs-no-scroll');
  }
  
  closeMobileMenu() {
    this.nav.classList.remove('active');
    this.resetBars();
    document.body.classList.remove('fs-no-scroll');
  }
  
  toggleBars() {
    if (this.bars.length >= 3) {
      this.bars[0].classList.toggle('fs-rotated-up');
      this.bars[1].classList.toggle('fs-hidden');
      this.bars[2].classList.toggle('fs-rotated-down');
    }
  }
  
  resetBars() {
    if (this.bars.length >= 3) {
      this.bars[0].classList.remove('fs-rotated-up');
      this.bars[1].classList.remove('fs-hidden');
      this.bars[2].classList.remove('fs-rotated-down');
    }
  }
  
  toggleDropdown(e) {
    e.stopPropagation();
    if (this.dropdown) {
      this.dropdown.classList.toggle('active');
    }
  }
  
  handleOutsideClick(e) {
    if (this.dropdown && !this.userProfile.contains(e.target) && this.dropdown.classList.contains('active')) {
      this.dropdown.classList.remove('active');
    }
  }
  
  handleScroll() {
    if (window.scrollY > 10) {
      this.header.classList.add('fs-header-scrolled');
    } else {
      this.header.classList.remove('fs-header-scrolled');
    }
  }
  
  setActiveNavLink() {
    const currentPath = window.location.pathname;
    
    this.navLinks.forEach(link => {
      const href = link.getAttribute('href');
      link.classList.remove('active');
      
      if (href === currentPath || 
          (href !== '/' && currentPath.startsWith(href)) ||
          (href === '/' && currentPath === '/')) {
        link.classList.add('active');
      }
    });
  }
}

// Initialize the header when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new FreshShareHeader();
});

// Export for potential future module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FreshShareHeader;
}