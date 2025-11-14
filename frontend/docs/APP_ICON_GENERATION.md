# App Icon Generation with Sazon Mascot

## Overview

This document explains how to generate app icons featuring the Sazon mascot for iOS, Android, and Web platforms.

## Component

The `AppIconMascot` component (`frontend/components/mascot/AppIconMascot.tsx`) is designed to render the mascot at app icon sizes.

## Required Icon Sizes

### iOS
- **icon.png**: 1024x1024 pixels (single size, iOS scales automatically)

### Android
- **android-icon-foreground.png**: 1024x1024 pixels (foreground layer)
- **android-icon-background.png**: 1024x1024 pixels (background layer - solid color)
- **android-icon-monochrome.png**: 1024x1024 pixels (monochrome version for themed icons)

### Web
- **favicon.png**: 512x512 pixels (or 32x32, 64x64, 128x128, 256x256 for multiple sizes)

### Splash Screen
- **splash-icon.png**: 200x200 pixels (already exists)

## Generation Methods

### Method 1: Using React Native View Shot

1. Create a temporary screen that renders `AppIconMascot`:

```tsx
import AppIconMascot from '../components/mascot/AppIconMascot';
import { captureRef } from 'react-native-view-shot';

export default function IconGeneratorScreen() {
  const viewRef = useRef<View>(null);

  const generateIcon = async () => {
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1.0,
      result: 'tmpfile',
    });
    // Save or copy the generated image
  };

  return (
    <View ref={viewRef}>
      <AppIconMascot size={1024} expression="happy" variant="orange" />
    </View>
  );
}
```

2. Run the app and navigate to this screen
3. Capture the view and save as PNG
4. Resize to required sizes using image editing software

### Method 2: Using Design Tools

1. Export the mascot SVG from `SazonMascot.tsx`
2. Import into Figma/Sketch/Adobe Illustrator
3. Create icon designs:
   - Place mascot on colored background (orange brand color or white)
   - Add rounded corners (20% border radius)
   - Ensure mascot is centered with 10% padding on all sides
4. Export at required sizes

### Method 3: Using Command Line Tools

1. Use `react-native-view-shot` CLI or similar tools
2. Render component programmatically
3. Export as PNG at required sizes

## Recommended Settings

- **Expression**: `happy` or `excited` (friendly, welcoming)
- **Variant**: `orange` (brand color)
- **Background**: 
  - iOS/Web: White (#FFFFFF) or brand orange (#F97316)
  - Android foreground: Transparent or white
  - Android background: Brand orange (#F97316) or gradient
- **Size**: Mascot should be ~80% of icon size (leaves 10% padding on each side)
- **Border Radius**: 20% of icon size for modern rounded icons

## File Locations

All icon files should be placed in:
```
frontend/assets/images/
```

Current files:
- `icon.png` - iOS app icon
- `android-icon-foreground.png` - Android foreground
- `android-icon-background.png` - Android background
- `android-icon-monochrome.png` - Android monochrome
- `favicon.png` - Web favicon
- `splash-icon.png` - Splash screen icon

## Configuration

Icons are configured in `frontend/app.json`:

```json
{
  "expo": {
    "icon": "./assets/images/icon.png",
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      }
    },
    "web": {
      "favicon": "./assets/images/favicon.png"
    }
  }
}
```

## Next Steps

1. Generate icon images using one of the methods above
2. Replace existing icon files in `frontend/assets/images/`
3. Test icons on iOS, Android, and Web
4. Verify icons look good at various sizes and on different devices

