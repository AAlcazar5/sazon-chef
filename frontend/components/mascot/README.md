# Sazon Mascot Components

This directory contains the Sazon mascot implementation - a friendly habanero pepper chef character.

## Files

- **SazonMascot.tsx** - Base mascot component with static rendering
- **AnimatedSazon.tsx** - Animated wrapper with various animation types
- **index.ts** - Component exports
- **sazon-happy.svg** - Reference SVG for happy expression
- **sazon-excited.svg** - Reference SVG for excited expression
- **README.md** - This file

## Quick Start

```tsx
import { SazonMascot, AnimatedSazon } from '@/components/mascot';

// Static mascot (orange - default)
<SazonMascot expression="happy" size="medium" />

// Red variant
<SazonMascot expression="happy" size="medium" variant="red" />

// Animated mascot
<AnimatedSazon 
  expression="excited" 
  size="large"
  variant="red"
  animationType="celebrate" 
/>
```

## Design Specifications

- **Character**: Mexican habanero pepper
- **Color Variants**: 
  - Orange gradient (#F97316 to #EA580C) - default, matches brand
  - Red gradient (#EF4444 to #DC2626) - secondary accent
- **Base Size**: 192x192 viewBox
- **Expressions**: happy, excited, curious, proud, supportive, celebrating
- **Sizes**: tiny (24px), small (48px), medium (96px), large (192px), hero (256px)

## Reference SVGs

The standalone SVG files (`.svg`) are provided for:
- Design reference
- Export to design tools
- Web usage (if needed)
- Documentation purposes

The React Native components use `react-native-svg` for rendering.

## See Also

- [Implementation Guide](../../docs/SAZON_MASCOT_IMPLEMENTATION.md)
- [Design Brainstorm](../../docs/SAZON_MASCOT_BRAINSTORM.md)

