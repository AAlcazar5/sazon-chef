// frontend/components/ui/GradientButton.tsx
// Reusable gradient pill button — matches the "Start Cooking" button style in modal.tsx.
// Use GradientButton.presets to pick a named color pair from the app palette.

import { Text, StyleSheet, ViewStyle } from 'react-native';
import AnimatedActivityIndicator from './AnimatedActivityIndicator';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from './HapticTouchableOpacity';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Named gradient presets drawn from the app's Gradients palette */
export const GradientPresets = {
  /** Brand CTA — orange → amber/yellow (Sign In, Save to Cookbook) */
  brand:   ['#fa7e12', '#f59e0b'] as [string, string],
  /** Cooking / action — orange → habanero red (Start Cooking, Surprise Me) */
  fire:    ['#FB923C', '#EF4444'] as [string, string],
  /** New account / success — emerald → cyan (Create Account, Add to Meal Plan) */
  fresh:   ['#10B981', '#06B6D4'] as [string, string],
  /** Premium / upgrade — purple → indigo (Meal Prep, Paywall CTA) */
  premium: ['#A855F7', '#6366F1'] as [string, string],
  /** Destructive — orange-red → deep red (Delete, Not Interested) */
  danger:  ['#F97316', '#DC2626'] as [string, string],
  /** Info / utility — sky blue → indigo (Add to Shopping List, Share) */
  info:    ['#38BDF8', '#6366F1'] as [string, string],
};

interface GradientButtonProps {
  /** Button label */
  label: string;
  onPress: () => void;
  /** Ionicons icon name shown left of label */
  icon?: IoniconName;
  /** Disabled — shows 60% opacity, blocks press */
  disabled?: boolean;
  /** Loading — replaces label with ActivityIndicator */
  loading?: boolean;
  /** Custom gradient colors. Defaults to brand orange→red */
  colors?: [string, string, ...string[]];
  /** Extra style applied to the outer touchable */
  style?: ViewStyle;
  /** Haptic intensity (defaults to medium) */
  hapticStyle?: 'light' | 'medium' | 'heavy';
  testID?: string;
}

export default function GradientButton({
  label,
  onPress,
  icon,
  disabled = false,
  loading = false,
  colors = GradientPresets.brand,
  style,
  hapticStyle = 'medium',
  testID,
}: GradientButtonProps) {
  return (
    <HapticTouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      hapticStyle={hapticStyle}
      style={[styles.touchable, (disabled || loading) && styles.disabled, style]}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <AnimatedActivityIndicator color="#FFF" />
        ) : (
          <>
            {icon && (
              <Ionicons
                name={icon}
                size={20}
                color="white"
                style={styles.icon}
              />
            )}
            <Text style={styles.label}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 100,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.55,
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.2,
  },
});
