# Social Sharing Previews with Sazon Mascot

## Overview

This document explains how the Sazon mascot is integrated into social sharing previews for recipes shared from the app.

## Current Implementation

### In-App Sharing

When users share a recipe from the app, the share message includes:
- 🌶️ Sazon Chef branding (chili pepper emoji representing the mascot)
- Recipe details (title, description, nutrition info)
- Branded call-to-action: "🌶️ Discover more amazing recipes with Sazon Chef!"

**Location**: `frontend/app/modal.tsx` - `handleShareRecipe()` function

### Share Content Structure

```typescript
{
  title: `Check out this recipe: ${recipe.title}`,
  message: `🌶️ Sazon Chef Recipe: ${recipe.title}\n\n...`,
  url: `https://sazonchef.app/recipe/${recipe.id}`
}
```

## Web-Based Social Previews (Future Implementation)

When the recipe URL is shared on social platforms (Facebook, Twitter, LinkedIn, etc.), they will fetch Open Graph meta tags from the web page. To include the mascot in these previews:

### Open Graph Meta Tags

Add these meta tags to the recipe web page (`https://sazonchef.app/recipe/{id}`):

```html
<!-- Open Graph / Facebook -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://sazonchef.app/recipe/{id}" />
<meta property="og:title" content="{recipe.title} - Sazon Chef" />
<meta property="og:description" content="{recipe.description}" />
<meta property="og:image" content="https://sazonchef.app/api/recipe/{id}/share-image" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://sazonchef.app/recipe/{id}" />
<meta name="twitter:title" content="{recipe.title} - Sazon Chef" />
<meta name="twitter:description" content="{recipe.description}" />
<meta name="twitter:image" content="https://sazonchef.app/api/recipe/{id}/share-image" />
```

### Share Image Generation

Create an API endpoint that generates share images with the mascot:

**Endpoint**: `GET /api/recipe/:id/share-image`

**Response**: PNG image (1200x630px recommended for Open Graph)

**Image Content**:
- Recipe title
- Recipe image (if available)
- Sazon mascot (small size, positioned in corner or as watermark)
- Brand colors (orange/red)
- "Sazon Chef" branding

**Implementation Options**:
1. **Server-side image generation** (Node.js with Canvas/SVG):
   - Use `canvas` or `sharp` library
   - Render recipe details + mascot SVG
   - Return as PNG

2. **Pre-generated images**:
   - Generate share images when recipes are created/updated
   - Store in cloud storage (S3, Cloudinary, etc.)
   - Serve via CDN

3. **Template-based**:
   - Create HTML template with recipe details + mascot
   - Use headless browser (Puppeteer) to render and screenshot
   - Cache generated images

### Example Share Image Layout

```
┌─────────────────────────────────────┐
│  [Recipe Image]     [Sazon Mascot]  │
│                                      │
│  Recipe Title                        │
│  Cook Time • Calories • Protein      │
│                                      │
│  🌶️ Sazon Chef                      │
└─────────────────────────────────────┘
```

## Platform-Specific Considerations

### Facebook
- Image size: 1200x630px (1.91:1 ratio)
- Max file size: 8MB
- Formats: JPG, PNG, GIF, WebP

### Twitter
- Image size: 1200x675px (16:9 ratio) for large cards
- Max file size: 5MB
- Formats: JPG, PNG, GIF, WebP

### LinkedIn
- Image size: 1200x627px
- Max file size: 5MB
- Formats: JPG, PNG

### WhatsApp
- Uses Open Graph tags
- Image size: 300x200px minimum
- Formats: JPG, PNG

## Implementation Priority

1. ✅ **Completed**: In-app sharing with mascot branding (chili emoji)
2. 🔄 **Future**: Web page with Open Graph meta tags
3. 🔄 **Future**: Share image generation API endpoint
4. 🔄 **Future**: Mascot in share images

## Testing

### Test Social Sharing Previews

1. **Facebook Debugger**: https://developers.facebook.com/tools/debug/
2. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
3. **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/
4. **Open Graph Preview**: https://www.opengraph.xyz/

### Test In-App Sharing

1. Open a recipe in the app
2. Tap "Share Recipe"
3. Verify share message includes:
   - 🌶️ emoji
   - "Sazon Chef" branding
   - Recipe details
   - Call-to-action

## Notes

- The chili pepper emoji (🌶️) represents the Sazon mascot in text-based shares
- For visual shares (web previews), the actual mascot SVG/image should be included
- Consider creating a simplified mascot variant optimized for small sizes in share images
- Ensure share images are accessible and meet platform requirements

