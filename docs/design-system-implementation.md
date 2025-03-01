# FreshShare Design System Implementation Guide

This guide provides practical instructions for implementing the FreshShare Design System in your HTML and CSS.

## Importing the Design System

All pages should include these CSS files in the following order:

```html
<link rel="stylesheet" href="/css/color-system.css">
<link rel="stylesheet" href="/css/design-system.css">
<link rel="stylesheet" href="/css/main.css">
```

## Using Components

### Buttons

Use the predefined button classes for consistency:

```html
<!-- Primary Button -->
<button class="btn btn-primary">Primary Action</button>

<!-- Secondary Button -->
<button class="btn btn-secondary">Secondary Action</button>

<!-- Accent Button -->
<button class="btn btn-accent">Accent Action</button>

<!-- Complementary Button -->
<button class="btn btn-complementary">Info Action</button>
```

### Cards

Use the card component for content containers:

```html
<div class="card">
  <img src="image.jpg" class="card-img-top" alt="Image description">
  <div class="card-body">
    <h3 class="card-title">Card Title</h3>
    <p class="card-text">Card content goes here...</p>
    <button class="btn btn-primary">Call to Action</button>
  </div>
</div>
```

### Forms

Use the form component styles:

```html
<div class="form-card">
  <h1>Sign Up</h1>
  <p>Create your account</p>
  
  <form>
    <div class="form-group">
      <label for="name">Name</label>
      <input type="text" id="name" class="form-control">
    </div>
    
    <div class="form-group">
      <label for="email">Email</label>
      <input type="email" id="email" class="form-control">
    </div>
    
    <button type="submit" class="submit-btn">Sign Up</button>
  </form>
</div>
```

### Grid Layout

Use the grid system for responsive layouts:

```html
<div class="grid grid-cols-3">
  <div>Column 1</div>
  <div>Column 2</div>
  <div>Column 3</div>
</div>
```

For responsive behavior, the grid will automatically adjust based on screen size:
- On mobile screens, all columns will stack
- On tablets, 3-column and 4-column grids will become 2-column grids
- On desktop, all columns will display as specified

### Flex Layout

Use the flex utility classes for flexible layouts:

```html
<!-- Centered content horizontally and vertically -->
<div class="flex items-center justify-center">
  <p>Centered content</p>
</div>

<!-- Row with space between items -->
<div class="flex justify-between items-center">
  <div>Left content</div>
  <div>Right content</div>
</div>

<!-- Column layout with gap -->
<div class="flex flex-col gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

### Section Layout

Use the section component for page sections:

```html
<section class="section">
  <div class="container">
    <div class="section-header">
      <h2 class="section-title">Section Title</h2>
      <p class="section-subtitle">Section subtitle or description text</p>
    </div>
    
    <!-- Section content goes here -->
  </div>
</section>
```

## Using Design Tokens Directly

When creating custom styles, always use the design tokens:

```css
.custom-element {
  /* Use color tokens */
  background-color: var(--primary-faded);
  color: var(--text-dark);
  
  /* Use spacing tokens */
  padding: var(--space-4);
  margin-bottom: var(--space-6);
  
  /* Use typography tokens */
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  
  /* Use shadow tokens */
  box-shadow: var(--shadow-md);
  
  /* Use border tokens */
  border: var(--border-1) solid var(--border);
  border-radius: var(--radius-md);
  
  /* Use transition tokens */
  transition: var(--transition-normal);
}
```

## Common Page Patterns

### Page Header

```html
<header class="navbar">
  <div class="nav-container">
    <div class="logo-container">
      <a href="/" class="logo-text">Fresh<span>Share</span></a>
    </div>
    
    <nav>
      <ul class="nav-links">
        <li><a href="/" class="nav-link active">Home</a></li>
        <li><a href="/about" class="nav-link">About</a></li>
        <li><a href="/marketplace" class="nav-link">Marketplace</a></li>
        <li><a href="/contact" class="nav-link">Contact</a></li>
      </ul>
    </nav>
    
    <div class="auth-buttons">
      <a href="/login" class="btn btn-secondary">Login</a>
      <a href="/signup" class="btn btn-primary">Sign Up</a>
    </div>
  </div>
</header>
```

### Hero Section

```html
<section class="hero">
  <div class="container">
    <div class="hero-content">
      <h1 class="hero-title">Welcome to FreshShare</h1>
      <p class="hero-subtitle">Connect with neighbors and share fresh produce.</p>
      <div class="hero-buttons">
        <a href="/signup" class="btn btn-primary">Get Started</a>
        <a href="/about" class="btn btn-secondary">Learn More</a>
      </div>
    </div>
  </div>
</section>
```

### Features Section

```html
<section class="features-section">
  <div class="container">
    <div class="section-header">
      <h2 class="section-title">Our Features</h2>
      <p class="section-subtitle">Discover what makes FreshShare special</p>
    </div>
    
    <div class="grid grid-cols-3">
      <div class="feature-card">
        <div class="feature-icon">🍎</div>
        <h3 class="feature-title">Local Produce</h3>
        <p class="feature-description">Connect with neighbors growing fresh fruits and vegetables.</p>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">👨‍👩‍👧‍👦</div>
        <h3 class="feature-title">Community Focus</h3>
        <p class="feature-description">Build relationships with people in your neighborhood.</p>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">♻️</div>
        <h3 class="feature-title">Reduce Waste</h3>
        <p class="feature-description">Share excess produce instead of letting it go to waste.</p>
      </div>
    </div>
  </div>
</section>
```

## Migrating Existing Components

When migrating existing components to use the design system:

1. Replace hard-coded color values with design tokens
2. Replace spacing values with spacing tokens
3. Replace typography declarations with typography tokens
4. Replace shadows and borders with their respective tokens
5. Use utility classes where appropriate

## Best Practices

1. Avoid overriding design tokens
2. Don't mix design system usage with hard-coded values
3. Create reusable components rather than one-off styles
4. Test on multiple screen sizes for responsive behavior
5. Consider accessibility in all design decisions

For more details on the available tokens and their usage, refer to the [Design System Guide](design-system-guide.md).
