# CSS Consolidation Strategy for FreshShare

## Current State

The FreshShare project currently uses multiple CSS approaches:

1. **Multiple CSS files**:
   - Global stylesheets: `/css/styles.css` and `/css/style.css`
   - Component-specific CSS files in `/css/components/` folder
   - Other CSS files like `/css/contact.css`

2. **Inline styles** embedded in EJS templates using the `contentFor('style')` section

3. **Inconsistent CSS variables** defined in multiple places:
   - Different `:root` variable definitions in both global CSS files and in page-specific styles
   - Different color schemes and naming conventions across files

## Consolidation Plan

### 1. Created a Single Main CSS File

A consolidated `main.css` file has been created at `/public/css/main.css` that includes:

- A unified set of CSS variables (colors, spacing, shadows, etc.)
- Base styles for common elements
- Layout components (header, footer, cards, forms, etc.)
- Page-specific styles
- Responsive design rules

### 2. Updated Layout Template

The `layout.ejs` file has been updated to:
- Remove references to the old CSS files (`styles.css` and `style.css`)
- Add a reference to the new consolidated `main.css` file

### 3. Next Steps for the Team

To complete the CSS consolidation:

1. **Remove inline styles** from all EJS templates:
   - Replace the `contentFor('style')` sections with `<!-- All styles moved to main.css -->`
   - Example:
     ```ejs
     <%- contentFor('style') %>
     <!-- All styles moved to main.css -->
     ```

2. **Test all pages** to ensure they still look correct after removing inline styles

3. **Maintain the consolidated approach** by:
   - Always adding new styles to `main.css` instead of creating new CSS files
   - Using the established CSS variables for consistency
   - Following the established naming conventions and organization

4. **Optional: Remove old CSS files** once you've confirmed everything is working correctly:
   - `/css/styles.css`
   - `/css/style.css`
   - All files in `/css/components/`
   - `/css/contact.css`

## CSS Organization in main.css

The `main.css` file is organized into sections:

1. **Variables** - CSS custom properties for colors, spacing, etc.
2. **Base Styles** - Default styling for HTML elements
3. **Layout** - Container and structural components
4. **Components** - Reusable UI elements (buttons, cards, forms)
5. **Page-specific styles** - Styles for specific pages
6. **Responsive styles** - Media queries for different screen sizes

## Benefits of Consolidation

- **Improved performance** - Fewer HTTP requests
- **Easier maintenance** - One file to update instead of many
- **Consistent design** - Unified variables and naming conventions
- **Reduced duplication** - No repeated styles across files
- **Simplified development** - Clear organization and structure
