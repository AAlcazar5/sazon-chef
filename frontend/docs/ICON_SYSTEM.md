# Icon System Documentation

## Overview

The Sazon Chef app uses a centralized icon system built on top of Ionicons (via `@expo/vector-icons`) to ensure consistent iconography across the entire application.

## Components

### Icon Component

The `Icon` component (`frontend/components/ui/Icon.tsx`) provides a standardized way to render icons throughout the app.

**Features:**
- Consistent sizing (xs, sm, md, lg, xl)
- Automatic theme color support
- Built-in accessibility labels
- Type-safe icon names

**Usage:**

```tsx
import Icon from '../components/ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';

// Basic usage
<Icon name={Icons.HOME} size={IconSizes.MD} />

// With custom color
<Icon name={Icons.HEART} size={IconSizes.LG} color="#FF0000" />

// With accessibility
<Icon 
  name={Icons.SEARCH} 
  size={IconSizes.MD}
  accessibilityLabel="Search recipes"
  accessibilityHint="Tap to search for recipes"
/>
```

### Icon Constants

The `Icons` constant object (`frontend/constants/Icons.ts`) provides type-safe icon names for consistent usage.

**Available Icon Categories:**

- **Navigation**: `HOME`, `COOKBOOK`, `MEAL_PLAN`, `SHOPPING_LIST`, `PROFILE`
- **Actions**: `ADD`, `CLOSE`, `CHECKMARK`, `DELETE`, `EDIT`, `SAVE`, `SHARE`
- **Recipe Feedback**: `LIKE`, `DISLIKE`, `FAVORITE`, `BOOKMARK`, `STAR`
- **Status**: `SUCCESS`, `ERROR`, `INFO`, `WARNING`, `REFRESH`
- **Media**: `CAMERA`, `IMAGE`, `BARCODE`, `SCAN`
- **Settings**: `SETTINGS`, `OPTIONS`, `FILTER`, `SEARCH`, `NOTIFICATIONS`
- **Food & Recipe**: `RESTAURANT`, `NUTRITION`, `FLAME`, `TIME`, `TIMER`
- **Shopping**: `CART`, `STORE`, `LOCATION`, `MAP`
- **Navigation & UI**: `MENU`, `MORE`, `CHEVRON_BACK`, `CHEVRON_FORWARD`, etc.

**Icon Sizes:**

```tsx
IconSizes.XS  // 12px - Very small, inline text
IconSizes.SM  // 16px - Small buttons, list items
IconSizes.MD  // 20px - Default size, buttons
IconSizes.LG  // 24px - Large buttons, headers
IconSizes.XL  // 32px - Extra large, feature icons
```

## Migration Guide

### Before (Direct Ionicons Usage)

```tsx
import { Ionicons } from '@expo/vector-icons';

<Ionicons name="heart" size={24} color="#FF0000" />
```

### After (Using Icon Component)

```tsx
import Icon from '../components/ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';

<Icon name={Icons.FAVORITE} size={IconSizes.LG} color="#FF0000" />
```

## Best Practices

### 1. Use Icon Constants

✅ **Good:**
```tsx
<Icon name={Icons.HOME} size={IconSizes.MD} />
```

❌ **Bad:**
```tsx
<Icon name="home" size={20} />
```

### 2. Use Standard Sizes

✅ **Good:**
```tsx
<Icon name={Icons.SEARCH} size={IconSizes.MD} />
```

❌ **Bad:**
```tsx
<Icon name={Icons.SEARCH} size={19} />
```

### 3. Always Include Accessibility Labels

✅ **Good:**
```tsx
<Icon 
  name={Icons.DELETE} 
  size={IconSizes.MD}
  accessibilityLabel="Delete recipe"
/>
```

❌ **Bad:**
```tsx
<Icon name={Icons.DELETE} size={IconSizes.MD} />
```

### 4. Use Theme Colors When Possible

✅ **Good:**
```tsx
// Uses theme color automatically
<Icon name={Icons.HOME} size={IconSizes.MD} />
```

✅ **Also Good (for specific use cases):**
```tsx
// Custom color for specific UI needs
<Icon name={Icons.ERROR} size={IconSizes.MD} color="#EF4444" />
```

## Icon States

Icons support both filled and outline variants:

```tsx
// Outline (default for inactive states)
<Icon name={Icons.HEART_OUTLINE} size={IconSizes.MD} />

// Filled (for active states)
<Icon name={Icons.HEART} size={IconSizes.MD} color="#EF4444" />
```

## Adding New Icons

1. **Add to IconName type** in `frontend/components/ui/Icon.tsx`:
```tsx
export type IconName = 
  | 'existing-icons'
  | 'new-icon' | 'new-icon-outline';
```

2. **Add to iconMap** in `mapIconName()` function:
```tsx
const iconMap: Record<IconName, string> = {
  // ... existing icons
  'new-icon': 'new-icon',
  'new-icon-outline': 'new-icon-outline',
};
```

3. **Add constant** in `frontend/constants/Icons.ts`:
```tsx
export const Icons = {
  // ... existing icons
  NEW_ICON: 'new-icon' as IconName,
  NEW_ICON_OUTLINE: 'new-icon-outline' as IconName,
} as const;
```

## Tab Bar Icons

For tab bar icons in `app/(tabs)/_layout.tsx`, you can continue using Ionicons directly as they're part of the navigation system. However, consider migrating to the Icon component for consistency in the future.

## Future Enhancements

- [ ] Add Heroicons support as an alternative icon set
- [ ] Add icon animation support
- [ ] Add custom app-specific icons
- [ ] Create icon showcase/documentation page
- [ ] Add icon size presets for specific use cases (buttons, headers, etc.)

## Accessibility

All icons should include:
- `accessibilityLabel`: Descriptive label for screen readers
- `accessibilityHint`: Optional hint for context
- `testID`: For testing purposes

Example:
```tsx
<Icon 
  name={Icons.SAVE}
  size={IconSizes.MD}
  accessibilityLabel="Save recipe"
  accessibilityHint="Saves this recipe to your cookbook"
  testID="save-recipe-icon"
/>
```

