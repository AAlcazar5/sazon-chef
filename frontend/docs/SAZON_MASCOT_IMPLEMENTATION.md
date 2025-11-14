# Sazon Mascot - Implementation Guide

## Overview

Sazon is a friendly habanero pepper mascot designed to represent the Sazon Chef app. The mascot is built using React Native SVG components and supports multiple expressions, sizes, and animations.

## Design Specifications

### Character: Habanero Pepper
- **Type**: Mexican habanero pepper
- **Color**: Orange gradient (#F97316 to #EA580C) - matches brand colors
- **Shape**: Lantern-like, rounded, friendly
- **Accessories**: White chef's hat with optional orange band
- **Style**: Cute, approachable, expressive

### Expressions
1. **happy** (default) - Warm smile, friendly eyes
2. **excited** - Wide eyes, big smile, showing teeth
3. **curious** - Slightly tilted eyes, raised eyebrow
4. **proud** - Confident smile, one eye winking
5. **supportive** - Gentle, kind expression
6. **celebrating** - Joyful with confetti/sparkles

### Sizes
- **tiny**: 24px - For icons, badges
- **small**: 48px - For buttons, inline elements
- **medium**: 96px - For empty states, cards (default)
- **large**: 192px - For onboarding, celebrations
- **hero**: 256px - For splash screen, major features

## Components

### SazonMascot

Basic mascot component with static rendering.

```tsx
import { SazonMascot } from '@/components/mascot';

<SazonMascot 
  expression="happy"
  size="medium"
  variant="orange" // or "red"
/>
```

**Props:**
- `expression?: SazonExpression` - The facial expression (default: 'happy')
- `size?: SazonSize` - The size of the mascot (default: 'medium')
- `variant?: SazonVariant` - Color variant: 'orange' (default) or 'red' for habanero variants
- `style?: ViewStyle` - Additional styles

### AnimatedSazon

Animated version of the mascot with various animation types.

```tsx
import { AnimatedSazon } from '@/components/mascot';

<AnimatedSazon 
  expression="excited"
  size="large"
  variant="red" // Red habanero variant
  animationType="celebrate"
/>
```

**Props:**
- `expression?: SazonExpression` - The facial expression (default: 'happy')
- `size?: SazonSize` - The size of the mascot (default: 'medium')
- `variant?: SazonVariant` - Color variant: 'orange' (default) or 'red'
- `animationType?: 'idle' | 'bounce' | 'pulse' | 'wave' | 'celebrate' | 'none'` - Animation type (default: 'idle')
- `style?: ViewStyle` - Additional styles

## Animation Types

### idle
Gentle breathing animation - subtle scale up and down. Perfect for:
- Empty states
- Loading states
- Background presence

### bounce
Quick bounce animation on interaction. Perfect for:
- Button presses
- Tap interactions
- User feedback

### pulse
Continuous pulse animation. Perfect for:
- Drawing attention
- Important notifications
- Active states

### wave
Slight rotation wave. Perfect for:
- Greetings
- Welcoming users
- Friendly interactions

### celebrate
Bounce + rotate celebration. Perfect for:
- Achievements
- Goal completions
- Success states

### none
No animation - static display.

## Usage Examples

### Empty State
```tsx
import { AnimatedSazon } from '@/components/mascot';

<View style={styles.emptyState}>
  <AnimatedSazon 
    expression="supportive"
    size="large"
    animationType="idle"
  />
  <Text>No recipes found yet!</Text>
  <Text>Sazon is here to help you discover amazing recipes.</Text>
</View>
```

### Loading State
```tsx
import { AnimatedSazon } from '@/components/mascot';

<View style={styles.loading}>
  <AnimatedSazon 
    expression="curious"
    size="medium"
    animationType="pulse"
  />
  <Text>Finding the perfect recipe...</Text>
</View>
```

### Success/Goal Achievement
```tsx
import { AnimatedSazon } from '@/components/mascot';

<View style={styles.success}>
  <AnimatedSazon 
    expression="celebrating"
    size="large"
    animationType="celebrate"
  />
  <Text>Congratulations! You've reached your goal! 🎉</Text>
</View>
```

### Button/Interactive Element
```tsx
import { AnimatedSazon } from '@/components/mascot';
import { TouchableOpacity } from 'react-native';

<TouchableOpacity onPress={handlePress}>
  <AnimatedSazon 
    expression="excited"
    size="small"
    animationType="bounce"
  />
</TouchableOpacity>
```

### Onboarding
```tsx
import { AnimatedSazon } from '@/components/mascot';

<View style={styles.onboarding}>
  <AnimatedSazon 
    expression="happy"
    size="hero"
    animationType="wave"
  />
  <Text>Welcome to Sazon Chef!</Text>
  <Text>Let's cook up something amazing together.</Text>
</View>
```

### Error State
```tsx
import { AnimatedSazon } from '@/components/mascot';

<View style={styles.error}>
  <AnimatedSazon 
    expression="supportive"
    size="medium"
    animationType="idle"
  />
  <Text>Oops! Something went wrong.</Text>
  <Text>Don't worry, Sazon is here to help!</Text>
</View>
```

## Integration Points

### Recommended Usage Locations

1. **Empty States**
   - Recipe list empty
   - Shopping list empty
   - Meal plan empty
   - Cookbook empty

2. **Loading States**
   - Recipe search
   - Meal plan generation
   - Data fetching

3. **Onboarding**
   - Welcome screen
   - Feature introductions
   - Setup completion

4. **Achievements**
   - Goal completions
   - Milestone celebrations
   - Streak achievements

5. **Error States**
   - Network errors
   - Validation errors
   - General errors

6. **Success States**
   - Recipe saved
   - Meal plan created
   - Profile updated

7. **Interactive Elements**
   - Quick action button
   - Help button
   - Feature highlights

## Design Guidelines

### When to Use Sazon
- ✅ To add personality and warmth
- ✅ To guide users through empty states
- ✅ To celebrate achievements
- ✅ To provide friendly error messages
- ✅ To enhance onboarding experience

### When NOT to Use Sazon
- ❌ Don't overuse - let content be the focus
- ❌ Don't use in critical error states (use clear messaging instead)
- ❌ Don't use in data-heavy screens (distracting)
- ❌ Don't use multiple instances on the same screen

### Best Practices
1. **Match Expression to Context**
   - Happy for general use
   - Excited for positive actions
   - Supportive for errors/help
   - Celebrating for achievements

2. **Choose Appropriate Size**
   - Tiny/Small for UI elements
   - Medium for empty states
   - Large/Hero for major features

3. **Use Animations Sparingly**
   - Idle for background presence
   - Bounce for interactions
   - Celebrate for special moments

4. **Maintain Consistency**
   - Use same expression for similar contexts
   - Keep size proportional to importance
   - Don't mix too many animation types

## Technical Details

### Dependencies
- `react-native-svg` - For SVG rendering
- `react-native` - Core React Native components

### Performance Considerations
- SVG is vector-based, scales well
- Animations use `useNativeDriver: true` for performance
- Components are memoized where possible

### Accessibility
- Mascot is decorative, doesn't need alt text
- Ensure sufficient contrast with background
- Don't rely solely on mascot for information

## Future Enhancements

### Planned Features
- [ ] Seasonal variations (holiday themes)
- [ ] Props/accessories (apron, spoon, etc.)
- [ ] More expression variations
- [ ] Custom color themes
- [ ] Gesture-based animations
- [ ] Sound effects integration

### Potential Additions
- Different poses (cooking, pointing, etc.)
- Contextual accessories
- Theme-aware color variations
- Micro-interactions
- Story-based animations

## File Structure

```
frontend/components/mascot/
├── SazonMascot.tsx      # Base mascot component
├── AnimatedSazon.tsx    # Animated wrapper
└── index.ts             # Exports
```

## Notes

- The mascot is designed to be friendly and approachable
- Orange color matches brand identity (#F97316)
- Habanero shape is authentic to Mexican cuisine
- All expressions maintain a positive, helpful tone
- Animations are subtle and non-distracting

