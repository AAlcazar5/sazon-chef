# Sazon Chef - Component Library

This document provides an overview of the UI component library, design system constants, and usage patterns.

## Design System Constants

All design system constants are exported from `constants/index.ts`:

```typescript
import {
  Colors, DarkColors,           // Color palettes
  Spacing, BorderRadius,        // Layout constants
  FontSize, FontWeight,         // Typography
  Duration, Spring,             // Animation timing
  HapticPatterns,               // Haptic feedback
  // ... etc
} from '../constants';
```

### Colors (`constants/Colors.ts`)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `text.primary` | gray-900 | gray-50 | Body text, headings |
| `text.secondary` | gray-500 | gray-300 | Labels, descriptions |
| `text.tertiary` | gray-400 | gray-400 | Hints, placeholders only |
| `background` | white | gray-900 | Screen backgrounds |
| `surface` | gray-50 | gray-800 | Cards, modals |
| `primary` | #fa7e12 | #fa7e12 | Brand orange, CTAs |
| `error` | red-500 | red-500 | Error states |
| `success` | emerald-500 | emerald-500 | Success states |

**Theme Usage:**
- Use `className="... dark:..."` for NativeWind styling
- Use `useTheme()` for JS style objects
- See Colors.ts header for full documentation

### Spacing (`constants/Spacing.ts`)

| Token | Value | Usage |
|-------|-------|-------|
| `Spacing.xs` | 4 | Tight gaps, icon margins |
| `Spacing.sm` | 8 | Small padding, list gaps |
| `Spacing.md` | 12 | Component padding |
| `Spacing.lg` | 16 | Section spacing |
| `Spacing.xl` | 24 | Large gaps |
| `Spacing.2xl` | 32 | Major section spacing |

### Typography (`constants/Typography.ts`)

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `FontSize.xs` | 11 | - | Captions, badges |
| `FontSize.sm` | 13 | - | Helper text, labels |
| `FontSize.md` | 15 | - | Body text |
| `FontSize.lg` | 17 | - | Emphasized text |
| `FontSize.xl` | 20 | - | Section headers |
| `FontSize.2xl` | 24 | - | Page titles |

### Animation (`constants/Animations.ts`)

| Token | Value | Usage |
|-------|-------|-------|
| `Duration.instant` | 100ms | Micro-interactions |
| `Duration.fast` | 150ms | Quick feedback |
| `Duration.normal` | 200ms | Standard transitions |
| `Duration.medium` | 300ms | Modal transitions |
| `Spring.gentle` | Low tension | Exit animations |
| `Spring.bouncy` | High tension | Entrance animations |
| `Spring.stiff` | Very stiff | Button presses |

---

## Core Components

### Button

Standard button with multiple variants and haptic feedback.

```tsx
import Button from '../components/ui/Button';

<Button
  title="Save Recipe"
  onPress={handleSave}
  variant="primary"      // primary | secondary | outline | danger | accent | rainbow
  size="md"              // sm | md | lg
  loading={isLoading}
  disabled={!isValid}
  fullWidth
  icon={<Icon name="checkmark" />}
  iconPosition="left"    // left | right
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | required | Button label |
| `onPress` | () => void | required | Press handler |
| `variant` | string | 'primary' | Visual style |
| `size` | string | 'md' | Button size |
| `loading` | boolean | false | Show loading spinner |
| `disabled` | boolean | false | Disable interaction |
| `fullWidth` | boolean | false | Stretch to container |

### HapticTouchableOpacity

TouchableOpacity with automatic haptic feedback and scale animation.

```tsx
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';

<HapticTouchableOpacity
  onPress={handlePress}
  hapticStyle="medium"     // light | medium | heavy
  scaleOnPress={true}      // Enable scale animation
  pressedScale={0.97}      // Scale factor when pressed
>
  <Text>Press me</Text>
</HapticTouchableOpacity>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `hapticStyle` | string | 'light' | Haptic intensity |
| `hapticDisabled` | boolean | false | Disable haptics |
| `scaleOnPress` | boolean | true | Enable scale animation |
| `pressedScale` | number | 0.97 | Scale factor on press |

### FormInput

Standardized text input with validation states and animations.

```tsx
import FormInput from '../components/ui/FormInput';

<FormInput
  label="Email"
  placeholder="you@example.com"
  value={email}
  onChangeText={setEmail}
  error={emailError}
  hint="We'll never share your email"
  required
  leftIcon="mail-outline"
  rightIcon={showPassword ? "eye-off" : "eye"}
  onRightIconPress={togglePassword}
  secureTextEntry={!showPassword}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | string | - | Input label |
| `hint` | string | - | Helper text |
| `error` | string | - | Error message (shows error state) |
| `required` | boolean | false | Show required indicator |
| `leftIcon` | string | - | Ionicon name for left icon |
| `rightIcon` | string | - | Ionicon name for right icon |
| `showCharCount` | boolean | false | Show character counter |
| `maxCharCount` | number | - | Max characters for counter |

### ActionSheet

Bottom action sheet with slide animation.

```tsx
import ActionSheet from '../components/ui/ActionSheet';

<ActionSheet
  visible={showActions}
  onClose={() => setShowActions(false)}
  title="Recipe Actions"
  items={[
    { label: 'Edit', icon: 'pencil', onPress: handleEdit },
    { label: 'Share', icon: 'share-outline', onPress: handleShare },
    { label: 'Delete', icon: 'trash', onPress: handleDelete, destructive: true },
  ]}
/>
```

### AnimatedEmptyState

Empty state with mascot and optional action button.

```tsx
import AnimatedEmptyState from '../components/ui/AnimatedEmptyState';
import { CookbookEmptyStates } from '../constants/EmptyStates';

// Using predefined config
<AnimatedEmptyState config={CookbookEmptyStates.noSavedRecipes} />

// Or custom props
<AnimatedEmptyState
  title="No recipes found"
  message="Try adjusting your search"
  expression="confused"
  actionLabel="Clear filters"
  onAction={clearFilters}
/>
```

### LoadingState

Loading indicator with mascot and message.

```tsx
import LoadingState from '../components/ui/LoadingState';
import { LoadingStates } from '../constants/LoadingStates';

// Using predefined config
<LoadingState config={LoadingStates.home.aiRecipe} />

// Or custom props
<LoadingState
  message="Finding recipes..."
  expression="thinking"
  size="medium"
/>
```

### Toast

Toast notification for feedback messages.

```tsx
import Toast from '../components/ui/Toast';

<Toast
  visible={showToast}
  message="Recipe saved!"
  type="success"        // success | error | warning | info
  onDismiss={() => setShowToast(false)}
/>
```

### SuccessModal

Full-screen success state with mascot.

```tsx
import SuccessModal from '../components/ui/SuccessModal';

<SuccessModal
  visible={showSuccess}
  title="Recipe Created!"
  message="Your recipe has been saved"
  expression="chef-kiss"
  onDismiss={() => setShowSuccess(false)}
  actionLabel="View Recipe"
  onAction={() => navigateToRecipe()}
/>
```

---

## Animation Hooks

### useScrollAnimation

Hook for scroll-based animations.

```tsx
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const {
  scrollY,
  onScroll,
  parallaxStyle,
  getStaggeredItemStyle
} = useScrollAnimation({ enableParallax: true });

<ScrollView onScroll={onScroll} scrollEventThrottle={16}>
  {/* Parallax header */}
  <Animated.Image source={headerImage} style={[styles.header, parallaxStyle]} />

  {/* Staggered list items */}
  {items.map((item, index) => (
    <Animated.View key={item.id} style={getStaggeredItemStyle(index)}>
      <ListItem {...item} />
    </Animated.View>
  ))}
</ScrollView>
```

### useEntranceAnimation

Hook for mount animations.

```tsx
import { useEntranceAnimation } from '../hooks/useScrollAnimation';

const { style, triggerAnimation } = useEntranceAnimation(100); // 100ms delay

useEffect(() => {
  triggerAnimation();
}, []);

<Animated.View style={style}>
  <Card />
</Animated.View>
```

### useSuccessAnimation

Hook for success/completion animations.

```tsx
import { useSuccessAnimation } from '../hooks/useScrollAnimation';

const { animatedStyle, checkmarkStyle, triggerSuccess } = useSuccessAnimation();

const handleComplete = async () => {
  await saveData();
  triggerSuccess(() => {
    // Called after animation completes
    navigateBack();
  });
};
```

### useHapticFeedback

Hook for standardized haptic feedback.

```tsx
import { useHapticFeedback } from '../hooks/useHapticFeedback';

const haptics = useHapticFeedback();

// Various trigger methods
haptics.triggerPress();           // Light tap
haptics.triggerPressPrimary();    // Medium impact
haptics.triggerSuccess();         // Success notification
haptics.triggerError();           // Error notification
haptics.triggerDelete();          // Destructive action
```

---

## Accessibility

### Accessibility Helpers (`utils/accessibility.ts`)

```tsx
import {
  buttonAccessibility,
  inputAccessibility,
  recipeCardAccessibility,
  alertAccessibility,
} from '../utils/accessibility';

// For buttons
<TouchableOpacity {...buttonAccessibility('Save Recipe', { hint: 'Double tap to save' })} />

// For inputs
<TextInput {...inputAccessibility('Email', { error: emailError, required: true })} />

// For alerts
<View {...alertAccessibility('Success', 'Recipe saved successfully')} />
```

---

## Naming Conventions

| Pattern | Example | Usage |
|---------|---------|-------|
| `use[Feature]` | `useScrollAnimation` | Hooks |
| `[Feature]Context` | `ThemeContext` | React contexts |
| `[Component]Props` | `ButtonProps` | Prop interfaces |
| `[Feature]EmptyStates` | `CookbookEmptyStates` | Empty state configs |
| `handle[Action]` | `handleSubmit` | Event handlers |
| `is[State]` | `isLoading` | Boolean states |
| `[feature]Api` | `recipeApi` | API clients |

---

## File Organization

```
frontend/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigator screens
│   └── [feature].tsx      # Modal/detail screens
├── components/
│   ├── ui/                # Reusable UI components
│   ├── recipe/            # Recipe-specific components
│   ├── mascot/            # Sazon mascot components
│   └── [feature]/         # Feature-specific components
├── constants/
│   ├── Colors.ts          # Color palettes
│   ├── Spacing.ts         # Layout constants
│   ├── Typography.ts      # Font sizes/weights
│   ├── Animations.ts      # Duration/spring configs
│   ├── Haptics.ts         # Haptic patterns
│   ├── EmptyStates.ts     # Empty state configs
│   ├── LoadingStates.ts   # Loading configs
│   └── index.ts           # Central exports
├── hooks/
│   ├── useScrollAnimation.ts
│   └── useHapticFeedback.ts
├── utils/
│   ├── accessibility.ts   # A11y helpers
│   ├── colorContrast.ts   # WCAG utilities
│   └── styles.ts          # Style helpers
├── contexts/
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── lib/
│   └── api.ts             # API client
└── types/
    └── index.ts           # TypeScript types
```
