# Sazon Mascot - Design Specifications

## Character Overview

**Sazon** is a friendly habanero pepper chef mascot designed to represent the Sazon Chef app. The character is based on a Mexican habanero pepper, chosen for its perfect color match with the brand (#F97316) and authentic connection to Mexican cuisine.

## Visual Design

### Base Character
- **Type**: Habanero pepper (Mexican)
- **Shape**: Lantern-like, rounded, friendly
- **Color Variants**: 
  - **Orange**: Gradient (#F97316 → #FB923C → #EA580C) - default, matches brand
  - **Red**: Gradient (#EF4444 → #F87171 → #DC2626) - secondary accent, habanero variant
- **Size**: 192x192 base viewBox (scales to various sizes)

### Accessories
- **Chef Hat**: White, classic style, slightly oversized
- **Hat Band**: Optional orange accent (#F97316, 30% opacity)
- **Stem**: Small green calyx at top (optional, 60% opacity)

### Design Principles
- **Friendly**: Large eyes, warm smile, rosy cheeks
- **Approachable**: Rounded shapes, soft edges
- **Expressive**: Clear facial expressions
- **Scalable**: Works from 24px to 256px+

## Expressions

### 1. Happy (Default)
- **Eyes**: Large, round, friendly
- **Mouth**: Warm, curved smile
- **Cheeks**: Rosy pink highlights
- **Use**: General presence, default state

### 2. Excited
- **Eyes**: Wide open, oval-shaped
- **Mouth**: Big smile showing teeth
- **Energy**: High energy, enthusiastic
- **Use**: Positive actions, discoveries, achievements

### 3. Curious
- **Eyes**: Slightly tilted, attentive
- **Mouth**: Small, gentle smile
- **Eyebrow**: One raised eyebrow
- **Use**: Exploring, learning, questions

### 4. Proud
- **Eyes**: Confident, one eye winking
- **Mouth**: Confident smile
- **Energy**: Self-assured, accomplished
- **Use**: Goal completions, milestones

### 5. Supportive
- **Eyes**: Gentle, kind
- **Mouth**: Warm, reassuring smile
- **Expression Lines**: Subtle, caring
- **Use**: Errors, help states, guidance

### 6. Celebrating
- **Eyes**: Joyful, wide
- **Mouth**: Big celebratory smile
- **Confetti**: Small colored dots around
- **Use**: Major achievements, celebrations

## Size Variations

| Size | Dimensions | Use Case |
|------|-----------|----------|
| **Tiny** | 24px | Icons, badges, inline elements |
| **Small** | 48px | Buttons, compact UI elements |
| **Medium** | 96px | Empty states, cards (default) |
| **Large** | 192px | Onboarding, celebrations |
| **Hero** | 256px | Splash screen, major features |

## Color Palette

### Primary Colors
- **Orange Light**: #F97316 (primary brand color)
- **Orange Mid**: #FB923C (gradient middle)
- **Orange Dark**: #EA580C (gradient end)

### Secondary Accent Colors (Red)
- **Red Light**: #EF4444 (red-500, accent secondary)
- **Red Mid**: #F87171 (red-400, gradient middle)
- **Red Dark**: #DC2626 (red-600, gradient end)

### Accent Colors
- **White**: #FFFFFF (chef hat)
- **Green**: #22C55E (stem/calyx)
- **Dark Gray**: #1F2937 (eyes, mouth)
- **Pink**: #FB7185 (rosy cheeks)

### Gradients
- **Habanero Body (Orange)**: Linear gradient (top to bottom)
  - Start: #F97316
  - Mid: #FB923C
  - End: #EA580C
- **Habanero Body (Red)**: Linear gradient (top to bottom)
  - Start: #EF4444
  - Mid: #F87171
  - End: #DC2626
- **Highlight**: Radial gradient (top-left to bottom-right)
  - Start: #FFFFFF 30% opacity
  - End: Transparent

## Animation Types

### Idle
- **Type**: Gentle breathing
- **Motion**: Subtle scale (1.0 → 1.05 → 1.0)
- **Duration**: 2s per cycle
- **Use**: Background presence, empty states

### Bounce
- **Type**: Quick bounce
- **Motion**: Scale up (1.2x) then back with spring
- **Duration**: ~450ms total
- **Use**: Button presses, interactions

### Pulse
- **Type**: Continuous pulse
- **Motion**: Scale (1.0 → 1.1 → 1.0)
- **Duration**: 800ms per cycle
- **Use**: Drawing attention, notifications

### Wave
- **Type**: Slight rotation
- **Motion**: Rotate (-10° → 10° → 0°)
- **Duration**: 1.5s per cycle
- **Use**: Greetings, welcoming

### Celebrate
- **Type**: Bounce + rotate
- **Motion**: 
  - Vertical bounce (-20px → 0 → -15px → 0)
  - Rotation (-10° → 10° → 0°)
- **Duration**: ~700ms
- **Use**: Achievements, goal completions

## Technical Specifications

### SVG Structure
- **ViewBox**: 0 0 192 192
- **Coordinate System**: Centered at (96, 96)
- **Layers** (bottom to top):
  1. Chef Hat
  2. Habanero Body
  3. Face (expression)
  4. Stem (optional)

### Component Architecture
```
SazonMascot (base component)
  ├── Static rendering
  ├── Expression prop
  └── Size prop

AnimatedSazon (wrapper)
  ├── Wraps SazonMascot
  ├── Animation type prop
  └── Uses React Native Animated API
```

### Performance
- **Native Driver**: All animations use `useNativeDriver: true`
- **Vector Graphics**: SVG scales without quality loss
- **Memoization**: Components optimized for re-renders

## Usage Guidelines

### When to Use
✅ Empty states (no recipes, empty lists)
✅ Loading states (searching, generating)
✅ Onboarding (welcome, introductions)
✅ Achievements (goals, milestones)
✅ Error states (friendly error messages)
✅ Success states (saved, completed)
✅ Interactive elements (help, features)

### When NOT to Use
❌ Data-heavy screens (distracting)
❌ Multiple instances on same screen
❌ Critical error states (use clear messaging)
❌ Overuse (let content be focus)

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
   - Same expression for similar contexts
   - Size proportional to importance
   - Don't mix too many animation types

## File Structure

```
frontend/components/mascot/
├── SazonMascot.tsx          # Base component
├── AnimatedSazon.tsx         # Animated wrapper
├── index.ts                  # Exports
├── README.md                 # Quick reference
├── sazon-happy.svg          # Reference SVG
└── sazon-excited.svg        # Reference SVG

frontend/docs/
├── SAZON_MASCOT_BRAINSTORM.md      # Design exploration
├── SAZON_MASCOT_IMPLEMENTATION.md  # Usage guide
└── SAZON_MASCOT_DESIGN.md          # This file
```

## Future Enhancements

### Planned
- [ ] Seasonal variations (holiday themes)
- [ ] Props/accessories (apron, spoon, etc.)
- [ ] More expression variations
- [ ] Custom color themes
- [ ] Gesture-based animations

### Potential
- Different poses (cooking, pointing, etc.)
- Contextual accessories
- Theme-aware color variations
- Micro-interactions
- Story-based animations

## Design Notes

- The habanero shape is authentic to Mexican cuisine
- Orange color perfectly matches brand identity
- Friendly design overcomes "hot pepper" reputation
- All expressions maintain positive, helpful tone
- Scalable from tiny icons to hero sizes
- Works in both light and dark themes

