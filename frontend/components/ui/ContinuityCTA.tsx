// frontend/components/ui/ContinuityCTA.tsx
// Reusable pastel pill button for cross-surface handoffs — shopping → cooking,
// cooking → pantry consume, meal plan → shopping list, pantry → recipes.
// Single primitive so all handoffs look and behave identically.

import { Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';

export type ContinuityTint = 'sage' | 'golden' | 'lavender' | 'peach' | 'sky' | 'blush';

interface ContinuityCTAProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tint?: ContinuityTint;
  accessibilityLabel?: string;
  testID?: string;
}

export default function ContinuityCTA({
  label,
  icon,
  onPress,
  tint = 'peach',
  accessibilityLabel,
  testID,
}: ContinuityCTAProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const bg = isDark ? PastelDark[tint] : Pastel[tint];
  const accent = Accent[tint];

  return (
    <HapticTouchableOpacity
      onPress={onPress}
      hapticStyle="light"
      pressedScale={0.97}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={[styles.container, { backgroundColor: bg }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accent }]}>
        <Ionicons name={icon} size={16} color="#FFFFFF" />
      </View>
      <Text
        style={[styles.label, { color: isDark ? '#F5F5F5' : '#1F2937' }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={isDark ? '#9CA3AF' : '#6B7280'}
      />
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 100,
    gap: 12,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
