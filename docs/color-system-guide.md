# FreshShare Color System Guide

This document provides guidance on the consolidated color system for the FreshShare application.

## Core Philosophy

The FreshShare color system has been consolidated around a single primary palette:

1. **Primary Colors**: Green-based scale (--green-50 to --green-900)
2. **Accent Colors**: Orange-based scale for calls to action (--accent-50 to --accent-900)
3. **Neutral Colors**: Gray-based scale for text, backgrounds, and borders (--gray-50 to --gray-900)

## How To Use The Color System

1. **Use semantic variables** whenever possible (e.g., `--primary-color` instead of `--green-600`)
2. For special cases, you can use the base color scale (e.g., `--green-300` for a lighter green)
3. All colors are organized in scales (50-900) where higher numbers are darker
4. When creating gradients, use colors from the same family (e.g., `--green-300` to `--green-600`)
5. For text on colored backgrounds, ensure proper contrast:
   - On dark backgrounds: use `--white` or `--gray-50`
   - On light backgrounds: use `--text-color` or `--text-dark`

## Color Categories

### Primary Color (Green)
- Base palette for most UI elements
- Represents growth, freshness, and sustainability
- Used for primary buttons, links, and key interactive elements

### Accent Color (Orange)
- Used for calls to action and highlights
- Creates visual interest and highlights important elements
- Used sparingly to guide user attention

### Neutral Colors (Grays)
- Used for text, backgrounds, and borders
- Creates visual hierarchy and structure
- Provides balance to the primary and accent colors

## Feedback Colors

- **Success**: `--success-color` (green-based)
- **Error**: `--error-color` (red)
- **Warning**: `--warning-color` (orange-based)
- **Info**: `--info-color` (blue)

## Button System

The button system uses our consolidated color palette:

- **Primary Buttons**: `--primary-color` background with `--white` text
- **Secondary Buttons**: `--white` background with `--primary-color` text and border
- **Accent Buttons**: `--accent-color` background for calls to action
- **Complementary Buttons**: `--info-color` background for informational actions

## Legacy Support

For backward compatibility, we provide legacy variables that map to our new consolidated system:

```css
--secondary-color: var(--green-600);
--complementary: var(--accent-color);
--secondary: var(--green-50);
--primary: var(--green-800);
--primary-hover: var(--green-700);
--accent: var(--accent-600);
--triadic-1: var(--info-color);
--triadic-2: var(--error-color);
```

## Examples

### Buttons
```css
.btn-primary {
    background-color: var(--primary-color);
    color: var(--white);
}

.btn-accent {
    background-color: var(--accent-color);
    color: var(--white);
}
```

### Gradients
```css
.gradient-element {
    background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary-color) 100%);
}
```

### Status Indicators
```css
.success-message {
    color: var(--success-color);
}

.error-message {
    color: var(--error-color);
}
```

## Benefits of the Consolidated System

1. **Improved Maintainability**: Changes to colors can be made in one place
2. **Better Consistency**: Standardized color usage across the application
3. **Simplified Developer Experience**: Clear naming conventions make it easier to choose colors
4. **Future-proofing**: System can be extended for features like dark mode
5. **Accessible Design**: Consistent contrast ratios for better readability

## Best Practices

1. Always use CSS variables instead of hardcoded hex values
2. Prefer semantic color variables (e.g., `--primary-color`) over base color scales
3. Maintain visual hierarchy with appropriate color intensity
4. Use the accent color sparingly for maximum impact
5. Test color combinations for sufficient contrast for accessibility
