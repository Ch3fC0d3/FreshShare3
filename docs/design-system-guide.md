# FreshShare Design System Guide

## Overview

The FreshShare Design System is a comprehensive collection of design tokens, styles, and components that ensure consistency, accessibility, and maintainability across the FreshShare web application. This guide provides an overview of the system and how to use it effectively.

## Design System Structure

The FreshShare Design System is organized into several key CSS files:

1. **color-system.css** - Contains all color variables and tokens
2. **design-system.css** - Contains typography, spacing, shadows, and other design tokens
3. **main.css** - Implements the design system variables in actual component styles

## Color System

The color system follows a semantic naming approach with a primary green color, accent orange color, and neutral grayscale. All colors come with a range of tints and shades from 50-900.

### Primary Colors

- `--primary-color`: The main green brand color
- `--primary-light`, `--primary-lighter`, `--primary-faded`: Lighter variations
- `--primary-dark`, `--primary-darker`: Darker variations

### Accent Colors

- `--accent-color`: Orange accent color 
- `--accent-light`, `--accent-dark`: Lighter and darker variations

### Semantic Colors

- `--success-color`: For success states and messages
- `--warning-color`: For warning states and messages
- `--error-color`: For error states and messages
- `--info-color`: For informational states and messages

### Text Colors

- `--text-dark`: Primary text color
- `--text-medium`: Secondary text color
- `--text-light`: Tertiary text color
- `--text-muted`: Muted text color

## Typography

The typography system includes font sizes, weights, and line heights:

- Font sizes: `--text-xs` through `--text-6xl`
- Font weights: `--font-light` through `--font-extrabold`
- Line heights: `--leading-none` through `--leading-loose`

## Spacing

Consistent spacing scale for margins, padding, and gaps:

- `--space-0` through `--space-24` with exponential growth
- `--space-px` for 1px spacing

## Borders & Radii

Border width and radius tokens:

- `--border-0` through `--border-8` for border widths
- `--radius-none` through `--radius-full` for border radii

## Shadows

Shadow tokens for different elevation levels:

- `--shadow-sm` through `--shadow-2xl`
- `--shadow-inner` for inset shadows
- `--focus-ring-green` for focus states

## Transitions

Standard transition tokens:

- `--transition-normal`: Standard transition
- `--transition-slow`: Slower transition
- `--transition-fast`: Faster transition

## Z-index Management

Z-index tokens to manage stacking context:

- `--z-0` through `--z-auto`

## Layout

Container width tokens:

- `--container-max-width`: Maximum width for main container
- `--container-sm` through `--container-xl`: Responsive container widths

## Utility Classes

The design system includes utility classes for:

- Grid layouts
- Flexbox layouts
- Spacing
- Typography

## Usage Examples

### Using Color Variables

```css
.button {
    background-color: var(--primary-color);
    color: var(--white);
}

.button:hover {
    background-color: var(--primary-dark);
}
```

### Using Spacing Variables

```css
.card {
    padding: var(--space-4);
    margin-bottom: var(--space-6);
    gap: var(--space-2);
}
```

### Using Typography Variables

```css
.heading {
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    line-height: var(--leading-tight);
}
```

### Using Shadow Variables

```css
.card {
    box-shadow: var(--shadow-md);
}

.card:hover {
    box-shadow: var(--shadow-lg);
}
```

## Best Practices

1. **Always use variables instead of hard-coded values**
   - Prefer `var(--primary-color)` over `#4CAF50`
   - Prefer `var(--space-4)` over `1rem`

2. **Use semantic color names for appropriate contexts**
   - Use `--success-color` for success messages
   - Use `--error-color` for error states

3. **Follow the spacing scale**
   - Use the predefined spacing scale rather than arbitrary values

4. **Leverage utility classes when appropriate**
   - Use the grid and flex utilities for layout needs

5. **Maintain backward compatibility**
   - Legacy variables are supported but prefer using the new system

## Future Improvements

- Dark/light mode support
- Component library
- Animation library
- Accessibility enhancements

---

This guide is a living document and will be updated as the design system evolves.
